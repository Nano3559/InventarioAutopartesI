import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Proveedor } from '../entities/proveedor.entity';
import { Factura } from '../entities/factura.entity';

export interface ProveedorInput {
  nombre: string;
  pais?: string;
  contacto?: string | null;
}

@Injectable()
export class ProveedoresService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  private repo() {
    return this.dataSource.getRepository(Proveedor);
  }

  async findAll() {
    return this.repo().find({ order: { nombre: 'ASC' } });
  }

  async findOne(id: number) {
    const proveedor = await this.repo().findOne({ where: { id } });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
    return proveedor;
  }

  async create(data: ProveedorInput) {
    const nombre = String(data.nombre ?? '').trim();
    if (!nombre) throw new BadRequestException('El nombre es obligatorio');
    const existing = await this.repo().findOne({ where: { nombre } });
    if (existing)
      throw new BadRequestException('Ya existe un proveedor con ese nombre');
    const prov = this.repo().create({
      nombre,
      pais: data.pais?.trim() || 'Bolivia',
      contacto: data.contacto?.trim() || null,
    });
    return this.repo().save(prov);
  }

  async update(id: number, data: Partial<ProveedorInput>) {
    const proveedor = await this.findOne(id);
    const nombre =
      data.nombre !== undefined ? String(data.nombre).trim() : proveedor.nombre;
    if (!nombre) throw new BadRequestException('El nombre es obligatorio');
    const existing = await this.repo().findOne({ where: { nombre } });
    if (existing && existing.id !== id) {
      throw new BadRequestException('Ya existe un proveedor con ese nombre');
    }
    if (data.pais !== undefined) {
      proveedor.pais = data.pais?.trim() || 'Bolivia';
    }
    if (data.contacto !== undefined) {
      proveedor.contacto = data.contacto?.trim() || null;
    }
    proveedor.nombre = nombre;
    return this.repo().save(proveedor);
  }

  async remove(id: number) {
    const proveedor = await this.findOne(id);
    const facturas = await this.dataSource
      .getRepository(Factura)
      .count({ where: { proveedorId: id } });
    if (facturas > 0) {
      throw new BadRequestException(
        'No se puede eliminar: el proveedor tiene facturas asociadas',
      );
    }
    await this.repo().remove(proveedor);
    return { ok: true };
  }
}
