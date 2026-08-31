import { api } from '../api/client';
import type {
  DashboardResponse,
  ReporteMensualItem,
  ReporteProveedorItem,
  ReporteVentasFilters,
} from '../types/reporte.types';

export type { DashboardResponse as DashboardData };

const MOCK_DASHBOARD_FALLBACK: DashboardResponse = {
  inventario: {
    totalProductos: 37,
    sinStock: 2,
    stockBajo: 5,
    valorInventario: 48520,
    stockPorTienda: [
      { locationId: 5, nombre: 'Tienda 1 (Av. Principal)', productos: 24, totalStock: 45 },
      { locationId: 6, nombre: 'Tienda 2 (Comercial Repuestos)', productos: 20, totalStock: 38 },
      { locationId: 7, nombre: 'Tienda 3 (Zona Sur)', productos: 18, totalStock: 29 },
    ],
    stockPorAlmacen: [
      { locationId: 1, nombre: 'Almacén 1 (Central El Alto)', productos: 35, totalStock: 120 },
      { locationId: 2, nombre: 'Almacén 2 (Norte)', productos: 28, totalStock: 85 },
      { locationId: 3, nombre: 'Almacén 3 (Sur)', productos: 22, totalStock: 60 },
      { locationId: 4, nombre: 'Almacén 4 (Distribución)', productos: 30, totalStock: 95 },
    ],
  },
  ventas: {
    hoy: { cantidad: 8, total: 3240 },
    mes: { cantidad: 142, total: 58920 },
    porTienda: [
      { locationId: 5, nombre: 'Tienda 1 (Av. Principal)', cantidad: 65, total: 27400 },
      { locationId: 6, nombre: 'Tienda 2 (Comercial Repuestos)', cantidad: 48, total: 19820 },
      { locationId: 7, nombre: 'Tienda 3 (Zona Sur)', cantidad: 29, total: 11700 },
    ],
    porMarca: [
      { marca: 'Toyota', unidades: 72, total: 29500 },
      { marca: 'Nissan', unidades: 38, total: 15420 },
      { marca: 'Suzuki', unidades: 20, total: 8100 },
      { marca: 'Hyundai', unidades: 12, total: 5900 },
    ],
    porVehiculo: [
      { marca: 'Toyota', modelo: 'Hilux', unidades: 42, total: 17800 },
      { marca: 'Toyota', modelo: 'Corolla', unidades: 20, total: 7900 },
      { marca: 'Nissan', modelo: 'Sentra', unidades: 22, total: 9100 },
      { marca: 'Nissan', modelo: 'Versa', unidades: 16, total: 6320 },
      { marca: 'Suzuki', modelo: 'Grand Vitara', unidades: 20, total: 8100 },
      { marca: 'Hyundai', modelo: 'Tucson', unidades: 12, total: 5900 },
    ],
  },
  topProductos: [
    { id: 1, producto: 'Farol delantero derecho', marca: 'Toyota', modelo: 'Hilux', unidadesVendidas: 18, totalVendido: 8820 },
    { id: 2, producto: 'Pastillas de freno delanteras', marca: 'Toyota', modelo: 'Corolla', unidadesVendidas: 24, totalVendido: 7680 },
    { id: 3, producto: 'Disco de freno ventilado', marca: 'Toyota', modelo: 'Rav4', unidadesVendidas: 12, totalVendido: 6960 },
    { id: 4, producto: 'Parachoques delantero', marca: 'Nissan', modelo: 'Sentra', unidadesVendidas: 10, totalVendido: 5600 },
    { id: 5, producto: 'Amortiguador delantero gas', marca: 'Nissan', modelo: 'Versa', unidadesVendidas: 14, totalVendido: 5880 },
  ],
  solicitudes: {
    pendientes: 3,
    enPreparacion: 2,
    enviadas: 4,
    total: 9,
  },
};

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MOCK_MENSUAL_FALLBACK: ReporteMensualItem[] = [
  { mes: 1, nombreMes: 'Enero', total: 42000, cantidad: 110, ticketPromedio: 381.8 },
  { mes: 2, nombreMes: 'Febrero', total: 39500, cantidad: 102, ticketPromedio: 387.2 },
  { mes: 3, nombreMes: 'Marzo', total: 46800, cantidad: 125, ticketPromedio: 374.4 },
  { mes: 4, nombreMes: 'Abril', total: 44200, cantidad: 118, ticketPromedio: 374.5 },
  { mes: 5, nombreMes: 'Mayo', total: 51000, cantidad: 135, ticketPromedio: 377.7 },
  { mes: 6, nombreMes: 'Junio', total: 48900, cantidad: 128, ticketPromedio: 382.0 },
  { mes: 7, nombreMes: 'Julio', total: 53400, cantidad: 140, ticketPromedio: 381.4 },
  { mes: 8, nombreMes: 'Agosto', total: 58920, cantidad: 142, ticketPromedio: 414.9 },
  { mes: 9, nombreMes: 'Septiembre', total: 0, cantidad: 0, ticketPromedio: 0 },
  { mes: 10, nombreMes: 'Octubre', total: 0, cantidad: 0, ticketPromedio: 0 },
  { mes: 11, nombreMes: 'Noviembre', total: 0, cantidad: 0, ticketPromedio: 0 },
  { mes: 12, nombreMes: 'Diciembre', total: 0, cantidad: 0, ticketPromedio: 0 },
];

