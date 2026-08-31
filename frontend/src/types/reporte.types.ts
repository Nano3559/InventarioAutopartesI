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

export interface TopProducto {
  id: number;
  producto: string;
  marca: string;
  modelo: string;
  unidadesVendidas: number;
  totalVendido: number;
}

export interface ResumenSolicitudes {
  pendientes: number;
  enPreparacion: number;
  enviadas: number;
  total: number;
}

export interface DashboardResponse {
  inventario: ResumenInventario;
  ventas: ResumenVentas;
  topProductos: TopProducto[];
  solicitudes?: ResumenSolicitudes;
  solicitudesPendientes?: number;
}

export interface ReporteMensualItem {
  mes: number;
  nombreMes: string;
  total: number;
  cantidad: number;
  ticketPromedio: number;
}

export interface ReporteProveedorItem {
  proveedorId: number;
  nombre: string;
  pais: string;
  facturasCount: number;
  totalInvertido: number;
  unidadesCompradas: number;
}

export interface ReporteVentasFilters {
  desde?: string;
  hasta?: string;
  tiendaId?: number;
  tipo?: 'menor' | 'mayor';
  marca?: string;
}
