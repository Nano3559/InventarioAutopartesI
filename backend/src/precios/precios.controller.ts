import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PreciosService } from './precios.service';
import type { UpdatePreciosDto } from './precios.service';
import type { ProductFilters } from '../products/products.service';

const EXCEL_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Controller('precios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PreciosController {
  constructor(private preciosService: PreciosService) {}

  @Get()
  findAll(@Query() filters: ProductFilters) {
    return this.preciosService.findAll(filters);
  }

  @Get('export')
  async exportExcel(@Query() filters: ProductFilters): Promise<StreamableFile> {
    const buffer = await this.preciosService.exportExcel(filters);
    const fecha = new Date().toISOString().slice(0, 10);
    return new StreamableFile(buffer, {
      type: EXCEL_MIME,
      disposition: `attachment; filename="precios-${fecha}.xlsx"`,
    });
  }

  @Patch(':id')
  @Roles('admin')
  updatePrecios(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePreciosDto,
  ) {
    return this.preciosService.updatePrecios(id, body);
  }
}
