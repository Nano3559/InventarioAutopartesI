import { api, API_BASE_URL } from '../api/client';
import type {
  Factura,
  CreateFacturaDto,
  Proveedor,
  CreateProveedorDto,
} from '../types/costo.types';

export const costosService = {
  // --- PROVEEDORES ---
  async getProveedores(): Promise<Proveedor[]> {
    const data = await api.get<Proveedor[]>('/proveedores');
    return Array.isArray(data) ? data : [];
  },

  async createProveedor(dto: CreateProveedorDto): Promise<Proveedor> {
    return api.post<Proveedor>('/proveedores', dto);
  },

  // --- FACTURAS DE COMPRA ---
  async getFacturas(): Promise<Factura[]> {
    const data = await api.get<Factura[]>('/costos/facturas');
    return Array.isArray(data) ? data : [];
  },

  async getFacturaById(id: number): Promise<Factura> {
    const data = await api.get<Factura>(`/costos/facturas/${id}`);
    if (!data || !data.id) throw new Error('Factura no encontrada');
    return data;
  },

  async createFactura(dto: CreateFacturaDto, archivoFile?: File): Promise<Factura> {
    const token = localStorage.getItem('auth_token');

    const formData = new FormData();
    formData.append('proveedorId', String(dto.proveedorId));
    formData.append('numero', dto.numero);
    if (dto.tipoCambio !== undefined) formData.append('tipoCambio', String(dto.tipoCambio));
    if (dto.porcentaje !== undefined) formData.append('porcentaje', String(dto.porcentaje));
    if (dto.monto !== undefined) formData.append('monto', String(dto.monto));
    formData.append('items', JSON.stringify(dto.items));

    if (archivoFile) {
      formData.append('archivo', archivoFile);
    }

    const res = await fetch(`${API_BASE_URL}/costos/facturas`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      let errorMsg = 'Error al crear factura';
      try {
        const errorData = await res.json();
        errorMsg = errorData?.message || errorMsg;
        if (Array.isArray(errorMsg)) errorMsg = errorMsg.join(', ');
      } catch {
        errorMsg = `Error HTTP ${res.status}`;
      }
      throw new Error(errorMsg);
    }

    return res.json();
  },

  async deleteFactura(id: number): Promise<void> {
    await api.delete(`/costos/facturas/${id}`);
  },
};