import { api } from '../api/client';
import type {
  DashboardResponse,
  ReporteMensualItem,
  ReporteProveedorItem,
  ReporteVentasFilters,
} from '../types/reporte.types';

export type { DashboardResponse as DashboardData };

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const reportesService = {
  async getDashboard(): Promise<DashboardResponse> {
    const data = await api.get<DashboardResponse>('/reportes/dashboard');
    if (!data || !data.inventario || !data.ventas) {
      throw new Error('Respuesta inválida del servidor');
    }
    return data;
  },

  async getReporteVentas(filters: ReporteVentasFilters = {}) {
    const params = new URLSearchParams();
    if (filters.desde) params.append('desde', filters.desde);
    if (filters.hasta) params.append('hasta', filters.hasta);
    if (filters.tiendaId) params.append('tiendaId', String(filters.tiendaId));
    if (filters.tipo) params.append('tipo', filters.tipo);
    if (filters.marca) params.append('marca', filters.marca);

    const qs = params.toString();
    const data = await api.get(`/reportes/ventas${qs ? `?${qs}` : ''}`);
    return data;
  },

  async getReporteMensual(anio?: number): Promise<ReporteMensualItem[]> {
    const targetYear = anio || new Date().getFullYear();
    const data = await api.get<ReporteMensualItem[]>(`/reportes/mensual?anio=${targetYear}`);
    const items = Array.isArray(data) ? data : [];
    return items.map((item) => ({
      ...item,
      nombreMes: item.nombreMes || NOMBRES_MESES[(item.mes || 1) - 1],
    }));
  },

  async getReporteProveedores(): Promise<ReporteProveedorItem[]> {
    const data = await api.get<ReporteProveedorItem[]>('/reportes/proveedores');
    return Array.isArray(data) ? data : [];
  },
};