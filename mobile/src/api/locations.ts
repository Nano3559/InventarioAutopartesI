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

/**
 * Tiendas (`locations.tipo = 'tienda'`). Es la lista que usa el selector del
 * terminal de tiqueo (tarea R9) para preguntar a qué tienda pertenece la tablet.
 * Filtra en el cliente a propósito: `GET /locations` no acepta filtros y son
 * 7 filas.
 */
export async function getTiendas(token?: string) {
  const locations = await getLocations(token);
  return locations.filter((l) => l.tipo === 'tienda');
}