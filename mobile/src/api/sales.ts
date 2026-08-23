import { request } from './client';

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

export interface SaleResponse {
  id: number;
  codigo: string;
  tipo: string;
  total: number;
  fecha: string;
  locationId: number;
  usuarioId: number;
  clienteId?: number;
  items: Array<{
    id: number;
    productId: number;
    cantidad: number;
    precio: number;
    subtotal: number;
    product: {
      id: number;
      producto: string;
      marca: string;
      modelo: string;
    };
  }>;
  pagos: Array<{ id: number; metodo: string; monto: number }>;
  cliente?: { id: number; nombre: string; ciNit?: string; celular?: string };
  location?: { id: number; nombre: string };
  usuario?: { id: number; nombre: string };
}

export async function createSale(input: SaleInput, token: string): Promise<SaleResponse> {
  return request<SaleResponse>('/sales', {
    method: 'POST',
    body: JSON.stringify(input),
  }, token);
}

export async function getSales(token: string, params?: {
  desde?: string;
  hasta?: string;
  tiendaId?: number;
  tipo?: string;
  search?: string;
}): Promise<SaleResponse[]> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) searchParams.append(key, String(val));
    });
  }
  const query = searchParams.toString();
  return request<SaleResponse[]>(`/sales${query ? `?${query}` : ''}`, {}, token);
}

export async function getSaleById(id: number, token: string): Promise<SaleResponse> {
  return request<SaleResponse>(`/sales/${id}`, {}, token);
}

export async function getNotaVenta(id: number, token: string): Promise<string> {
  const response = await fetch(`${request}/${id}/nota`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.text();
}

export const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo', icon: '💵' },
  { id: 'qr', label: 'QR / Transferencia', icon: '📱' },
  { id: 'tarjeta', label: 'Tarjeta', icon: '💳' },
  { id: 'mixto', label: 'Mixto', icon: '🔄' },
] as const;

export type PaymentMethod = typeof PAYMENT_METHODS[number]['id'];

export function formatCurrency(amount: number): string {
  return `Bs ${amount.toFixed(2)}`;
}