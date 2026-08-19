import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Devolucion } from '../entities/devolucion.entity';
import { Product } from '../entities/product.entity';
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

  async findAll() {
    return this.repo()
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.product', 'product')
      .leftJoinAndSelect('d.location', 'location')
      .leftJoinAndSelect('d.usuario', 'usuario')
      .orderBy('d.id', 'DESC')
      .getMany();
  }

  async create(
    input: {
      productId: number;
      motivo: string;
      cantidad: number;
      monto: number;
      metodo: string;
      locationId?: number;
    },
    user: AuthUser,
  ) {
    const product = await this.dataSource
      .getRepository(Product)
      .findOne({ where: { id: input.productId } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    if (input.cantidad <= 0 || input.monto <= 0) {
      throw new BadRequestException('Cantidad y monto deben ser mayores a 0');
    }
    const locationId = input.locationId ?? user.tiendaId ?? 1;
    const location = await this.locationsService.findOne(locationId);
    if (!location) throw new BadRequestException('Ubicación inválida');

    const dev = this.repo().create({
      productId: input.productId,
      motivo: input.motivo,
      cantidad: input.cantidad,
      monto: input.monto,
      metodo: input.metodo,
      locationId,
      usuarioId: user.id,
    });
    const saved = await this.repo().save(dev);

    await this.productsService.adjustStock(input.productId, locationId, input.cantidad);

    return saved;
  }
}