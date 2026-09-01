export interface Product {
  id: number;
  producto: string;
  fabricante: string;
  empresaFabricante?: string;
  marca: string;
  modelo: string;
  anio?: string;
  detalle?: string;
  codigoOem?: string;
  codigoFabrica: string;
  imagen?: string;
  costo: number;
  precio1?: number;
  precio2?: number;
  precioMayor?: number;
  stockTotal: number;
  stockByLocation?: Record<number, number>;
  stockMinimo: number;
  activo: boolean;
  createdAt: string;
}

export interface ProductFilters {
  search?: string;
  marca?: string;
  fabricante?: string;
  producto?: string;
  modelo?: string;
  anio?: string;
  codigoOem?: string;
  codigoFabrica?: string;
  locationId?: number;
}