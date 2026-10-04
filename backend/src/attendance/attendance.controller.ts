import {
  BadRequestException,
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
import type {
  AttendanceDashboardFilters,
  AttendanceFilters,
  AttendanceUpdate,
} from './attendance.service';
import type { TipoAsistencia } from '../common/constants';

/** Los campos del multipart llegan como texto: vacío o no numérico → `null`. */
function enteroOpcional(valor?: string): number | null {
  if (valor === undefined || valor === null || !String(valor).trim())
    return null;
  return Number(valor);
}

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

  /**
   * Presentes / ausentes por tienda para un día (`fecha=YYYY-MM-DD`, hoy por
   * defecto) + los últimos marcajes. Es lo que consume el dashboard de M5.
   */
  @Get('dashboard')
  dashboard(@Query() filters: AttendanceDashboardFilters) {
    return this.attendanceService.dashboard(filters);
  }

  /**
   * Marcaje por rostro. `foto` siempre; `tipo` y `locationId` opcionales.
   *
   * `usuarioId` fuerza el registro manual (el operador ya eligió a quién
   * pertenece la foto) y se salta el reconocimiento.
   */
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
    @CurrentUser() user: AuthUser,
    @Body('tipo') tipo?: TipoAsistencia,
    @Body('locationId') locationId?: string,
    @Body('usuarioId') usuarioId?: string,
  ) {
    if (!foto) {
      throw new BadRequestException('Se requiere el archivo "foto"');
    }
    return this.attendanceService.check(
      foto,
      tipo,
      enteroOpcional(locationId),
      enteroOpcional(usuarioId),
      user.id,
    );
  }

  /** Pasa un marcaje existente a `metodo: 'manual'` con el admin como confirmante. */
  @Post(':id/confirm')
  confirmar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.attendanceService.confirmarManual(id, user.id);
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
