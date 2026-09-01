import { request, ApiError } from './client';
import { config } from '../config';
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

export async function searchByImage(
  fileUri: string,
  fileName: string,
  mimeType: string,
  token?: string,
  limit = 5,
): Promise<ImageSearchResult[]> {
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);
  formData.append('limit', String(limit));

  let response: Response;
  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    response = await fetch(`${config.apiUrl}/products/search-by-image`, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Verifique su conexión.', 0);
  }

  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(payload.message)) {
        message = payload.message.join(', ');
      } else if (payload.message) {
        message = payload.message;
      }
    } catch {
      // respuesta sin cuerpo JSON
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as ImageSearchResult[];
}