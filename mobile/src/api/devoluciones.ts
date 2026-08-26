import { request, ApiError } from './client';

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

export interface CreateDevolucionInput {
  productId: number;
  motivo: string;
  cantidad: number;
  monto: number;
  metodo: string;
  locationId?: number;
}

export async function getDevoluciones(token?: string) {
  return request<Devolucion[]>('/devoluciones', { method: 'GET' }, token);
}

export async function createDevolucion(input: CreateDevolucionInput, token?: string) {
  return request<Devolucion>('/devoluciones', {
    method: 'POST',
    body: JSON.stringify(input),
  }, token);
}