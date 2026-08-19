import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Proveedor } from '../entities/proveedor.entity';

@Injectable()
export class ProveedoresService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  private repo() {
    return this.dataSource.getRepository(Proveedor);
  }

  async findAll() {
    return this.repo().find({ order: { nombre: 'ASC' } });
  }

  async create(data: { nombre: string; pais?: string; contacto?: string }) {
    if (!data.nombre) throw new BadRequestException('El nombre es obligatorio');
    const prov = this.repo().create({
      nombre: data.nombre,
      pais: data.pais ?? 'Bolivia',
      contacto: data.contacto ?? null,
    });
    return this.repo().save(prov);
  }
}
