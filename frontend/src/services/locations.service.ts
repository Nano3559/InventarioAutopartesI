import { api } from '../api/client';
import type { LocationItem } from '../types/product.types';

export const MOCK_LOCATIONS: LocationItem[] = [
  { id: 1, nombre: 'Almacén 1 (Central El Alto)', tipo: 'almacen', numero: 1, ciudad: 'El Alto', direccion: 'Av. 6 de Marzo #1200' },
  { id: 2, nombre: 'Almacén 2 (Norte)', tipo: 'almacen', numero: 2, ciudad: 'La Paz', direccion: 'Zona Villa Fátima' },
  { id: 3, nombre: 'Almacén 3 (Sur)', tipo: 'almacen', numero: 3, ciudad: 'La Paz', direccion: 'Calacoto Calle 15' },
  { id: 4, nombre: 'Almacén 4 (Distribución)', tipo: 'almacen', numero: 4, ciudad: 'El Alto', direccion: 'Parque Industrial' },
  { id: 5, nombre: 'Tienda 1 (Av. Principal)', tipo: 'tienda', numero: 1, ciudad: 'La Paz', direccion: 'Av. Montes #450' },
  { id: 6, nombre: 'Tienda 2 (Comercial Repuestos)', tipo: 'tienda', numero: 2, ciudad: 'El Alto', direccion: 'Av. Juan Pablo II' },
  { id: 7, nombre: 'Tienda 3 (Zona Sur)', tipo: 'tienda', numero: 3, ciudad: 'La Paz', direccion: 'Av. Ballivián #890' },
];

export const locationsService = {
  async getLocations(): Promise<LocationItem[]> {
    try {
      const data = await api.get<LocationItem[]>('/locations');
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
      return MOCK_LOCATIONS;
    } catch (err) {
      console.warn('Backend /locations inaccesible, usando ubicaciones base:', err);
      return MOCK_LOCATIONS;
    }
  },
};
