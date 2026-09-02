import { api, API_BASE_URL } from '../api/client';
import type { Product } from '../types/product.types';

export interface SaleItemInput {
  productId: number;
  cantidad: number;
  precio: number;
}

export interface PaymentInput {
  metodo: string;
  monto: number;
}

export interface ClienteInput {
  nombre: string;
  ciNit?: string;
  celular?: string;
}

export interface SaleInput {
  tipo?: 'menor' | 'mayor';
  items: SaleItemInput[];
  pagos: PaymentInput[];
  cliente?: ClienteInput;
  requiereFactura?: boolean;
  lugarEntrega?: string;
  paraQuien?: string;
  locationId?: number;
}

export interface WholesaleExcelRow {
  productId: number;
  producto: string;
  codigoFabrica: string;
  cantidad: number;
  precio: number;
  stockDisponible: number;
}

export interface WholesalePreviewResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  items: WholesaleExcelRow[];
  total: number;
}

export interface WholesaleImportMeta {
  cliente?: ClienteInput;
  requiereFactura?: boolean;
  lugarEntrega?: string;
  paraQuien?: string;
  locationId?: number;
  pagos?: PaymentInput[];
}

export interface SaleResponse {
  id: number;
  codigo: string;
  tipo: string;
  total: number;
  fecha: string;
  locationId: number;
  usuarioId: number;
  clienteId?: number;
  requiereFactura: boolean;
  lugarEntrega?: string;
  paraQuien?: string;
  items: Array<{
    id: number;
    productId: number;
    cantidad: number;
    precio: number;
    subtotal: number;
    product: Product;
  }>;
  pagos: Array<{ id: number; metodo: string; monto: number }>;
  cliente?: { id: number; nombre: string; ciNit?: string; celular?: string };
  location?: { id: number; nombre: string };
  usuario?: { id: number; nombre: string };
}

export const salesService = {
  async createSale(input: SaleInput): Promise<SaleResponse> {
    const response = await api.post<SaleResponse>('/sales', input);
    return response;
  },

  async getSales(params?: {
    desde?: string;
    hasta?: string;
    tiendaId?: number;
    tipo?: string;
    search?: string;
  }): Promise<SaleResponse[]> {
    return api.get<SaleResponse[]>('/sales', { params });
  },

  async getSaleById(id: number): Promise<SaleResponse> {
    return api.get<SaleResponse>(`/sales/${id}`);
  },

  async getNotaVenta(id: number): Promise<string> {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'text/html',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/sales/${id}/nota`, { headers });
    if (!response.ok) {
      throw new Error('Error al obtener nota de venta');
    }
    return response.text();
  },

  async updateSale(id: number, input: SaleInput): Promise<SaleResponse> {
    const response = await api.patch<SaleResponse>(`/sales/${id}`, input);
    return response;
  },

  async previewExcel(file: File): Promise<WholesalePreviewResult> {
    const formData = new FormData();
    formData.append('archivo', file);
    const token = localStorage.getItem('auth_token');
    const baseUrl = API_BASE_URL;
    const response = await fetch(`${baseUrl}/sales/import-mayor/preview`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Error al procesar archivo' }));
      throw new Error(err.message || 'Error al procesar archivo');
    }
    return response.json();
  },

  async importExcel(file: File, meta: WholesaleImportMeta): Promise<SaleResponse> {
    const formData = new FormData();
    formData.append('archivo', file);
    if (meta.cliente) formData.append('cliente', JSON.stringify(meta.cliente));
    if (meta.requiereFactura) formData.append('requiereFactura', 'true');
    if (meta.lugarEntrega) formData.append('lugarEntrega', meta.lugarEntrega);
    if (meta.paraQuien) formData.append('paraQuien', meta.paraQuien);
    if (meta.locationId) formData.append('locationId', String(meta.locationId));
    if (meta.pagos) formData.append('pagos', JSON.stringify(meta.pagos));

    const token = localStorage.getItem('auth_token');
    const baseUrl = API_BASE_URL;
    const response = await fetch(`${baseUrl}/sales/import-mayor`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Error al importar venta' }));
      throw new Error(err.message || 'Error al importar venta');
    }
    return response.json();
  },
};

const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo', icon: '💵' },
  { id: 'qr', label: 'QR / Transferencia', icon: '📱' },
  { id: 'tarjeta', label: 'Tarjeta Débito/Crédito', icon: '💳' },
  { id: 'mixto', label: 'Mixto', icon: '🔄' },
] as const;

export type PaymentMethod = typeof PAYMENT_METHODS[number]['id'];

export function getPaymentMethods() {
  return PAYMENT_METHODS;
}

export function formatCurrency(amount: number): string {
  return `Bs ${amount.toFixed(2)}`;
}