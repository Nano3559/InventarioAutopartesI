import {
  Body,
  Controller,
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
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { AttendanceService } from './attendance.service';
import type { AttendanceFilters, AttendanceUpdate } from './attendance.service';
import type { TipoAsistencia } from '../common/constants';

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
  @Post('check')
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Solo se permiten archivos de imagen'), false);
      },
    }),
  )
  check(
    @UploadedFile() foto: Express.Multer.File,
    @Body('tipo') tipo?: TipoAsistencia,
    @Body('locationId') locationId?: string,
  ) {
    if (!foto) {
      throw new Error('Se requiere el archivo "foto"');
    }
    const loc = locationId ? Number(locationId) : null;
    return this.attendanceService.check(foto, tipo, Number.isNaN(loc) ? null : loc);
  }

  @Post(':id/confirm')
  confirmar(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.attendanceService.confirmarManual(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AttendanceUpdate,
    @CurrentUser() user: AuthUser,
  ) {
    return this.attendanceService.update(id, body, user.id);
  }
}
