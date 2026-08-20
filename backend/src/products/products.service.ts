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
      .where('p.activo = :act', { act: true })
      .orderBy('p.id', 'DESC')
      .getMany();

    const withStock = await this.attachStock(products);
    return withStock;
  }

  async attachStock(
    products: Product[],
  ): Promise<Array<Product & { stockTotal: number }>> {
    if (products.length === 0) return [];
    const ids = products.map((p) => p.id);
    const inv = await this.invRepo()
      .createQueryBuilder('i')
      .select('i.productId', 'productId')
      .addSelect('SUM(i.cantidad)', 'total')
      .where('i.productId IN (:...ids)', { ids })
      .groupBy('i.productId')
      .getRawMany<{ productId: number; total: number }>();
    const map = new Map(inv.map((r) => [Number(r.productId), Number(r.total)]));
    return products.map((p) => ({
      ...p,
      stockTotal: map.get(p.id) ?? 0,
    }));
  }

  async findOne(id: number) {
    const product = await this.repo().findOne({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    const stock = await this.stockByLocation(id);
    const [withStock] = await this.attachStock([product]);
    return { ...withStock, stock };
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
    const existing = await this.repo().findOne({
      where: { codigoFabrica: data.codigoFabrica },
    });
    if (existing)
      throw new BadRequestException(
        `Ya existe un producto con el código fábrica ${data.codigoFabrica}`,
      );
    const product = this.repo().create({
      producto: data.producto,
      fabricante: data.fabricante,
      empresaFabricante: data.empresaFabricante ?? null,
      marca: data.marca,
      modelo: data.modelo,
      anio: data.anio ?? null,
      detalle: data.detalle ?? null,
      codigoOem: data.codigoOem ?? null,
      codigoFabrica: data.codigoFabrica,
      imagen: data.imagen ?? null,
      costo: data.costo ?? 0,
      precio1: data.precio1 ?? null,
      precio2: data.precio2 ?? null,
      precioMayor: data.precioMayor ?? null,
      stockMinimo: data.stockMinimo ?? 1,
      activo: true,
    });
    const saved = await this.repo().save(product);
    if (data.stock) {
      for (const [locId, cantidad] of Object.entries(data.stock)) {
        await this.setStock(saved.id, Number(locId), Number(cantidad));
      }
    }
    return this.findOne(saved.id);
  }

  async update(id: number, data: Partial<Product>) {
    const product = await this.repo().findOne({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    Object.assign(product, data);
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
