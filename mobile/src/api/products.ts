import { request, ApiError } from './client';
import type { Product, ProductFilters } from '../types/product';

export async function getProducts(filters: ProductFilters = {}, token?: string) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const queryString = query.toString();
  return request<Product[]>(`/products${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
  }, token);
}

export async function getProductStock(productId: number, token?: string) {
  return request<Array<{ locationId: number; ubicacion: string; tipo: string; cantidad: number }>>(`/products/${productId}/stock`, {}, token);
}

export async function createProduct(product: Partial<Product>, token?: string) {
  return request<Product>('/products', {
    method: 'POST',
    body: JSON.stringify(product),
  }, token);
}

export async function updateProduct(id: number, product: Partial<Product>, token?: string) {
  return request<Product>(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(product),
  }, token);
}

export async function deleteProduct(id: number, token?: string) {
  return request(`/products/${id}`, {
    method: 'DELETE',
  }, token);
}