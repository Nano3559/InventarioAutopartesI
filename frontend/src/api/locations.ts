import { api } from './client';

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

export async function getLocations(): Promise<Location[]> {
  return api.get<Location[]>('/locations');
}

export async function getLocation(id: number): Promise<Location> {
  return api.get<Location>(`/locations/${id}`);
}

export async function getAlmacenes(): Promise<Location[]> {
  const locations = await getLocations();
  return locations.filter((l) => l.tipo === 'almacen');
}

export async function getTiendas(): Promise<Location[]> {
  const locations = await getLocations();
  return locations.filter((l) => l.tipo === 'tienda');
}