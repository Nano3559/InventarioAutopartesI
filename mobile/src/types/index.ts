export type UserRole = 'admin' | 'tienda' | 'inventario';

export type TipoUbicacion = 'almacen' | 'tienda';

export interface Location {
  id: number;
  nombre: string;
  tipo: TipoUbicacion;
  numero: number;
  codigo: string;
}

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: UserRole;
  tienda: Location | null;
  tiendaId: number | null;
  createdAt: string;
}