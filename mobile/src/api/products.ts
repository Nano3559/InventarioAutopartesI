import { request, requestForm, appendFile } from './client';
import type { Product, ProductFilters } from '../types/product';

export interface ImageSearchResult {
  product: Product;
  similitud: number;
  stockTotal: number;
}

export async function getProducts(filters: ProductFilters = {}, token?: string) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  const queryString = query.toString();
  return request<Product[]>(`/products${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
  }, token);
}

export async function getProductById(id: number, token?: string) {
  return request<Product>(`/products/${id}`, { method: 'GET' }, token);
}

/**
 * Flujo A del Hito 3: identifica el producto a partir de la etiqueta Code128.
 * El backend responde 404 si el código no existe o el producto está inactivo.
 */
export async function getProductByBarcode(codigo: string, token?: string) {
  return request<Product>(`/products/by-barcode/${encodeURIComponent(codigo.trim())}`, { method: 'GET' }, token);
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

export async function adjustStock(
  productId: number,
  locationId: number,
  cantidad: number,
  token?: string,
) {
  return request<{ locationId: number; cantidad: number }>(
    `/products/${productId}/stock`,
    {
      method: 'PATCH',
      body: JSON.stringify({ locationId, cantidad }),
    },
    token,
  );
}

export async function toggleActive(
  id: number,
  token?: string,
): Promise<{ id: number; activo: boolean }> {
  return request(`/products/${id}/toggle-active`, {
    method: 'PATCH',
  }, token);
}

export async function uploadProductImage(
  id: number,
  fileUri: string,
  fileName: string,
  mimeType: string,
  token?: string,
): Promise<{ imagen: string }> {
  const form = new FormData();
  appendFile(form, 'file', { uri: fileUri, name: fileName, type: mimeType });
  return requestForm<{ imagen: string }>(
    `/products/${id}/image`,
    form,
    token,
  );
}

export async function searchByImage(
  fileUri: string,
  fileName: string,
  mimeType: string,
  token?: string,
  limit = 5,
): Promise<ImageSearchResult[]> {
  const form = new FormData();
  appendFile(form, 'file', { uri: fileUri, name: fileName, type: mimeType });
  form.append('limit', String(limit));
  return requestForm<ImageSearchResult[]>(
    '/products/search-by-image',
    form,
    token,
  );
}