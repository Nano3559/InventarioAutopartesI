import { api } from '../api/client';
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

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const res = await fetch(`${baseUrl}/products/${id}/image`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error('Error al subir imagen');
    }

    return res.json();
  },

  async deleteProduct(id: number): Promise<void> {
    await api.delete(`/products/${id}`);
  },
};
