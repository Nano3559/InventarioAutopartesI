import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevolucionesController } from './devoluciones.controller';
import { DevolucionesService } from './devoluciones.service';
import { ProductsModule } from '../products/products.module';
import { LocationsModule } from '../locations/locations.module';
import { Devolucion } from '../entities/devolucion.entity';
import { Product } from '../entities/product.entity';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Devolucion, Product, Sale, SaleItem]),
    ProductsModule,
    LocationsModule,
  ],
  controllers: [DevolucionesController],
  providers: [DevolucionesService],
})
export class DevolucionesModule {}
