import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { ProductsModule } from '../products/products.module';
import { LocationsModule } from '../locations/locations.module';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { Payment } from '../entities/payment.entity';
import { Cliente } from '../entities/cliente.entity';
import { Product } from '../entities/product.entity';
import { Solicitud } from '../entities/solicitud.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sale,
      SaleItem,
      Payment,
      Cliente,
      Product,
      Solicitud,
    ]),
    ProductsModule,
    LocationsModule,
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}