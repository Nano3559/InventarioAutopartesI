import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ProductsService } from './products.service';
import type { ProductFilters } from './products.service';

const imageFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!file.mimetype.startsWith('image/')) {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  } else {
    cb(null, true);
  }
};

const multerOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFileFilter,
};

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  findAll(@Query() filters: ProductFilters) {
    return this.productsService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Get(':id/stock')
  stock(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.stockByLocation(id);
  }

  @Post()
  @Roles('admin', 'inventario')
  create(@Body() body: any) {
    return this.productsService.create(body);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.productsService.update(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }

  @Post('search-by-image')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  searchByImage(@UploadedFile() file: Express.Multer.File) {
    return this.productsService.searchByImage(file);
  }

  @Post(':id/image')
  @Roles('admin', 'inventario')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productsService.uploadImage(id, file);
  }

  @Patch(':id/stock')
  @Roles('admin', 'inventario')
  adjustStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { locationId: number; cantidad: number },
  ) {
    return this.productsService.adjustStock(id, body.locationId, body.cantidad);
  }

  @Patch(':id/toggle-active')
  @Roles('admin')
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.toggleActive(id);
  }
}
