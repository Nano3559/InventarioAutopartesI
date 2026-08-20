import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { MovimientosService } from './movimientos.service';

@Controller('movimientos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MovimientosController {
  constructor(private movimientosService: MovimientosService) {}

  @Get()
  findAll() {
    return this.movimientosService.findAll();
  }

  @Post()
  @Roles('admin', 'inventario')
  create(@Body() body: any, @CurrentUser() user: AuthUser) {
    return this.movimientosService.create(body, user);
  }
}
