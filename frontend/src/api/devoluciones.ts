import { api } from './client';

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

export async function getDevoluciones(): Promise<Devolucion[]> {
  return api.get<Devolucion[]>('/devoluciones');
}

export async function getSalesForDevolucion(search?: string): Promise<SaleSummary[]> {
  const params = search ? { search } : {};
  return api.get<SaleSummary[]>('/devoluciones/sales', { params });
}

export async function createDevolucion(input: CreateDevolucionInput): Promise<Devolucion> {
  return api.post<Devolucion>('/devoluciones', input);
}
