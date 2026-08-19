import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from '../entities/product.entity';
import { Inventory } from '../entities/inventory.entity';
import { Location } from '../entities/location.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Inventory, Location])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}