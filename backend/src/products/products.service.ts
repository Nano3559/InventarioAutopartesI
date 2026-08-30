import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Product } from '../entities/product.entity';
import { Inventory } from '../entities/inventory.entity';
import { Location } from '../entities/location.entity';
import { computeHash, hammingDistance } from '../common/image-hash';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export interface ProductFilters {
  search?: string;
  marca?: string;
  fabricante?: string;
  producto?: string;
  modelo?: string;
  anio?: string;
  codigoOem?: string;
  codigoFabrica?: string;
  locationId?: number;
}

@Injectable()
export class ProductsService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  private repo() {
    return this.dataSource.getRepository(Product);
  }

  private invRepo() {
    return this.dataSource.getRepository(Inventory);
  }

  private locRepo() {
    return this.dataSource.getRepository(Location);
  }

  async findAll(filters: ProductFilters) {
    const qb = this.repo().createQueryBuilder('p');
    if (filters.search) {
      const s = `%${filters.search}%`;
      qb.andWhere(
        '(p.producto LIKE :s OR p.marca LIKE :s OR p.modelo LIKE :s OR p.codigoOem LIKE :s OR p.codigoFabrica LIKE :s)',
        { s },
      );
    }
    if (filters.marca)
      qb.andWhere('p.marca = :marca', { marca: filters.marca });
    if (filters.fabricante)
      qb.andWhere('p.fabricante = :f', { f: filters.fabricante });
    if (filters.producto)
      qb.andWhere('p.producto LIKE :p', { p: `%${filters.producto}%` });
    if (filters.modelo)
      qb.andWhere('p.modelo LIKE :m', { m: `%${filters.modelo}%` });
    if (filters.anio) qb.andWhere('p.anio LIKE :a', { a: `%${filters.anio}%` });
    if (filters.codigoOem)
      qb.andWhere('p.codigoOem LIKE :o', { o: `%${filters.codigoOem}%` });
    if (filters.codigoFabrica)
      qb.andWhere('p.codigoFabrica LIKE :cf', {
        cf: `%${filters.codigoFabrica}%`,
      });

    const products = await qb
      .andWhere('p.activo = :act', { act: true })
      .orderBy('p.id', 'DESC')
      .getMany();

    return this.attachStock(products);
  }

  async attachStock(products: Product[]): Promise<
    Array<
      Product & {
        stockTotal: number;
        stockByLocation: Record<number, number>;
        stockLocationDetails: Array<{
          locationId: number;
          ubicacion: string;
          tipo: string;
          cantidad: number;
        }>;
      }
    >
  > {
    if (products.length === 0) return [];
    const ids = products.map((p) => p.id);
    const inv = await this.invRepo()
      .createQueryBuilder('i')
      .select('i."productId"', 'productId')
      .addSelect('SUM(i.cantidad)', 'total')
      .where('i."productId" IN (:...ids)', { ids })
      .groupBy('i."productId"')
      .getRawMany<{ productId: number; total: number }>();
    const map = new Map(inv.map((r) => [Number(r.productId), Number(r.total)]));

    const allInv = await this.invRepo()
      .createQueryBuilder('i')
      .leftJoin(Location, 'loc', 'loc.id = i."locationId"')
      .select('i."productId"', 'productId')
      .addSelect('i."locationId"', 'locationId')
      .addSelect('i.cantidad', 'cantidad')
      .addSelect('loc.nombre', 'ubicacion')
      .addSelect('loc.tipo', 'tipo')
      .where('i."productId" IN (:...ids)', { ids })
      .getRawMany<{
        productId: number;
        locationId: number;
        cantidad: number;
        ubicacion: string;
        tipo: string;
      }>();
    const locMap = new Map<number, Record<number, number>>();
    const detailsMap = new Map<
      number,
      Array<{
        locationId: number;
        ubicacion: string;
        tipo: string;
        cantidad: number;
      }>
    >();
    for (const row of allInv) {
      const pid = Number(row.productId);
      if (!locMap.has(pid)) locMap.set(pid, {});
      locMap.get(pid)![Number(row.locationId)] = Number(row.cantidad);
      if (!detailsMap.has(pid)) detailsMap.set(pid, []);
      detailsMap.get(pid)!.push({
        locationId: Number(row.locationId),
        ubicacion: row.ubicacion,
        tipo: row.tipo,
        cantidad: Number(row.cantidad),
      });
    }

    return products.map((p) => ({
      ...p,
      stockTotal: map.get(p.id) ?? 0,
      stockByLocation: locMap.get(p.id) ?? {},
      stockLocationDetails: detailsMap.get(p.id) ?? [],
    }));
  }

  async findOne(id: number) {
    const product = await this.repo().findOne({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    const stock = await this.stockByLocation(id);
    const [withStock] = await this.attachStock([product]);
    const stockByLocation: Record<number, number> = {};
    for (const s of stock) {
      stockByLocation[s.locationId] = s.cantidad;
    }
    return { ...withStock, stock, stockByLocation };
  }

  async stockByLocation(id: number) {
    const inv = await this.invRepo().find({
      where: { productId: id },
      relations: { location: true },
      order: { id: 'ASC' },
    });
    return inv.map((i) => ({
      locationId: i.locationId,
      ubicacion: i.location.nombre,
      tipo: i.location.tipo,
      cantidad: i.cantidad,
    }));
  }

  async create(data: Partial<Product> & { stock?: Record<number, number> }) {
    if (!data.producto?.trim())
      throw new BadRequestException('El nombre del producto es obligatorio');
    if (!data.fabricante?.trim())
      throw new BadRequestException('El fabricante es obligatorio');
    if (!data.marca?.trim())
      throw new BadRequestException('La marca del vehículo es obligatoria');
    if (!data.modelo?.trim())
      throw new BadRequestException('El modelo del vehículo es obligatorio');
    if (!data.codigoFabrica?.trim())
      throw new BadRequestException('El código de fábrica es obligatorio');

    const existing = await this.repo().findOne({
      where: { codigoFabrica: data.codigoFabrica.trim() },
    });
    if (existing)
      throw new BadRequestException(
        `Ya existe un producto con el código fábrica ${data.codigoFabrica}`,
      );

    const costo = Number(data.costo) || 0;
    if (costo < 0)
      throw new BadRequestException('El costo no puede ser negativo');
    const precio1 = data.precio1 != null ? Number(data.precio1) : null;
    const precio2 = data.precio2 != null ? Number(data.precio2) : null;
    const precioMayor =
      data.precioMayor != null ? Number(data.precioMayor) : null;
    if (precio1 !== null && precio1 < 0)
      throw new BadRequestException('El precio 1 no puede ser negativo');
    if (precio2 !== null && precio2 < 0)
      throw new BadRequestException('El precio 2 no puede ser negativo');
    if (precioMayor !== null && precioMayor < 0)
      throw new BadRequestException(
        'El precio mayorista no puede ser negativo',
      );

    const stockMinimo = Number(data.stockMinimo) || 1;
    if (stockMinimo < 0)
      throw new BadRequestException('El stock mínimo no puede ser negativo');

    const product = this.repo().create({
      producto: data.producto.trim(),
      fabricante: data.fabricante.trim(),
      empresaFabricante: data.empresaFabricante?.trim() || null,
      marca: data.marca.trim(),
      modelo: data.modelo.trim(),
      anio: data.anio?.trim() || null,
      detalle: data.detalle?.trim() || null,
      codigoOem: data.codigoOem?.trim() || null,
      codigoFabrica: data.codigoFabrica.trim(),
      imagen: data.imagen?.trim() || null,
      costo,
      precio1,
      precio2,
      precioMayor,
      stockMinimo,
      activo: true,
    });
    const saved = await this.repo().save(product);
    if (data.stock) {
      for (const [locId, cantidad] of Object.entries(data.stock)) {
        const qty = Number(cantidad);
        if (qty > 0) {
          await this.setStock(saved.id, Number(locId), qty);
        }
      }
    }
    return this.findOne(saved.id);
  }

  async update(id: number, data: Partial<Product>) {
    const product = await this.repo().findOne({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');

    if (data.costo !== undefined) {
      const costo = Number(data.costo);
      if (isNaN(costo) || costo < 0)
        throw new BadRequestException('El costo no puede ser negativo');
      product.costo = costo;
    }
    if (data.precio1 !== undefined) {
      const p = Number(data.precio1);
      if (isNaN(p) || p < 0)
        throw new BadRequestException('El precio 1 no puede ser negativo');
      product.precio1 = p;
    }
    if (data.precio2 !== undefined) {
      const p = Number(data.precio2);
      if (isNaN(p) || p < 0)
        throw new BadRequestException('El precio 2 no puede ser negativo');
      product.precio2 = p;
    }
    if (data.precioMayor !== undefined) {
      const p = Number(data.precioMayor);
      if (isNaN(p) || p < 0)
        throw new BadRequestException(
          'El precio mayorista no puede ser negativo',
        );
      product.precioMayor = p;
    }
    if (data.stockMinimo !== undefined) {
      const sm = Number(data.stockMinimo);
      if (isNaN(sm) || sm < 0)
        throw new BadRequestException('El stock mínimo no puede ser negativo');
      product.stockMinimo = sm;
    }

    const textFields: Array<keyof Product> = [
      'producto',
      'fabricante',
      'empresaFabricante',
      'marca',
      'modelo',
      'anio',
      'detalle',
      'codigoOem',
      'codigoFabrica',
      'imagen',
    ];
    for (const field of textFields) {
      const val = data[field];
      if (val !== undefined) {
        const target = product as unknown as Record<string, unknown>;
        target[field] = typeof val === 'string' ? val.trim() || null : val;
      }
    }

    const saved = await this.repo().save(product);
    return this.findOne(saved.id);
  }

  async remove(id: number) {
    const product = await this.repo().findOne({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    product.activo = false;
    await this.repo().save(product);
    return { ok: true };
  }

  async setStock(productId: number, locationId: number, cantidad: number) {
    if (cantidad < 0)
      throw new BadRequestException(
        'La cantidad de stock no puede ser negativa',
      );
    const inv = await this.invRepo().findOne({
      where: { productId, locationId },
    });
    if (inv) {
      inv.cantidad = cantidad;
      return this.invRepo().save(inv);
    }
    const created = this.invRepo().create({ productId, locationId, cantidad });
    return this.invRepo().save(created);
  }

  async adjustStock(
    productId: number,
    locationId: number,
    delta: number,
  ): Promise<Inventory> {
    const inv = await this.invRepo().findOne({
      where: { productId, locationId },
    });
    if (inv) {
      inv.cantidad = Math.max(0, inv.cantidad + delta);
      return this.invRepo().save(inv);
    }
    const created = this.invRepo().create({
      productId,
      locationId,
      cantidad: Math.max(0, delta),
    });
    return this.invRepo().save(created);
  }

  async stockAt(productId: number, locationId: number): Promise<number> {
    const inv = await this.invRepo().findOne({
      where: { productId, locationId },
    });
    return inv ? inv.cantidad : 0;
  }

  async stockByLocationForProduct(
    productId: number,
  ): Promise<Record<number, number>> {
    const inv = await this.invRepo().find({ where: { productId } });
    const map: Record<number, number> = {};
    for (const i of inv) {
      map[i.locationId] = i.cantidad;
    }
    return map;
  }

  async uploadImage(id: number, file: Express.Multer.File): Promise<Product> {
    const product = await this.repo().findOne({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');

    if (!fs.existsSync(UPLOADS_DIR))
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const ext = path.extname(file.originalname) || '.png';
    const filename = `product-${id}-${Date.now()}${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), file.buffer);

    product.imagen = `/uploads/${filename}`;
    product.imagenHash = await computeHash(file.buffer);
    return this.repo().save(product);
  }

  async searchByImage(file: Express.Multer.File, limit = 5) {
    if (!file) throw new BadRequestException('No se recibió ninguna imagen');
    const hash = await computeHash(file.buffer);
    const products = await this.repo().find({ where: { activo: true } });
    const results = products
      .filter((p) => p.imagenHash)
      .map((p) => ({
        product: p,
        distancia: hammingDistance(hash, p.imagenHash!),
      }))
      .sort((a, b) => a.distancia - b.distancia)
      .slice(0, limit);
    const withStock = await this.attachStock(results.map((r) => r.product));
    const stockMap = new Map(withStock.map((p) => [p.id, p.stockTotal]));
    return results.map((r) => ({
      ...r.product,
      stockTotal: stockMap.get(r.product.id) ?? 0,
      similitud: Math.round((1 - r.distancia / 64) * 100),
    }));
  }
}
