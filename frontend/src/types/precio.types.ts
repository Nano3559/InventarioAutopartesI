export interface FilaPrecio {
  id: number;
  producto: string;
  fabricante: string;
  marca: string;
  modelo: string;
  anio: string | null;
  codigoOem: string | null;
  codigoFabrica: string;
  costo: number;
  precio1: number | null;
  precio2: number | null;
  precioMayor: number | null;
  stockTotal: number;
}

export interface UpdatePreciosDto {
  precio1?: number | null;
  precio2?: number | null;
  precioMayor?: number | null;
}

export interface PrecioFilters {
  search?: string;
  marca?: string;
  fabricante?: string;
  modelo?: string;
}

export interface BulkMarginConfig {
  marca?: string;
  margenP1: number; // Ej. 35 para +35%
  margenP2: number; // Ej. 20 para +20%
  margenMayor: number; // Ej. 15 para +15%
}
