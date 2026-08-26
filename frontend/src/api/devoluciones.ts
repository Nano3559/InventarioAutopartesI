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

export async function getDevoluciones(): Promise<Devolucion[]> {
  return api.get<Devolucion[]>('/devoluciones');
}

export async function createDevolucion(input: CreateDevolucionInput): Promise<Devolucion> {
  return api.post<Devolucion>('/devoluciones', input);
}