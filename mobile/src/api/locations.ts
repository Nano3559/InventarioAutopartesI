import { request, ApiError } from './client';

export interface Location {
  id: number;
  codigo: string;
  nombre: string;
  tipo: 'almacen' | 'tienda';
  numero: number;
  ubicacion: string;
  horarios: string;
  contacto: string;
}

export async function getLocations(token?: string) {
  return request<Location[]>('/locations', { method: 'GET' }, token);
}

export async function getAlmacenes(token?: string) {
  const locations = await getLocations(token);
  return locations.filter((l) => l.tipo === 'almacen');
}