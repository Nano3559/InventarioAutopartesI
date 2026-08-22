import { request, ApiError } from './client';
import type { Product, ProductFilters } from '../types/product';

export async function getProducts(filters: ProductFilters = {}) {
  return request<Product[]>('/products', {
    method: 'GET',
  });
}

export async function getProductStock(productId: number) {
  return request<Array<{ locationId: number; ubicacion: string; tipo: string; cantidad: number }>>(`/products/${productId}/stock`);
}

export async function createProduct(product: Partial<Product>) {
  return request<Product>('/products', {
    method: 'POST',
    body: JSON.stringify(product),
  });
}

export async function updateProduct(id: number, product: Partial<Product>) {
  return request<Product>(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(product),
  });
}

export async function deleteProduct(id: number) {
  return request(`/products/${id}`, {
    method: 'DELETE',
  });
}