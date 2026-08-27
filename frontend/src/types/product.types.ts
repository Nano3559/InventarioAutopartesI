export interface LocationStock {
  locationId: number;
  ubicacion: string;
  tipo: 'almacen' | 'tienda';
  cantidad: number;
}

export interface Product {
  id: number;
  producto: string;
  fabricante: string;
  empresaFabricante?: string | null;
  marca: string;
  modelo: string;
  anio?: string | null;
  detalle?: string | null;
  codigoOem?: string | null;
  codigoFabrica: string;
  imagen?: string | null;
  costo: number;
  precio1?: number | null;
  precio2?: number | null;
  precioMayor?: number | null;
  stockTotal: number;
  stockMinimo?: number;
  stock?: LocationStock[];
  activo: boolean;
  createdAt?: string;
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
}

export interface CreateProductDto {
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
  stockMinimo?: number;
  stock?: Record<number, number>; // locationId -> cantidad
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

export interface LocationItem {
  id: number;
  nombre: string;
  tipo: 'almacen' | 'tienda';
  numero: number;
  codigo?: string;
  ubicacion?: string;
  horarios?: string;
  contacto?: string;
  ciudad?: string;
  direccion?: string;
  telefono?: string;
}
