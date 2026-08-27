import type { Product, LocationItem } from './product.types';
import type { User } from './auth.types';

export interface MovimientoItem {
  id: number;
  productId: number;
  product: Product;
  cantidad: number;
  origenId: number;
  origen: LocationItem;
  destinoId: number;
  destino: LocationItem;
  usuarioId: number;
  usuario?: User;
  fecha: string;
  observacion?: string | null;
}

export interface CreateMovimientoDto {
  productId: number;
  cantidad: number;
  origenId: number;
  destinoId: number;
  observacion?: string;
}

export interface MovimientoFilters {
  search?: string;
  origenId?: number;
  destinoId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
}
