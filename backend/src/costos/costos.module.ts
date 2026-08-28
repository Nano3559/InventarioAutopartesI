import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CostosController } from './costos.controller';
import { CostosService } from './costos.service';
import { ProductsModule } from '../products/products.module';
import { LocationsModule } from '../locations/locations.module';
import { Factura } from '../entities/factura.entity';
import { FacturaItem } from '../entities/factura-item.entity';
import { Proveedor } from '../entities/proveedor.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Factura, FacturaItem, Proveedor]),
    ProductsModule,
    LocationsModule,
  ],
  controllers: [CostosController],
  providers: [CostosService],
  exports: [CostosService],
})
export class CostosModule {}
