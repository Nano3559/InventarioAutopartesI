import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { SalesService } from './sales.service';
import type { SaleInput } from './sales.service';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Get()
  findAll(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('tiendaId') tiendaId?: string,
    @Query('tipo') tipo?: string,
    @Query('search') search?: string,
  ) {
    return this.salesService.findAll({
      desde,
      hasta,
      tiendaId: tiendaId ? Number(tiendaId) : undefined,
      tipo,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.findOne(id);
  }

  @Get(':id/nota')
  async notaVenta(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const html = await this.salesService.notaVenta(id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Post()
  @Roles('admin', 'tienda', 'inventario')
  create(@Body() body: SaleInput, @CurrentUser() user: AuthUser) {
    return this.salesService.create(body, user);
  }
}
