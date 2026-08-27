import { api } from '../api/client';

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

export interface ResumenVentas {
  hoy: VentasPeriodo;
  mes: VentasPeriodo;
  porTienda: VentasPorTienda[];
}

export interface DashboardData {
  inventario: ResumenInventario;
  ventas: ResumenVentas;
  solicitudesPendientes: number;
}

export const reportesService = {
  async getDashboard(): Promise<DashboardData> {
    return api.get<DashboardData>('/reportes/dashboard');
  },
};
