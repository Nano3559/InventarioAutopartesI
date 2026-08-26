import { request } from './client';

export interface StockUbicacion {
  locationId: number;
  nombre: string;
  productos: number;
  totalStock: number;
}

export interface ResumenInventario {
  totalProductos: number;
  sinStock: number;
  stockBajo: number;
  valorInventario: number;
  stockPorTienda: StockUbicacion[];
  stockPorAlmacen: StockUbicacion[];
}

export interface VentasPeriodo {
  cantidad: number;
  total: number;
}

export interface VentasPorTienda extends VentasPeriodo {
  locationId: number;
  nombre: string;
}

export interface VentasPorMarca {
  marca: string;
  unidades: number;
  total: number;
}

export interface VentasPorVehiculo {
  marca: string;
  modelo: string;
  unidades: number;
  total: number;
}

export interface ResumenVentas {
  hoy: VentasPeriodo;
  mes: VentasPeriodo;
  porTienda: VentasPorTienda[];
  porMarca: VentasPorMarca[];
  porVehiculo: VentasPorVehiculo[];
}

export interface DashboardResponse {
  inventario: ResumenInventario;
  ventas: ResumenVentas;
  solicitudesPendientes: number;
}

export async function getDashboard(token?: string): Promise<DashboardResponse> {
  return request<DashboardResponse>('/reportes/dashboard', { method: 'GET' }, token);
}

export interface ReporteVentasFilters {
  marca?: string;
  modelo?: string;
  mes?: string;
  tiendaId?: number;
  productoId?: number;
  producto?: string;
}

export interface ReporteVentasItem {
  ventaId: number;
  codigo: string;
  fecha: string;
  tipo: string;
  tienda: string;
  productId: number;
  producto: string;
  fabricante: string;
  marca: string;
  modelo: string;
  anio: string | null;
  cantidad: number;
  precio: number;
  subtotal: number;
}

export interface ReporteVentasResponse {
  filtros: ReporteVentasFilters;
  resumen: { ventas: number; unidades: number; total: number };
  items: ReporteVentasItem[];
}

export async function getReporteVentas(
  filters: ReporteVentasFilters = {},
  token?: string
): Promise<ReporteVentasResponse> {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return request<ReporteVentasResponse>(
    `/reportes/ventas${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
    token
  );
}

export interface ReporteMensualFila {
  mes: number;
  tiendaId: number;
  tienda: string;
  ventas: number;
  unidades: number;
  total: number;
  costo: number;
  margen: number;
}

export async function getReporteMensual(anio?: number, token?: string): Promise<ReporteMensualFila[]> {
  const query = anio ? `?anio=${anio}` : '';
  return request<ReporteMensualFila[]>(
    `/reportes/mensual${query}`,
    { method: 'GET' },
    token
  );
}

export interface ReporteProveedoresFila {
  proveedorId: number;
  proveedor: string;
  facturas: number;
  montoTotal: number;
  montoTotalBs: number;
}

export async function getReporteProveedores(token?: string): Promise<ReporteProveedoresFila[]> {
  return request<ReporteProveedoresFila[]>('/reportes/proveedores', { method: 'GET' }, token);
}