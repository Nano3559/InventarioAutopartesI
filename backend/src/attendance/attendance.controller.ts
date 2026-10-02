import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { AttendanceService } from './attendance.service';
import type { AttendanceFilters, AttendanceUpdate } from './attendance.service';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  /**
   * Historial paginado. Filtros: page, limit, usuarioId, locationId, tipo,
   * metodo, desde, hasta (YYYY-MM-DD o ISO) y search (nombre/apellido/email).
   */
  @Get()
  findAll(@Query() filters: AttendanceFilters) {
    return this.attendanceService.findAll(filters);
  }

  /** Corrige un marcaje: reasignar persona/tienda, tipo, fecha o confirmar manual. */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AttendanceUpdate,
    @CurrentUser() user: AuthUser,
  ) {
    return this.attendanceService.update(id, body, user.id);
  }
}
