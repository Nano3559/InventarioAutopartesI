import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Devolucion } from '../entities/devolucion.entity';
import { Product } from '../entities/product.entity';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { ProductsService } from '../products/products.service';
import { LocationsService } from '../locations/locations.service';
import { AuthUser } from '../auth/current-user.decorator';

@Injectable()
export class DevolucionesService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private productsService: ProductsService,
    private locationsService: LocationsService,
  ) {}

  private repo() {
    return this.dataSource.getRepository(Devolucion);
  }

  private saleRepo() {
    return this.dataSource.getRepository(Sale);
  }

  private saleItemRepo() {
    return this.dataSource.getRepository(SaleItem);
  }

  async findAll() {
    return this.repo()
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.product', 'product')
      .leftJoinAndSelect('d.location', 'location')
      .leftJoinAndSelect('d.usuario', 'usuario')
      .leftJoinAndSelect('d.venta', 'venta')
      .orderBy('d.id', 'DESC')
      .getMany();
  }

  async findSales(search?: string) {
    const qb = this.saleRepo()
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.cliente', 'cliente')
      .leftJoinAndSelect('s.items', 'items')
      .leftJoinAndSelect('s.location', 'location')
      .orderBy('s.fecha', 'DESC');

    if (search) {
      const s = `%${search}%`;
      qb.andWhere(
        '(s.codigo LIKE :s OR cliente.nombre LIKE :s OR cliente.ciNit LIKE :s)',
        { s },
      );
    }

    const sales = await qb.getMany();
    return sales.map((sale) => ({
      id: sale.id,
      codigo: sale.codigo,
      fecha: sale.fecha,
      tipo: sale.tipo,
      total: sale.total,
      cliente: sale.cliente
        ? { id: sale.cliente.id, nombre: sale.cliente.nombre, ciNit: sale.cliente.ciNit }
        : null,
      ubicacion: sale.location?.nombre || null,
      items: sale.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        cantidad: item.cantidad,
        precio: item.precio,
        subtotal: item.subtotal,
      })),
    }));
  }

  async create(
    input: {
      productId: number;
      motivo: string;
      cantidad: number;
      monto: number;
      metodo: string;
      locationId?: number;
      ventaId?: number;
      saleItemId?: number;
    },
    user: AuthUser,
  ) {
    const product = await this.dataSource
      .getRepository(Product)
      .findOne({ where: { id: input.productId } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    if (
      !Number.isFinite(input.cantidad) ||
      !Number.isInteger(input.cantidad) ||
      input.cantidad <= 0 ||
      !Number.isFinite(input.monto) ||
      input.monto <= 0
    ) {
      throw new BadRequestException(
        'Cantidad debe ser entera y monto debe ser mayor a 0',
      );
    }

    const locationId = input.locationId ?? user.tiendaId ?? 1;
    const location = await this.locationsService.findOne(locationId);
    if (!location) throw new BadRequestException('Ubicación inválida');
    if (user.rol === 'tienda' && user.tiendaId !== locationId) {
      throw new BadRequestException(
        'La tienda no puede registrar devoluciones en otra ubicación',
      );
    }

    // Validar contra la venta si se proporciona
    let saleItem: SaleItem | null = null;
    if (input.ventaId) {
      const sale = await this.saleRepo().findOne({
        where: { id: input.ventaId },
        relations: { items: true },
      });
      if (!sale) throw new NotFoundException('Venta no encontrada');

      if (input.saleItemId) {
        saleItem = await this.saleItemRepo().findOne({
          where: { id: input.saleItemId, saleId: input.ventaId },
        });
        if (!saleItem) {
          throw new NotFoundException(
            'El producto no pertenece a esta venta',
          );
        }
        if (saleItem.productId !== input.productId) {
          throw new BadRequestException(
            'El producto no coincide con el ítem de la venta',
          );
        }
        if (input.cantidad > saleItem.cantidad) {
          throw new BadRequestException(
            `La cantidad devuelta (${input.cantidad}) no puede exceder la cantidad vendida (${saleItem.cantidad})`,
          );
        }
      }
    }

    const dev = this.repo().create({
      productId: input.productId,
      motivo: input.motivo,
      cantidad: input.cantidad,
      monto: input.monto,
      metodo: input.metodo,
      locationId,
      usuarioId: user.id,
      ventaId: input.ventaId ?? null,
      saleItemId: input.saleItemId ?? null,
    });
    const saved = await this.repo().save(dev);

    // Agregar stock de vuelta (positivo)
    await this.productsService.adjustStock(
      input.productId,
      locationId,
      input.cantidad,
    );

    return saved;
  }
}
