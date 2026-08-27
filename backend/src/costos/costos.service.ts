import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Factura } from '../entities/factura.entity';
import { FacturaItem } from '../entities/factura-item.entity';
import { Proveedor } from '../entities/proveedor.entity';
import { Product } from '../entities/product.entity';
import { Inventory } from '../entities/inventory.entity';
import { ProductsService } from '../products/products.service';
import { LocationsService } from '../locations/locations.service';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export interface FacturaItemInput {
  codigoFabrica: string;
  producto: string;
  marca: string;
  modelo: string;
  anio?: string;
  detalle?: string;
  costo: number;
  cantidad: number;
  almacenId: number;
}

export interface CreateFacturaInput {
  proveedorId: number;
  numero: string;
  tipoCambio?: number;
  porcentaje?: number;
  monto?: number;
  items: FacturaItemInput[];
}

@Injectable()
export class CostosService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private productsService: ProductsService,
    private locationsService: LocationsService,
  ) {}

  private repo() {
    return this.dataSource.getRepository(Factura);
  }

  private itemsRepo() {
    return this.dataSource.getRepository(FacturaItem);
  }

  private baseQuery() {
    return this.repo()
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.proveedor', 'proveedor')
      .leftJoinAndSelect('f.items', 'items')
      .leftJoinAndSelect('items.almacen', 'almacen');
  }

  async findAll() {
    return this.baseQuery().orderBy('f.id', 'DESC').getMany();
  }

  async findOne(id: number) {
    const factura = await this.baseQuery().where('f.id = :id', { id }).getOne();
    if (!factura) throw new NotFoundException('Factura no encontrada');
    return factura;
  }

  async create(input: CreateFacturaInput, file?: Express.Multer.File) {
    const proveedor = await this.dataSource
      .getRepository(Proveedor)
      .findOne({ where: { id: input.proveedorId } });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
    if (!input.numero || !input.numero.trim()) {
      throw new BadRequestException('El número de factura es obligatorio');
    }
    if (!input.items || input.items.length === 0) {
      throw new BadRequestException('La factura debe incluir al menos un ítem');
    }

    const tipoCambio = Number(input.tipoCambio ?? 1);
    if (!Number.isFinite(tipoCambio) || tipoCambio <= 0) {
      throw new BadRequestException('El tipo de cambio debe ser mayor a 0');
    }
    const porcentaje = Number(input.porcentaje ?? 0);
    if (!Number.isFinite(porcentaje) || porcentaje < 0) {
      throw new BadRequestException('El porcentaje no puede ser negativo');
    }
    const monto = Number(input.monto ?? 0);
    if (!Number.isFinite(monto) || monto < 0) {
      throw new BadRequestException('El monto no puede ser negativo');
    }

    let archivo: string | null = null;
    if (file) {
      if (!fs.existsSync(UPLOADS_DIR))
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      const ext = path.extname(file.originalname) || '.pdf';
      const filename = `factura-${Date.now()}-${Math.round(Math.random() * 1000)}${ext}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), file.buffer);
      archivo = `/uploads/${filename}`;
    }

    try {
      const id = await this.dataSource.transaction(async (manager) => {
        const factura = manager.getRepository(Factura).create({
          proveedorId: input.proveedorId,
          numero: input.numero.trim(),
          tipoCambio,
          porcentaje,
          monto,
          archivo,
        });
        const saved = await manager.getRepository(Factura).save(factura);

        const productRepo = manager.getRepository(Product);
        const invRepo = manager.getRepository(Inventory);
        const items: FacturaItem[] = [];
        for (const item of input.items) {
          const codigoFabrica = String(item.codigoFabrica || '').trim();
          const producto = String(item.producto || '').trim();
          const marca = String(item.marca || '').trim();
          const modelo = String(item.modelo || '').trim();
          if (!codigoFabrica || !producto) {
            throw new BadRequestException(
              'Cada ítem requiere código fábrica y producto',
            );
          }
          const costo = Number(item.costo);
          if (!Number.isFinite(costo) || costo < 0) {
            throw new BadRequestException(
              `El costo del ítem "${producto}" no puede ser negativo`,
            );
          }
          const cantidad = Number(item.cantidad);
          if (
            !Number.isFinite(cantidad) ||
            cantidad <= 0 ||
            !Number.isInteger(cantidad)
          ) {
            throw new BadRequestException(
              `La cantidad del ítem "${producto}" debe ser un entero mayor a 0`,
            );
          }
          const almacen = await this.locationsService.findOne(item.almacenId);
          if (!almacen || almacen.tipo !== 'almacen') {
            throw new BadRequestException(
              `El ítem ${producto} debe asignarse a un almacén`,
            );
          }

          let product = await productRepo.findOne({
            where: { codigoFabrica },
          });
          if (!product) {
            product = productRepo.create({
              codigoFabrica,
              producto,
              fabricante: marca || 'Genérico',
              marca,
              modelo,
              anio: item.anio?.trim() || null,
              detalle: item.detalle?.trim() || null,
              costo,
              stockMinimo: 1,
              activo: true,
            });
            product = await productRepo.save(product);
          } else {
            product.costo = costo;
            await productRepo.save(product);
          }

          const inv = await invRepo.findOne({
            where: { productId: product.id, locationId: item.almacenId },
          });
          if (inv) {
            inv.cantidad = inv.cantidad + cantidad;
            await invRepo.save(inv);
          } else {
            await invRepo.save(
              invRepo.create({
                productId: product.id,
                locationId: item.almacenId,
                cantidad,
              }),
            );
          }

          items.push(
            manager.getRepository(FacturaItem).create({
              facturaId: saved.id,
              codigoFabrica,
              producto,
              marca,
              modelo,
              anio: item.anio?.trim() || null,
              detalle: item.detalle?.trim() || null,
              costo,
              cantidad,
              almacenId: item.almacenId,
            }),
          );
        }
        await manager.getRepository(FacturaItem).save(items);

        return saved.id;
      });

      return this.findOne(id);
    } catch (err) {
      if (archivo) {
        try {
          fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(archivo)));
        } catch {
          void 0;
        }
      }
      throw err;
    }
  }

  async remove(id: number) {
    const factura = await this.findOne(id);
    await this.repo().remove(factura);
    return { ok: true };
  }
}