const MOCK_PROVEEDORES_FALLBACK: ReporteProveedorItem[] = [
  { proveedorId: 1, nombre: 'Denso Corporation', pais: 'Japón', facturasCount: 4, totalInvertido: 24500, unidadesCompradas: 65 },
  { proveedorId: 2, nombre: 'Bosch Autopartes Latam', pais: 'Alemania', facturasCount: 3, totalInvertido: 18200, unidadesCompradas: 52 },
  { proveedorId: 3, nombre: 'Brembo Brake Systems', pais: 'Italia', facturasCount: 2, totalInvertido: 12400, unidadesCompradas: 28 },
  { proveedorId: 4, nombre: 'Tong Yang Group', pais: 'Taiwán', facturasCount: 3, totalInvertido: 15600, unidadesCompradas: 34 },
  { proveedorId: 5, nombre: 'Depo Auto Lamps', pais: 'Taiwán', facturasCount: 4, totalInvertido: 19800, unidadesCompradas: 50 },
  { proveedorId: 6, nombre: 'Importadora Andina Repuestos', pais: 'Bolivia', facturasCount: 2, totalInvertido: 8900, unidadesCompradas: 22 },
];

export const reportesService = {
  async getDashboard(): Promise<DashboardResponse> {
    try {
      const data = await api.get<DashboardResponse>('/reportes/dashboard');
      if (data && data.inventario && data.ventas) return data;
      return MOCK_DASHBOARD_FALLBACK;
    } catch (err) {
      console.warn('Backend /reportes/dashboard inaccesible, usando mock:', err);
      return MOCK_DASHBOARD_FALLBACK;
    }
  },

  async getReporteVentas(filters: ReporteVentasFilters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.desde) params.append('desde', filters.desde);
      if (filters.hasta) params.append('hasta', filters.hasta);
      if (filters.tiendaId) params.append('tiendaId', String(filters.tiendaId));
      if (filters.tipo) params.append('tipo', filters.tipo);
      if (filters.marca) params.append('marca', filters.marca);

      const qs = params.toString();
      const data = await api.get(`/reportes/ventas${qs ? `?${qs}` : ''}`);
      return data;
    } catch (err) {
      console.warn('Backend /reportes/ventas falló:', err);
      return null;
    }
  },

  async getReporteMensual(anio?: number): Promise<ReporteMensualItem[]> {
    try {
      const targetYear = anio || new Date().getFullYear();
      const data = await api.get<ReporteMensualItem[]>(`/reportes/mensual?anio=${targetYear}`);
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item) => ({
          ...item,
          nombreMes: item.nombreMes || NOMBRES_MESES[(item.mes || 1) - 1],
        }));
      }
      return MOCK_MENSUAL_FALLBACK;
    } catch (err) {
      console.warn('Backend /reportes/mensual falló, usando datos simulados:', err);
      return MOCK_MENSUAL_FALLBACK;
    }
  },

  async getReporteProveedores(): Promise<ReporteProveedorItem[]> {
    try {
      const data = await api.get<ReporteProveedorItem[]>('/reportes/proveedores');
      if (Array.isArray(data) && data.length > 0) return data;
      return MOCK_PROVEEDORES_FALLBACK;
    } catch (err) {
      console.warn('Backend /reportes/proveedores falló, usando catálogo local:', err);
      return MOCK_PROVEEDORES_FALLBACK;
    }
  },
};
