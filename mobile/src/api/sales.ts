import { request, ApiError } from './client';
import { config } from '../config';
import type { Product } from '../types/product';

export interface SaleItem {
  productId: number;
  cantidad: number;
  precio: number;
}

export interface PaymentInput {
  metodo: string;
  cantidad: number;
}

export interface ClienteInput {
  nombre: string;
  ciNit?: string;
  celular?: string;
}

export interface SaleInput {
  tipo?: 'menor' | 'mayor';
  items: SaleItem[];
  pagos: { metodo: string; monto: number }[];
  cliente?: ClienteInput;
  requiereFactura?: boolean;
  lugarEntrega?: string;
  paraQuien?: string;
  locationId?: number;
}

export interface Sale {
  id: number;
  codigo: string;
  fecha: string;
  tipo: 'menor' | 'mayor';
  total: number;
  requiereFactura: boolean;
  lugarEntrega?: string;
  paraQuien?: string;
  locationId: number;
  usuarioId: number;
  clienteId?: number;
  items: SaleDetail[];
  pagos: PaymentDetail[];
}

export interface SaleDetail {
  id: number;
  saleId: number;
  productId: number;
  cantidad: number;
  precio: number;
  subtotal: number;
  product: Product;
}

export interface PaymentDetail {
  id: number;
  saleId: number;
  metodo: string;
  monto: number;
}

export async function createSale(input: SaleInput, token: string): Promise<Sale> {
  return request<Sale>('/sales', {
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
}): Promise<Sale[]> {
  const query = new URLSearchParams();
  if (params?.desde) query.set('desde', params.desde);
  if (params?.hasta) query.set('hasta', params.hasta);
  if (params?.tiendaId) query.set('tiendaId', String(params.tiendaId));
  if (params?.tipo) query.set('tipo', params.tipo);
  if (params?.search) query.set('search', params.search);
  const qs = query.toString();
  return request<Sale[]>(`/sales${qs ? `?${qs}` : ''}`, {}, token);
}

export async function getSale(id: number, token: string): Promise<Sale> {
  return request<Sale>(`/sales/${id}`, {}, token);
}

export async function getNotaVenta(id: number, token: string): Promise<string> {
  const response = await fetch(`${config.apiUrl}/sales/${id}/nota`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new ApiError('Error al obtener nota de venta', response.status);
  return response.text();
}