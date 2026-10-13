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
  /**
   * El backend de `/reportes/dashboard` **no** lo envía hoy (docs/api.md:
   * "inventario, ventas, solicitudes"), por eso es opcional: la sección Top
   * Productos de ReportesScreen queda oculta hasta que lo agregue el backend.
   */
  topProductos?: TopProducto[];
  solicitudesPendientes: number;
}

export interface ReporteMensualItem {
  mes: number;
  nombreMes: string;
  total: number;
  cantidad: number;
  ticketPromedio: number;
}

/**
 * Fila cruda que devuelve `GET /reportes/mensual`: el backend agrupa por
 * **(mes, tienda)**, así que un mismo mes aparece una vez por cada tienda que
 * vendió en él. Los nombres de campo tampoco coinciden con el contrato de la
 * UI (`unidades` en vez de `cantidad`, `ventas` en vez de un conteo directo).
 */
interface ReporteMensualFilaBackend {
  mes: number;
  tiendaId: number;
  tienda: string;
  ventas: number;
  unidades: number;
  total: number;
  costo: number;
  margen: number;
}

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export async function getDashboard(token?: string): Promise<DashboardData> {
  return request<DashboardData>('/reportes/dashboard', {}, token);
}

/**
 * Devuelve el reporte **un mes por item**, como lo espera el gráfico de
 * ReportesScreen.
 *
 * El endpoint entrega una fila por (mes, tienda); agrupar acá por mes cumple
 * dos cosas: evita las keys duplicadas (`key={item.mes}` rompía con dos filas
 * del mismo mes) y suma las 7 tiendas para mostrar el total real del mes,
 * en vez de barras parciales por tienda repetidas.
 */
export async function getReporteMensual(anio: number, token?: string): Promise<ReporteMensualItem[]> {
  const filas = await request<ReporteMensualFilaBackend[]>(
    `/reportes/mensual?anio=${anio}`,
    {},
    token,
  );

  const porMes = new Map<number, ReporteMensualItem>();
  for (const fila of filas) {
    if (fila == null || fila.mes == null) continue;
    const mes = Number(fila.mes);
    const acumulado = porMes.get(mes) ?? {
      mes,
      nombreMes: NOMBRES_MES[mes - 1] ?? '',
      total: 0,
      cantidad: 0,
      ticketPromedio: 0,
    };
    acumulado.total += Number(fila.total) || 0;
    // `ventas` = nº de ventas del mes en esa tienda; es lo que la UI pinta
    // como "cantidad" de ventas del mes.
    acumulado.cantidad += Number(fila.ventas) || 0;
    porMes.set(mes, acumulado);
  }

  return Array.from(porMes.values())
    .sort((a, b) => a.mes - b.mes)
    .map((m) => ({
      ...m,
      total: Math.round(m.total * 100) / 100,
      ticketPromedio: m.cantidad > 0
        ? Math.round((m.total / m.cantidad) * 100) / 100
        : 0,
    }));
}
