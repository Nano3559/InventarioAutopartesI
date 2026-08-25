import { api } from '../api/client';
import type { LocationItem } from '../types/product.types';

export const locationsService = {
  async getLocations(): Promise<LocationItem[]> {
    const data = await api.get<LocationItem[]>('/locations');
    return Array.isArray(data) ? data : [];
  },
};
