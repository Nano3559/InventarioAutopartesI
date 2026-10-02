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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { multerImagenes } from '../common/image-upload';
import { ProductsService } from './products.service';
import type { ProductFilters } from './products.service';

const multerOptions = multerImagenes();

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  findAll(@Query() filters: ProductFilters) {
    return this.productsService.findAll(filters);
  }

  /**
   * Identifica el producto por su código de barras.
   * Debe declararse ANTES de `@Get(':id')`: si no, Express intenta parsear
   * "by-barcode" con ParseIntPipe y responde 400.
   */
  @Get('by-barcode/:codigo')
  findByBarcode(@Param('codigo') codigo: string) {
    return this.productsService.findByCodigo(codigo);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  /** Etiqueta PNG Code128 (solo barras). Asigna el código si no existe. */
  @Get(':id/barcode')
  async barcode(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const { png, codigo } = await this.productsService.renderBarcode(id);
    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="etiqueta-${codigo}.png"`,
      'Cache-Control': 'no-store',
    });
    res.send(png);
  }

  /** Genera los códigos de todos los productos que aún no lo tengan. */
  @Post('barcode/generate-all')
  @Roles('admin')
  generateAllBarcodes() {
    return this.productsService.generarCodigosPendientes();
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
