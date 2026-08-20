export type UserRole = 'admin' | 'tienda' | 'inventario';

export interface Location {
  id: number;
  nombre: string;
  tipo: 'almacen' | 'tienda';
  direccion?: string;
}

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: UserRole;
  tiendaId?: number | null;
  tienda?: Location | null;
  createdAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}
