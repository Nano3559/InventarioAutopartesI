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

export interface TopProducto {
  id: number;
  producto: string;
  marca: string;
  modelo: string;
  unidadesVendidas: number;
  totalVendido: number;
}

export interface ResumenVentas {
  hoy: VentasPeriodo;
  mes: VentasPeriodo;
  porTienda: VentasPorTienda[];
  porMarca: VentasPorMarca[];
}

export interface DashboardData {
  inventario: ResumenInventario;
  ventas: ResumenVentas;
  topProductos: TopProducto[];
  solicitudesPendientes: number;
}

export interface ReporteMensualItem {
  mes: number;
  nombreMes: string;
  total: number;
  cantidad: number;
  ticketPromedio: number;
}

export async function getDashboard(token?: string): Promise<DashboardData> {
  return request<DashboardData>('/reportes/dashboard', {}, token);
}

export async function getReporteMensual(anio: number, token?: string): Promise<ReporteMensualItem[]> {
  return request<ReporteMensualItem[]>(`/reportes/mensual?anio=${anio}`, {}, token);
}
