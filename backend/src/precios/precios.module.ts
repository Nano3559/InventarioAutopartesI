import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { PreciosController } from './precios.controller';
import { PreciosService } from './precios.service';

@Module({
  imports: [ProductsModule],
  controllers: [PreciosController],
  providers: [PreciosService],
})
export class PreciosModule {}
