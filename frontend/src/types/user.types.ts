import type { UserRole } from './auth.types';

export interface UserItem {
  id: number;
  nombre: string;
  apellido?: string | null;
  nombreCompleto?: string;
  email: string;
  rol: UserRole;
  tiendaId?: number | null;
  activo: boolean;
  faceRegisteredAt?: string | null;
  facePhoto?: string | null;
  fotoUrl?: string | null;
  createdAt?: string;
}

export interface UpdateUserDto {
  nombre?: string;
  apellido?: string | null;
  email?: string;
  password?: string;
  rol?: UserRole;
  tiendaId?: number | null;
  activo?: boolean;
  eliminarEmbedding?: boolean;
}

export interface CreateUserDto {
  nombre: string;
  apellido?: string;
  email: string;
  password?: string;
  rol: UserRole;
  tiendaId?: number | null;
  activo?: boolean;
}
