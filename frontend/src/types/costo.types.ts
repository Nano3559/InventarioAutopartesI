import type { Product, LocationItem } from './product.types';

export interface Proveedor {
  id: number;
  nombre: string;
  pais: string;
  contacto?: string | null;
  createdAt?: string;
}

export interface CreateProveedorDto {
  nombre: string;
  pais: string;
  contacto?: string;
}

export interface FacturaItem {
  id?: number;
  facturaId?: number;
  productId: number;
  product?: Product;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
  locationId?: number;
  location?: LocationItem;
}

export interface FacturaItemInput {
  productId: number;
  cantidad: number;
  costoUnitario: number;
  locationId?: number;
}

export interface Factura {
  id: number;
  proveedorId: number;
  proveedor: Proveedor;
  numero: string;
  tipoCambio: number;
  porcentaje: number;
  monto: number;
  archivo?: string | null;
  fecha: string;
  items?: FacturaItem[];
}

export interface CreateFacturaDto {
  proveedorId: number;
  numero: string;
  tipoCambio?: number;
  porcentaje?: number;
  monto?: number;
  items: FacturaItemInput[];
}
