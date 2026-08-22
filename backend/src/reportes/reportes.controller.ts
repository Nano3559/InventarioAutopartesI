import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { ReportesService } from './reportes.service';
import type { ReporteVentasFilters } from './reportes.service';

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportesController {
  constructor(private reportesService: ReportesService) {}

  @Get('dashboard')
  dashboard() {
    return this.reportesService.dashboard();
  }

  @Get('ventas')
  ventas(
    @Query() filters: ReporteVentasFilters,
    @CurrentUser() user: AuthUser,
  ) {
    const tiendaId =
      user.rol === 'tienda' ? (user.tiendaId ?? undefined) : filters.tiendaId;
    return this.reportesService.reporteVentas({ ...filters, tiendaId });
  }

  @Get('mensual')
  @Roles('admin')
  mensual(@Query('anio') anio?: string) {
    const anioNum = anio ? Number(anio) : new Date().getFullYear();
    return this.reportesService.reporteMensual(
      Number.isFinite(anioNum) && anioNum > 1900
        ? anioNum
        : new Date().getFullYear(),
    );
  }

  @Get('proveedores')
  @Roles('admin')
  proveedores() {
    return this.reportesService.reporteProveedores();
  }
}
