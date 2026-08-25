import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as XLSX from 'xlsx';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { Payment } from '../entities/payment.entity';
import { Product } from '../entities/product.entity';
import { Cliente } from '../entities/cliente.entity';
import { Solicitud } from '../entities/solicitud.entity';
import { ProductsService } from '../products/products.service';
import { LocationsService } from '../locations/locations.service';
import { AuthUser } from '../auth/current-user.decorator';

export interface WholesaleExcelRow {
  'Código Fábrica': string;
  'Código OEM'?: string;
  Cantidad: number | string;
  'Precio Mayor'?: number | string;
}

export interface WholesaleImportResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  items: {
    productId: number;
    producto: string;
    codigoFabrica: string;
    cantidad: number;
    precio: number;
    stockDisponible: number;
  }[];
  total: number;
  saleId?: number;
}

export interface SaleInput {
  tipo?: 'menor' | 'mayor';
  items: { productId: number; cantidad: number; precio: number }[];
  pagos: { metodo: string; monto: number }[];
  cliente?: { nombre: string; ciNit?: string; celular?: string };
  requiereFactura?: boolean;
  lugarEntrega?: string;
  paraQuien?: string;
  locationId?: number;
}

@Injectable()
export class SalesService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private productsService: ProductsService,
    private locationsService: LocationsService,
  ) {}

  private saleRepo() {
    return this.dataSource.getRepository(Sale);
  }

  async create(input: SaleInput, user: AuthUser) {
    if (!input.items || input.items.length === 0) {
      throw new BadRequestException(
        'La venta debe incluir al menos un producto',
      );
    }
    if (!input.pagos || input.pagos.length === 0) {
      throw new BadRequestException(
        'Debe registrar al menos un método de pago',
      );
    }

    const locationId = input.locationId ?? (user.tiendaId as number) ?? 1;
    const location = await this.locationsService.findOne(locationId);
    if (!location) throw new BadRequestException('Ubicación inválida');

    const totalPagos = input.pagos.reduce((a, p) => a + p.monto, 0);
    let total = 0;
    const items: SaleItem[] = [];

    for (const it of input.items) {
      const product = await this.dataSource.getRepository(Product).findOne({
        where: { id: it.productId },
      });
      if (!product) throw new BadRequestException('Producto inexistente');

      const stock = await this.productsService.stockAt(
        it.productId,
        locationId,
      );
      if (it.cantidad > stock) {
        throw new BadRequestException(
          `Stock insuficiente de "${product.producto}" en ${location.nombre}. Disponible: ${stock}`,
        );
      }

      const subtotal = it.cantidad * it.precio;
      total += subtotal;
      items.push(
        this.dataSource.getRepository(SaleItem).create({
          productId: it.productId,
          cantidad: it.cantidad,
          precio: it.precio,
          subtotal,
        }),
      );
    }

    if (Math.abs(totalPagos - total) > 0.01) {
      throw new BadRequestException(
        `El total de pagos (Bs ${totalPagos.toFixed(2)}) no coincide con el total de la venta (Bs ${total.toFixed(2)})`,
      );
    }

    let cliente: Cliente | null = null;
    if (input.cliente && input.cliente.nombre) {
      const clienteRepo = this.dataSource.getRepository(Cliente);
      cliente = clienteRepo.create({
        nombre: input.cliente.nombre,
        ciNit: input.cliente.ciNit ?? null,
        celular: input.cliente.celular ?? null,
      });
      cliente = await clienteRepo.save(cliente);
    }

    const count = await this.saleRepo().count();
    const sale = this.saleRepo().create({
      codigo: `NV-${String(count + 1).padStart(6, '0')}`,
      tipo: input.tipo ?? 'menor',
      total,
      requiereFactura: input.requiereFactura ?? false,
      lugarEntrega: input.lugarEntrega ?? null,
      paraQuien: input.paraQuien ?? null,
      locationId,
      usuarioId: user.id,
      clienteId: cliente ? cliente.id : null,
      items,
      pagos: input.pagos.map((p) =>
        this.dataSource.getRepository(Payment).create({
          metodo: p.metodo,
          monto: p.monto,
        }),
      ),
    });
    const saved = await this.saleRepo().save(sale);

    for (const it of input.items) {
      const newStock = await this.productsService.adjustStock(
        it.productId,
        locationId,
        -it.cantidad,
      );
      if (location.tipo === 'tienda' && newStock.cantidad === 0) {
        await this.createAutoRestock(it.productId, locationId, user.id);
      }
    }

    return this.findOne(saved.id);
  }

  private async createAutoRestock(
    productId: number,
    tiendaId: number,
    usuarioId: number,
  ) {
    const product = await this.dataSource
      .getRepository(Product)
      .findOne({ where: { id: productId } });
    if (!product) return;
    const solicitudRepo = this.dataSource.getRepository(Solicitud);
    const pending = await solicitudRepo.findOne({
      where: { productId, tiendaId, estado: 'Pendiente' },
    });
    if (pending) return;
    const s = solicitudRepo.create({
      productId,
      tiendaId,
      cantidad: Math.max(1, product.stockMinimo),
      usuarioId,
      estado: 'Pendiente',
      auto: true,
    });
    await solicitudRepo.save(s);
  }

  async findAll(filters: {
    desde?: string;
    hasta?: string;
    tiendaId?: number;
    tipo?: string;
    search?: string;
  }) {
    let qb = this.saleRepo()
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.location', 'location')
      .leftJoinAndSelect('s.usuario', 'usuario')
      .leftJoinAndSelect('s.cliente', 'cliente')
      .leftJoinAndSelect('s.pagos', 'pagos')
      .leftJoinAndSelect('s.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .orderBy('s.id', 'DESC');

    if (filters.search) {
      qb = qb.andWhere('(s.codigo LIKE :s OR cliente.nombre LIKE :s)', {
        s: `%${filters.search}%`,
      });
    }
    if (filters.tiendaId) {
      qb = qb.andWhere('s.locationId = :tiendaId', {
        tiendaId: filters.tiendaId,
      });
    }
    if (filters.tipo) {
      qb = qb.andWhere('s.tipo = :tipo', { tipo: filters.tipo });
    }
    if (filters.desde || filters.hasta) {
      const desde = filters.desde
        ? `${filters.desde} 00:00:00`
        : '1970-01-01 00:00:00';
      const hasta = filters.hasta
        ? `${filters.hasta} 23:59:59`
        : '2999-12-31 23:59:59';
      qb = qb.andWhere('s.fecha BETWEEN :desde AND :hasta', { desde, hasta });
    }
    return qb.getMany();
  }

  async findOne(id: number) {
    const sale = await this.saleRepo()
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.location', 'location')
      .leftJoinAndSelect('s.usuario', 'usuario')
      .leftJoinAndSelect('s.cliente', 'cliente')
      .leftJoinAndSelect('s.pagos', 'pagos')
      .leftJoinAndSelect('s.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('s.id = :id', { id })
      .getOne();
    if (!sale) throw new NotFoundException('Venta no encontrada');
    return sale;
  }

  async notaVenta(id: number): Promise<string> {
    const sale = await this.findOne(id);
    const fecha = new Date(sale.fecha).toLocaleString('es-BO');
    const filas = sale.items
      .map(
        (it) => `<tr>
          <td>${it.product.producto}</td>
          <td>${it.product.marca} ${it.product.modelo}</td>
          <td>${it.cantidad}</td>
          <td>${it.precio.toFixed(2)}</td>
          <td>${it.subtotal.toFixed(2)}</td>
        </tr>`,
      )
      .join('');
    const pagos = sale.pagos
      .map(
        (p) =>
          `<tr><td style="text-transform: capitalize;">${p.metodo}</td><td>Bs ${p.monto.toFixed(2)}</td></tr>`,
      )
      .join('');
    return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Nota de venta ${sale.codigo}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:720px;margin:20px auto;color:#1f2937}
  h1{color:#166534}.box{border:1px solid #ddd;border-radius:8px;padding:16px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th,td{border:1px solid #e5e7eb;padding:8px;text-align:left}
  th{background:#f0fdf4}.right{text-align:right}.total{font-size:18px;font-weight:bold}
  .muted{color:#6b7280;font-size:13px}
  @media print{body{margin:0}}
</style></head><body>
  <h1>Sistema de Inventario y Ventas</h1>
  <h2>NOTA DE VENTA ${sale.codigo}</h2>
  <div class="box">
    <div><strong>Fecha:</strong> ${fecha}</div>
    <div><strong>Tienda:</strong> ${sale.location.nombre}</div>
    <div><strong>Vendedor:</strong> ${sale.usuario.nombre}</div>
    ${sale.cliente ? `<div><strong>Cliente:</strong> ${sale.cliente.nombre}${sale.cliente.ciNit ? ` (CI/NIT: ${sale.cliente.ciNit})` : ''}${sale.cliente.celular ? ` - Cel: ${sale.cliente.celular}` : ''}</div>` : ''}
    ${sale.lugarEntrega ? `<div><strong>Lugar de entrega:</strong> ${sale.lugarEntrega}</div>` : ''}
    ${sale.paraQuien ? `<div><strong>Para quién es el pedido:</strong> ${sale.paraQuien}</div>` : ''}
    ${sale.requiereFactura ? '<div class="muted">Requiere factura</div>' : ''}
  </div>
  <table>
    <thead><tr><th>Producto</th><th>Marca / Modelo</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
    <tbody>${filas}</tbody>
    <tfoot><tr><td colspan="4" class="right total">TOTAL</td><td class="total">Bs ${sale.total.toFixed(2)}</td></tr></tfoot>
  </table>
  <h3>Pagos</h3>
  <table><tbody>${pagos}</tbody></table>
  <p class="muted">Generado por el Sistema de Inventario y Ventas.</p>
</body></html>`;
  }

  async previewExcel(
    file: Express.Multer.File,
  ): Promise<WholesaleImportResult> {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo Excel');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('El archivo Excel está vacío');
    }
    const rows = XLSX.utils.sheet_to_json<WholesaleExcelRow>(
      workbook.Sheets[sheetName],
    );

    if (rows.length === 0) {
      throw new BadRequestException('El archivo Excel no contiene datos');
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const items: WholesaleImportResult['items'] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const codigoFabrica = String(row['Código Fábrica'] || '').trim();
      const codigoOem = String(row['Código OEM'] || '').trim();
      const rawCantidad = row.Cantidad;
      const rawPrecio = row['Precio Mayor'];

      if (!codigoFabrica && !codigoOem) {
        errors.push(
          `Fila ${rowNum}: No se especificó código fábrica ni código OEM`,
        );
        continue;
      }

      const cantidad = Number(rawCantidad);
      if (
        !Number.isFinite(cantidad) ||
        cantidad <= 0 ||
        !Number.isInteger(cantidad)
      ) {
        errors.push(`Fila ${rowNum}: Cantidad inválida ("${rawCantidad}")`);
        continue;
      }

      const productRepo = this.dataSource.getRepository(Product);
      let product: Product | null = null;

      if (codigoFabrica) {
        product = await productRepo.findOne({ where: { codigoFabrica } });
      }
      if (!product && codigoOem) {
        product = await productRepo.findOne({ where: { codigoOem } });
      }

      if (!product) {
        const ident = codigoFabrica || codigoOem;
        errors.push(
          `Fila ${rowNum}: Producto con código "${ident}" no encontrado`,
        );
        continue;
      }

      const stockDisponible = await this.productsService.stockAt(product.id, 1);

      if (cantidad > stockDisponible) {
        errors.push(
          `Fila ${rowNum}: Stock insuficiente de "${product.producto}" (${product.codigoFabrica}). Solicita: ${cantidad}, Disponible: ${stockDisponible}`,
        );
        continue;
      }

      let precio: number;
      if (rawPrecio !== undefined && rawPrecio !== null && rawPrecio !== '') {
        precio = Number(rawPrecio);
        if (!Number.isFinite(precio) || precio < 0) {
          warnings.push(
            `Fila ${rowNum}: Precio mayor inválido ("${rawPrecio}"), se usará el precio del catálogo`,
          );
          precio = product.precioMayor ?? 0;
        }
      } else {
        precio = product.precioMayor ?? 0;
        if (precio === 0) {
          warnings.push(
            `Fila ${rowNum}: "${product.producto}" no tiene precio mayor definido, se usará 0`,
          );
        }
      }

      items.push({
        productId: product.id,
        producto: product.producto,
        codigoFabrica: product.codigoFabrica,
        cantidad,
        precio,
        stockDisponible,
      });
    }

    const total = items.reduce((sum, it) => sum + it.cantidad * it.precio, 0);

    return {
      ok: errors.length === 0,
      errors,
      warnings,
      items,
      total,
    };
  }

  async importExcel(
    file: Express.Multer.File,
    meta: {
      cliente?: { nombre: string; ciNit?: string; celular?: string };
      requiereFactura?: boolean;
      lugarEntrega?: string;
      paraQuien?: string;
      locationId?: number;
      pagos?: { metodo: string; monto: number }[];
    },
    user: AuthUser,
  ): Promise<Sale> {
    const preview = await this.previewExcel(file);

    if (!preview.ok) {
      throw new BadRequestException({
        message: 'El archivo contiene errores que impiden crear la venta',
        errors: preview.errors,
        warnings: preview.warnings,
      });
    }

    if (preview.items.length === 0) {
      throw new BadRequestException(
        'No se encontraron productos válidos en el Excel',
      );
    }

    const locationId = meta.locationId ?? (user.tiendaId as number) ?? 1;
    const location = await this.locationsService.findOne(locationId);
    if (!location) throw new BadRequestException('Ubicación inválida');

    const total = preview.total;
    const pagos =
      meta.pagos && meta.pagos.length > 0
        ? meta.pagos
        : [{ metodo: 'efectivo', monto: total }];

    const totalPagos = pagos.reduce((a, p) => a + p.monto, 0);
    if (Math.abs(totalPagos - total) > 0.01) {
      throw new BadRequestException(
        `El total de pagos (Bs ${totalPagos.toFixed(2)}) no coincide con el total de la venta (Bs ${total.toFixed(2)})`,
      );
    }

    let cliente: Cliente | null = null;
    if (meta.cliente && meta.cliente.nombre) {
      const clienteRepo = this.dataSource.getRepository(Cliente);
      cliente = clienteRepo.create({
        nombre: meta.cliente.nombre,
        ciNit: meta.cliente.ciNit ?? null,
        celular: meta.cliente.celular ?? null,
      });
      cliente = await clienteRepo.save(cliente);
    }

    const saleItems: SaleItem[] = preview.items.map((it) =>
      this.dataSource.getRepository(SaleItem).create({
        productId: it.productId,
        cantidad: it.cantidad,
        precio: it.precio,
        subtotal: it.cantidad * it.precio,
      }),
    );

    const count = await this.saleRepo().count();
    const sale = this.saleRepo().create({
      codigo: `NV-${String(count + 1).padStart(6, '0')}`,
      tipo: 'mayor',
      total,
      requiereFactura: meta.requiereFactura ?? false,
      lugarEntrega: meta.lugarEntrega ?? null,
      paraQuien: meta.paraQuien ?? null,
      locationId,
      usuarioId: user.id,
      clienteId: cliente ? cliente.id : null,
      items: saleItems,
      pagos: pagos.map((p) =>
        this.dataSource.getRepository(Payment).create({
          metodo: p.metodo,
          monto: p.monto,
        }),
      ),
    });
    const saved = await this.saleRepo().save(sale);

    for (const it of preview.items) {
      const newStock = await this.productsService.adjustStock(
        it.productId,
        locationId,
        -it.cantidad,
      );
      if (location.tipo === 'tienda' && newStock.cantidad === 0) {
        await this.createAutoRestock(it.productId, locationId, user.id);
      }
    }

    return this.findOne(saved.id);
  }
}
