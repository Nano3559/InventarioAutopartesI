import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Product } from '../entities/product.entity';
import { Inventory } from '../entities/inventory.entity';
import { Location } from '../entities/location.entity';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { Solicitud } from '../entities/solicitud.entity';
import { Factura } from '../entities/factura.entity';

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

export interface ReporteProveedoresFila {
  proveedorId: number;
  proveedor: string;
  facturas: number;
  montoTotal: number;
  montoTotalBs: number;
}

@Injectable()
export class ReportesService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  private saleRepo() {
    return this.dataSource.getRepository(Sale);
  }

  private saleItemRepo() {
    return this.dataSource.getRepository(SaleItem);
  }

  async dashboard(): Promise<DashboardResponse> {
    const [inventario, ventas, solicitudesPendientes] = await Promise.all([
      this.resumenInventario(),
      this.resumenVentas(),
      this.dataSource
        .getRepository(Solicitud)
        .count({ where: { estado: 'Pendiente' } }),
    ]);
    return { inventario, ventas, solicitudesPendientes };
  }

  async reporteVentas(
    filters: ReporteVentasFilters,
  ): Promise<ReporteVentasResponse> {
    const qb = this.saleItemRepo()
      .createQueryBuilder('si')
      .innerJoin('si.sale', 's')
      .innerJoin('si.product', 'p')
      .innerJoin('s.location', 'l')
      .select('s.id', 'ventaId')
      .addSelect('s.codigo', 'codigo')
      .addSelect('s.fecha', 'fecha')
      .addSelect('s.tipo', 'tipo')
      .addSelect('l.nombre', 'tienda')
      .addSelect('p.id', 'productId')
      .addSelect('p.producto', 'producto')
      .addSelect('p.fabricante', 'fabricante')
      .addSelect('p.marca', 'marca')
      .addSelect('p.modelo', 'modelo')
      .addSelect('p.anio', 'anio')
      .addSelect('si.cantidad', 'cantidad')
      .addSelect('si.precio', 'precio')
      .addSelect('si.subtotal', 'subtotal')
      .orderBy('s.fecha', 'DESC');

    if (filters.marca)
      qb.andWhere('p.marca = :marca', { marca: filters.marca });
    if (filters.modelo)
      qb.andWhere('p.modelo LIKE :modelo', { modelo: `%${filters.modelo}%` });
    if (filters.mes)
      qb.andWhere("to_char(s.fecha, 'YYYY-MM') = :mes", { mes: filters.mes });
    if (filters.tiendaId)
      qb.andWhere('s.locationId = :tiendaId', { tiendaId: filters.tiendaId });
    if (filters.productoId)
      qb.andWhere('p.id = :productoId', { productoId: filters.productoId });
    if (filters.producto)
      qb.andWhere('p.producto LIKE :producto', {
        producto: `%${filters.producto}%`,
      });

    const rows = await qb.getRawMany<{
      ventaId: number;
      codigo: string;
      fecha: Date;
      tipo: string;
      tienda: string;
      productId: number;
      producto: string;
      fabricante: string;
      marca: string;
      modelo: string;
      anio: string | null;
      cantidad: string;
      precio: string;
      subtotal: string;
    }>();

    const items: ReporteVentasItem[] = rows.map((r) => ({
      ventaId: Number(r.ventaId),
      codigo: r.codigo,
      fecha: new Date(r.fecha).toISOString(),
      tipo: r.tipo,
      tienda: r.tienda,
      productId: Number(r.productId),
      producto: r.producto,
      fabricante: r.fabricante,
      marca: r.marca,
      modelo: r.modelo,
      anio: r.anio,
      cantidad: Number(r.cantidad),
      precio: Number(r.precio),
      subtotal: Number(r.subtotal),
    }));

    const ventasUnicas = new Set(items.map((i) => i.ventaId));
    const resumen = {
      ventas: ventasUnicas.size,
      unidades: items.reduce((a, i) => a + i.cantidad, 0),
      total: this.round2(items.reduce((a, i) => a + i.subtotal, 0)),
    };

    return { filtros: filters, resumen, items };
  }

  async reporteMensual(anio: number): Promise<ReporteMensualFila[]> {
    const rows = await this.saleItemRepo()
      .createQueryBuilder('si')
      .innerJoin('si.sale', 's')
      .innerJoin('si.product', 'p')
      .innerJoin('s.location', 'l')
      .select('EXTRACT(MONTH FROM s.fecha)', 'mes')
      .addSelect('l.id', 'tiendaId')
      .addSelect('l.nombre', 'tienda')
      .addSelect('COUNT(DISTINCT s.id)', 'ventas')
      .addSelect('SUM(si.cantidad)', 'unidades')
      .addSelect('COALESCE(SUM(si.subtotal), 0)', 'total')
      .addSelect('COALESCE(SUM(si.cantidad * p.costo), 0)', 'costo')
      .where('EXTRACT(YEAR FROM s.fecha) = :anio', { anio })
      .groupBy('EXTRACT(MONTH FROM s.fecha)')
      .addGroupBy('l.id')
      .addGroupBy('l.nombre')
      .orderBy('mes', 'ASC')
      .addOrderBy('l.nombre', 'ASC')
      .getRawMany<{
        mes: string;
        tiendaId: number;
        tienda: string;
        ventas: string;
        unidades: string;
        total: string;
        costo: string;
      }>();

    return rows.map((r) => {
      const total = Number(r.total);
      const costo = Number(r.costo);
      return {
        mes: Number(r.mes),
        tiendaId: Number(r.tiendaId),
        tienda: r.tienda,
        ventas: Number(r.ventas),
        unidades: Number(r.unidades),
        total: this.round2(total),
        costo: this.round2(costo),
        margen: this.round2(total - costo),
      };
    });
  }

  async reporteProveedores(): Promise<ReporteProveedoresFila[]> {
    const rows = await this.dataSource
      .getRepository(Factura)
      .createQueryBuilder('f')
      .innerJoin('f.proveedor', 'pr')
      .select('pr.id', 'proveedorId')
      .addSelect('pr.nombre', 'proveedor')
      .addSelect('COUNT(f.id)', 'facturas')
      .addSelect('COALESCE(SUM(f.monto), 0)', 'montoTotal')
      .addSelect('COALESCE(SUM(f.monto * f.tipoCambio), 0)', 'montoTotalBs')
      .groupBy('pr.id')
      .addGroupBy('pr.nombre')
      .orderBy('montoTotalBs', 'DESC')
      .getRawMany<{
        proveedorId: number;
        proveedor: string;
        facturas: string;
        montoTotal: string;
        montoTotalBs: string;
      }>();

    return rows.map((r) => ({
      proveedorId: Number(r.proveedorId),
      proveedor: r.proveedor,
      facturas: Number(r.facturas),
      montoTotal: this.round2(Number(r.montoTotal)),
      montoTotalBs: this.round2(Number(r.montoTotalBs)),
    }));
  }

  private async resumenInventario(): Promise<ResumenInventario> {
    const stockRows = await this.dataSource
      .getRepository(Product)
      .createQueryBuilder('p')
      .leftJoin(Inventory, 'i', 'i.productId = p.id')
      .select('p.id', 'id')
      .addSelect('p.costo', 'costo')
      .addSelect('p.stockMinimo', 'stockMinimo')
      .addSelect('COALESCE(SUM(i.cantidad), 0)', 'total')
      .where('p.activo = :activo', { activo: true })
      .groupBy('p.id')
      .addGroupBy('p.costo')
      .addGroupBy('p.stockMinimo')
      .getRawMany<{
        id: number;
        costo: string;
        stockMinimo: string;
        total: string;
      }>();

    let sinStock = 0;
    let stockBajo = 0;
    let valor = 0;
    for (const row of stockRows) {
      const total = Number(row.total);
      const minimo = Number(row.stockMinimo);
      if (total === 0) sinStock++;
      else if (total <= minimo) stockBajo++;
      valor += total * Number(row.costo);
    }

    const [stockPorTienda, stockPorAlmacen] = await Promise.all([
      this.stockPorTipoUbicacion('tienda'),
      this.stockPorTipoUbicacion('almacen'),
    ]);

    return {
      totalProductos: stockRows.length,
      sinStock,
      stockBajo,
      valorInventario: this.round2(valor),
      stockPorTienda,
      stockPorAlmacen,
    };
  }

  private async stockPorTipoUbicacion(
    tipo: 'tienda' | 'almacen',
  ): Promise<StockUbicacion[]> {
    const rows = await this.dataSource
      .getRepository(Location)
      .createQueryBuilder('l')
      .leftJoin(Inventory, 'i', 'i.locationId = l.id')
      .select('l.id', 'locationId')
      .addSelect('l.nombre', 'nombre')
      .addSelect('COUNT(DISTINCT i.productId)', 'productos')
      .addSelect('COALESCE(SUM(i.cantidad), 0)', 'totalStock')
      .where('l.tipo = :tipo', { tipo })
      .groupBy('l.id')
      .addGroupBy('l.nombre')
      .orderBy('l.nombre', 'ASC')
      .getRawMany<{
        locationId: number;
        nombre: string;
        productos: string;
        totalStock: string;
      }>();

    return rows.map((r) => ({
      locationId: Number(r.locationId),
      nombre: r.nombre,
      productos: Number(r.productos),
      totalStock: Number(r.totalStock),
    }));
  }

  private async resumenVentas(): Promise<ResumenVentas> {
    const [hoyRow, mesRow] = await Promise.all([
      this.totalPorPeriodo('CAST(s.fecha AS date) = CURRENT_DATE'),
      this.totalPorPeriodo(
        "date_trunc('month', s.fecha) = date_trunc('month', CURRENT_DATE)",
      ),
    ]);

    const [porTienda, porMarca, porVehiculo] = await Promise.all([
      this.ventasMesPorTienda(),
      this.ventasMesPorMarca(),
      this.ventasMesPorVehiculo(),
    ]);

    return { hoy: hoyRow, mes: mesRow, porTienda, porMarca, porVehiculo };
  }

  private async totalPorPeriodo(condicion: string): Promise<VentasPeriodo> {
    const row = await this.saleRepo()
      .createQueryBuilder('s')
      .select('COUNT(*)', 'cantidad')
      .addSelect('COALESCE(SUM(s.total), 0)', 'total')
      .where(condicion)
      .getRawOne<{ cantidad: string; total: string }>();
    return {
      cantidad: Number(row?.cantidad ?? 0),
      total: this.round2(Number(row?.total ?? 0)),
    };
  }

  private async ventasMesPorTienda(): Promise<VentasPorTienda[]> {
    const rows = await this.saleRepo()
      .createQueryBuilder('s')
      .innerJoin('s.location', 'l')
      .select('s.locationId', 'locationId')
      .addSelect('l.nombre', 'nombre')
      .addSelect('COUNT(*)', 'cantidad')
      .addSelect('COALESCE(SUM(s.total), 0)', 'total')
      .where("date_trunc('month', s.fecha) = date_trunc('month', CURRENT_DATE)")
      .groupBy('s.locationId')
      .addGroupBy('l.nombre')
      .orderBy('total', 'DESC')
      .getRawMany<{
        locationId: number;
        nombre: string;
        cantidad: string;
        total: string;
      }>();

    return rows.map((r) => ({
      locationId: Number(r.locationId),
      nombre: r.nombre,
      cantidad: Number(r.cantidad),
      total: this.round2(Number(r.total)),
    }));
  }

  private baseVentasMesItems() {
    return this.saleItemRepo()
      .createQueryBuilder('si')
      .innerJoin('si.sale', 's')
      .innerJoin('si.product', 'p')
      .where(
        "date_trunc('month', s.fecha) = date_trunc('month', CURRENT_DATE)",
      );
  }

  private async ventasMesPorMarca(): Promise<VentasPorMarca[]> {
    const rows = await this.baseVentasMesItems()
      .select('p.marca', 'marca')
      .addSelect('SUM(si.cantidad)', 'unidades')
      .addSelect('COALESCE(SUM(si.subtotal), 0)', 'total')
      .groupBy('p.marca')
      .orderBy('total', 'DESC')
      .getRawMany<{ marca: string; unidades: string; total: string }>();

    return rows.map((r) => ({
      marca: r.marca,
      unidades: Number(r.unidades),
      total: this.round2(Number(r.total)),
    }));
  }

  private async ventasMesPorVehiculo(): Promise<VentasPorVehiculo[]> {
    const rows = await this.baseVentasMesItems()
      .select('p.marca', 'marca')
      .addSelect('p.modelo', 'modelo')
      .addSelect('SUM(si.cantidad)', 'unidades')
      .addSelect('COALESCE(SUM(si.subtotal), 0)', 'total')
      .groupBy('p.marca')
      .addGroupBy('p.modelo')
      .orderBy('total', 'DESC')
      .getRawMany<{
        marca: string;
        modelo: string;
        unidades: string;
        total: string;
      }>();

    return rows.map((r) => ({
      marca: r.marca,
      modelo: r.modelo,
      unidades: Number(r.unidades),
      total: this.round2(Number(r.total)),
    }));
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }
}
