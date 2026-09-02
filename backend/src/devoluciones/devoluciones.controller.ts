import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { DevolucionesService } from './devoluciones.service';

@Controller('devoluciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevolucionesController {
  constructor(private devolucionesService: DevolucionesService) {}

  @Get()
  findAll() {
    return this.devolucionesService.findAll();
  }

  @Get('sales')
  findSales(@Query('search') search?: string) {
    return this.devolucionesService.findSales(search);
  }

  @Post()
  @Roles('admin', 'inventario', 'tienda')
  create(@Body() body: any, @CurrentUser() user: AuthUser) {
    return this.devolucionesService.create(body, user);
  }
}
