import { api, API_BASE_URL } from '../api/client';
import type {
  FilaPrecio,
  UpdatePreciosDto,
  PrecioFilters,
} from '../types/precio.types';

export const preciosService = {
  async getPrecios(filters: PrecioFilters = {}): Promise<FilaPrecio[]> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.marca) params.append('marca', filters.marca);
    if (filters.fabricante) params.append('fabricante', filters.fabricante);
    if (filters.modelo) params.append('modelo', filters.modelo);

    const qs = params.toString();
    const url = qs ? `/precios?${qs}` : '/precios';

    const data = await api.get<FilaPrecio[]>(url);
    return Array.isArray(data) ? data : [];
  },

  async updatePrecios(id: number, dto: UpdatePreciosDto): Promise<FilaPrecio> {
    return api.patch<FilaPrecio>(`/precios/${id}`, dto);
  },

  async exportExcel(filters: PrecioFilters = {}): Promise<void> {
    const token = localStorage.getItem('auth_token');

    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.marca) params.append('marca', filters.marca);
    if (filters.fabricante) params.append('fabricante', filters.fabricante);
    if (filters.modelo) params.append('modelo', filters.modelo);

    const qs = params.toString();
    const url = `${API_BASE_URL}/precios/export${qs ? `?${qs}` : ''}`;

    const res = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) throw new Error(`Error HTTP ${res.status}`);

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fecha = new Date().toISOString().slice(0, 10);
    link.href = downloadUrl;
    link.download = `catalogo-precios-${fecha}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },
};