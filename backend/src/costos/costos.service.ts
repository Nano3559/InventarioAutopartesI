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
import { Proveedor } from '../entities/proveedor.entity';
import { Product } from '../entities/product.entity';
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

  async findAll() {
    return this.repo()
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.proveedor', 'proveedor')
      .orderBy('f.id', 'DESC')
      .getMany();
  }

  async create(
    input: {
      proveedorId: number;
      numero: string;
      tipoCambio?: number;
      porcentaje?: number;
      monto?: number;
      items: FacturaItemInput[];
    },
    file?: Express.Multer.File,
  ) {
    const proveedor = await this.dataSource
      .getRepository(Proveedor)
      .findOne({ where: { id: input.proveedorId } });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
    if (!input.items || input.items.length === 0) {
      throw new BadRequestException('La factura debe incluir al menos un ítem');
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

    const factura = this.repo().create({
      proveedorId: input.proveedorId,
      numero: input.numero,
      tipoCambio: input.tipoCambio ?? 1,
      porcentaje: input.porcentaje ?? 0,
      monto: input.monto ?? 0,
      archivo,
    });
    const saved = await this.repo().save(factura);
    void saved;

    const productRepo = this.dataSource.getRepository(Product);
    for (const item of input.items) {
      if (!item.codigoFabrica || !item.producto) {
        throw new BadRequestException(
          'Cada ítem requiere código fábrica y producto',
        );
      }
      const almacen = await this.locationsService.findOne(item.almacenId);
      if (!almacen || almacen.tipo !== 'almacen') {
        throw new BadRequestException(
          `El ítem ${item.producto} debe asignarse a un almacén`,
        );
      }
      let product = await productRepo.findOne({
        where: { codigoFabrica: item.codigoFabrica },
      });
      if (!product) {
        product = productRepo.create({
          codigoFabrica: item.codigoFabrica,
          producto: item.producto,
          fabricante: item.marca,
          marca: item.marca,
          modelo: item.modelo,
          anio: item.anio ?? null,
          detalle: item.detalle ?? null,
          costo: item.costo,
          stockMinimo: 1,
          activo: true,
        });
        product = await productRepo.save(product);
      } else {
        product.costo = item.costo;
        await productRepo.save(product);
      }
      await this.productsService.adjustStock(
        product.id,
        item.almacenId,
        item.cantidad,
      );
    }

    return this.findAll();
  }
}
