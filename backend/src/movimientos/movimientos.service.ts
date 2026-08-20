import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Movimiento } from '../entities/movimiento.entity';
import { Product } from '../entities/product.entity';
import { ProductsService } from '../products/products.service';
import { LocationsService } from '../locations/locations.service';
import { AuthUser } from '../auth/current-user.decorator';

@Injectable()
export class MovimientosService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private productsService: ProductsService,
    private locationsService: LocationsService,
  ) {}

  private repo() {
    return this.dataSource.getRepository(Movimiento);
  }

  async findAll() {
    return this.repo()
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.product', 'product')
      .leftJoinAndSelect('m.origen', 'origen')
      .leftJoinAndSelect('m.destino', 'destino')
      .leftJoinAndSelect('m.usuario', 'usuario')
      .orderBy('m.id', 'DESC')
      .getMany();
  }

  async create(
    input: {
      productId: number;
      cantidad: number;
      origenId: number;
      destinoId: number;
      observacion?: string;
    },
    user: AuthUser,
  ) {
    const product = await this.dataSource
      .getRepository(Product)
      .findOne({ where: { id: input.productId } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    if (input.cantidad <= 0)
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    if (input.origenId === input.destinoId)
      throw new BadRequestException('El origen y destino deben ser diferentes');

    const origen = await this.locationsService.findOne(input.origenId);
    const destino = await this.locationsService.findOne(input.destinoId);
    if (!origen || !destino)
      throw new BadRequestException('Origen o destino inválidos');

    const stock = await this.productsService.stockAt(
      input.productId,
      input.origenId,
    );
    if (stock < input.cantidad) {
      throw new BadRequestException(
        `Stock insuficiente en ${origen.nombre} (disponible: ${stock})`,
      );
    }

    await this.productsService.adjustStock(
      input.productId,
      input.origenId,
      -input.cantidad,
    );
    await this.productsService.adjustStock(
      input.productId,
      input.destinoId,
      input.cantidad,
    );

    const mov = this.repo().create({
      productId: input.productId,
      cantidad: input.cantidad,
      origenId: input.origenId,
      destinoId: input.destinoId,
      usuarioId: user.id,
      observacion: input.observacion ?? null,
    });
    return this.repo().save(mov);
  }
}
