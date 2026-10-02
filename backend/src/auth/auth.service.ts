import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  async validateUser(email: string, password: string) {
    if (
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const repo = this.dataSource.getRepository(User);
    const user = await repo.findOne({
      where: { email: email.trim().toLowerCase() },
      relations: { tienda: true },
    });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');
    // Baja lógica (Hito 3): el personal dado de baja no puede ni entrar al sistema.
    if (!user.activo) {
      throw new UnauthorizedException(
        'El usuario está dado de baja. Contactá al administrador.',
      );
    }
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const payload = {
      sub: user.id,
      email: user.email,
      rol: user.rol,
      tiendaId: user.tiendaId,
    };
    return {
      token: this.jwtService.sign(payload),
      user: this.safeUser(user),
    };
  }

  /**
   * Lo que vuelve al cliente tras el login. El `embedding` (512 floats de dato
   * biométrico, Ley 26935) nunca sale del backend.
   */
  safeUser(user: User) {
    const { password, embedding, ...rest } = user;
    void password;
    void embedding;
    return rest;
  }
}
