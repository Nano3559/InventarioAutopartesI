import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Solicitud } from '../entities/solicitud.entity';
import { Movimiento } from '../entities/movimiento.entity';
import { Product } from '../entities/product.entity';
import { ProductsService } from '../products/products.service';
import { LocationsService } from '../locations/locations.service';
import { AuthUser } from '../auth/current-user.decorator';
import { ESTADOS_SOLICITUD } from '../common/constants';

@Injectable()
export class SolicitudesService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private productsService: ProductsService,
    private locationsService: LocationsService,
  ) {}

  private repo() {
    return this.dataSource.getRepository(Solicitud);
  }

  async findAll(user: AuthUser) {
    let qb = this.repo()
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.product', 'product')
      .leftJoinAndSelect('s.tienda', 'tienda')
      .leftJoinAndSelect('s.origen', 'origen')
      .leftJoinAndSelect('s.usuario', 'usuario')
      .orderBy('s.id', 'DESC');
    if (user.rol === 'tienda') {
      qb = qb.where('s.tiendaId = :tiendaId', { tiendaId: user.tiendaId });
    }
    return qb.getMany();
  }

  async create(
    input: { productId: number; cantidad: number; tiendaId?: number },
    user: AuthUser,
  ) {
    const product = await this.dataSource
      .getRepository(Product)
      .findOne({ where: { id: input.productId } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    if (
      !Number.isFinite(input.cantidad) ||
      !Number.isInteger(input.cantidad) ||
      input.cantidad <= 0
    )
      throw new BadRequestException('La cantidad debe ser un entero mayor a 0');
    const tiendaId = input.tiendaId ?? user.tiendaId;
    if (!tiendaId)
      throw new BadRequestException('Tienda no asignada al usuario');
    const tienda = await this.locationsService.findOne(tiendaId);
    if (!tienda || tienda.tipo !== 'tienda')
      throw new BadRequestException('Ubicación destino debe ser una tienda');
    if (user.rol === 'tienda' && user.tiendaId !== tiendaId) {
      throw new BadRequestException(
        'La tienda no puede crear solicitudes para otra tienda',
      );
    }

    const sol = this.repo().create({
      productId: input.productId,
      tiendaId,
      cantidad: input.cantidad,
      usuarioId: user.id,
      estado: 'Pendiente',
      auto: false,
    });
    return this.repo().save(sol);
  }

  async updateEstado(
    id: number,
    input: { estado: string; origenId?: number },
    user: AuthUser,
  ) {
    if (!ESTADOS_SOLICITUD.includes(input.estado as any)) {
      throw new BadRequestException('Estado inválido');
    }
    const sol = await this.repo()
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.tienda', 'tienda')
      .leftJoinAndSelect('s.origen', 'origen')
      .where('s.id = :id', { id })
      .getOne();
    if (!sol) throw new NotFoundException('Solicitud no encontrada');

    const allowedTransitions: Record<string, string[]> = {
      Pendiente: ['En preparación', 'Cancelado'],
      'En preparación': ['Enviado', 'Cancelado'],
      Enviado: ['Recibido'],
      Recibido: [],
      Cancelado: [],
    };
    if (!allowedTransitions[sol.estado]?.includes(input.estado)) {
      throw new BadRequestException(
        `No se puede cambiar de ${sol.estado} a ${input.estado}`,
      );
    }

    if (input.estado === 'Enviado' && sol.estado === 'En preparación') {
      const origenId = input.origenId ?? sol.origenId;
      if (!origenId)
        throw new BadRequestException('Debe seleccionar el almacén de origen');
      const origen = await this.locationsService.findOne(origenId);
      if (!origen || origen.tipo !== 'almacen')
        throw new BadRequestException('El origen debe ser un almacén');

      const stock = await this.productsService.stockAt(sol.productId, origenId);
      if (stock < sol.cantidad) {
        throw new BadRequestException(
          `Stock insuficiente en ${origen.nombre} (disponible: ${stock})`,
        );
      }
      await this.productsService.adjustStock(
        sol.productId,
        origenId,
        -sol.cantidad,
      );
      await this.productsService.adjustStock(
        sol.productId,
        sol.tiendaId,
        sol.cantidad,
      );
      const movRepo = this.dataSource.getRepository(Movimiento);
      const mov = movRepo.create({
        productId: sol.productId,
        cantidad: sol.cantidad,
        origenId,
        destinoId: sol.tiendaId,
        usuarioId: user.id,
        observacion: `Despacho de solicitud #${sol.id}`,
      });
      await movRepo.save(mov);
      sol.origen = origen;
      sol.origenId = origenId;
    }

    sol.estado = input.estado;
    return this.repo().save(sol);
  }
}
