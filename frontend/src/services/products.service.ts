import { api, API_BASE_URL } from '../api/client';
import type {
  Product,
  ProductFilters,
  CreateProductDto,
  UpdateProductDto,
  LocationStock,
} from '../types/product.types';

export const productsService = {
  async getProducts(filters: ProductFilters = {}): Promise<Product[]> {
    const data = await api.get<Product[]>('/products', {
      params: {
        search: filters.search,
        marca: filters.marca,
        fabricante: filters.fabricante,
        producto: filters.producto,
        modelo: filters.modelo,
        anio: filters.anio,
        codigoOem: filters.codigoOem,
        codigoFabrica: filters.codigoFabrica,
        activo: filters.activo,
      },
    });
    return Array.isArray(data) ? data : [];
  },

  async getProductStock(productId: number): Promise<LocationStock[]> {
    const data = await api.get<LocationStock[]>(`/products/${productId}/stock`);
    return Array.isArray(data) ? data : [];
  },

  async createProduct(dto: CreateProductDto): Promise<Product> {
    return api.post<Product>('/products', dto);
  },

  async updateProduct(id: number, dto: UpdateProductDto): Promise<Product> {
    return api.patch<Product>(`/products/${id}`, dto);
  },

  async getProductById(id: number): Promise<Product> {
    return api.get<Product>(`/products/${id}`);
  },

  async uploadProductImage(id: number, file: File): Promise<{ imagen: string }> {
    const token = localStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = API_BASE_URL;
    const res = await fetch(`${baseUrl}/products/${id}/image`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      let errorMsg = 'Error al subir imagen';
      try {
        const errorData = await res.json();
        errorMsg = errorData?.message || errorMsg;
        if (Array.isArray(errorMsg)) errorMsg = errorMsg.join(', ');
      } catch {
        errorMsg = `Error HTTP ${res.status}: ${res.statusText}`;
      }
      throw new Error(errorMsg);
    }

    return res.json();
  },

  async deleteProduct(id: number): Promise<void> {
    await api.delete(`/products/${id}`);
  },

  async adjustStock(
    productId: number,
    locationId: number,
    cantidad: number,
  ): Promise<{ locationId: number; cantidad: number }> {
    return api.patch(`/products/${productId}/stock`, { locationId, cantidad });
  },

  async toggleActive(
    id: number,
  ): Promise<{ id: number; activo: boolean }> {
    return api.patch(`/products/${id}/toggle-active`);
  },

  async searchByImage(file: File, limit = 5): Promise<ImageSearchResult[]> {
    const token = localStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('file', file);
    if (limit) formData.append('limit', String(limit));

    const baseUrl = API_BASE_URL;
    const res = await fetch(`${baseUrl}/products/search-by-image`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      let errorMsg = 'Error al buscar productos por imagen';
      try {
        const errorData = await res.json();
        errorMsg = errorData?.message || errorMsg;
        if (Array.isArray(errorMsg)) errorMsg = errorMsg.join(', ');
      } catch {
        errorMsg = `Error HTTP ${res.status}: ${res.statusText}`;
      }
      throw new Error(errorMsg);
    }

    return res.json();
  },
};

export interface ImageSearchResult {
  product: Product;
  similitud: number;
  stockTotal: number;
}
