import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { DemandPredictionService } from './demand-prediction.service';
import { Product } from '../entities/product.entity';
import { Inventory } from '../entities/inventory.entity';
import { Location } from '../entities/location.entity';
import { ProductDemandMetric } from '../entities/product-demand-metric.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Inventory, Location, ProductDemandMetric]),
    ConfigModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, DemandPredictionService],
  exports: [ProductsService, DemandPredictionService],
})
export class ProductsModule {}
