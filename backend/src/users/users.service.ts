import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { USER_ROLES } from '../common/constants';

@Injectable()
export class UsersService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  private repo() {
    return this.dataSource.getRepository(User);
  }

  async findAll() {
    const users = await this.repo().find({
      relations: { tienda: true },
      order: { id: 'ASC' },
    });
    return users.map(({ password, ...rest }) => rest);
  }

  async create(data: {
    nombre: string;
    email: string;
    password: string;
    rol: string;
    tiendaId?: number | null;
  }) {
    if (!USER_ROLES.includes(data.rol as any)) {
      throw new BadRequestException('Rol inválido');
    }
    const exists = await this.repo().findOne({
      where: { email: data.email.toLowerCase() },
    });
    if (exists) throw new BadRequestException('El email ya está registrado');
    const user = this.repo().create({
      nombre: data.nombre,
      email: data.email.toLowerCase(),
      password: await bcrypt.hash(data.password, 10),
      rol: data.rol as any,
      tiendaId: data.tiendaId ?? null,
    });
    const saved = await this.repo().save(user);
    const { password: _pw, ...rest } = saved;
    return rest;
  }

  async update(
    id: number,
    data: {
      nombre?: string;
      email?: string;
      password?: string;
      rol?: string;
      tiendaId?: number | null;
    },
  ) {
    const user = await this.repo().findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (data.rol && !USER_ROLES.includes(data.rol as any)) {
      throw new BadRequestException('Rol inválido');
    }
    if (data.nombre !== undefined) user.nombre = data.nombre;
    if (data.email !== undefined) user.email = data.email.toLowerCase();
    if (data.rol !== undefined) user.rol = data.rol as any;
    if (data.tiendaId !== undefined) user.tiendaId = data.tiendaId;
    if (data.password) {
      user.password = await bcrypt.hash(data.password, 10);
    }
    const saved = await this.repo().save(user);
    const { password: _pw, ...rest } = saved;
    return rest;
  }

  async remove(id: number) {
    const user = await this.repo().findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    await this.repo().remove(user);
    return { ok: true };
  }
}