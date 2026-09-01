import { request } from './client';

export interface Devolucion {
  id: number;
  fecha: string;
  productId: number;
  producto: {
    id: number;
    producto: string;
    marca: string;
    modelo: string;
    codigoFabrica: string;
  };
  ventaId: number | null;
  venta?: {
    id: number;
    codigo: string;
    fecha: string;
    tipo: string;
    total: number;
  } | null;
  saleItemId: number | null;
  motivo: string;
  cantidad: number;
  monto: number;
  metodo: string;
  locationId: number;
  location: {
    id: number;
    nombre: string;
    tipo: string;
  };
  usuarioId: number;
  usuario: {
    id: number;
    nombre: string;
  };
}

export interface SaleSummary {
  id: number;
  codigo: string;
  fecha: string;
  tipo: string;
  total: number;
  cliente: { id: number; nombre: string; ciNit?: string } | null;
  ubicacion: string | null;
  items: SaleItemSummary[];
}

export interface SaleItemSummary {
  id: number;
  productId: number;
  cantidad: number;
  precio: number;
  subtotal: number;
}

export interface CreateDevolucionInput {
  productId: number;
  motivo: string;
  cantidad: number;
  monto: number;
  metodo: string;
  locationId?: number;
  ventaId?: number;
  saleItemId?: number;
}

export async function getDevoluciones(token?: string) {
  return request<Devolucion[]>('/devoluciones', { method: 'GET' }, token);
}

export async function getSalesForDevolucion(token?: string, search?: string) {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  return request<SaleSummary[]>(`/devoluciones/sales${params}`, { method: 'GET' }, token);
}

export async function createDevolucion(input: CreateDevolucionInput, token?: string) {
  return request<Devolucion>('/devoluciones', {
    method: 'POST',
    body: JSON.stringify(input),
  }, token);
}
