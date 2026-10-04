import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FaceService } from './face.service';

/**
 * Diagnóstico del reconocimiento facial (solo admin).
 *
 * Estas dos rutas no son del flujo del hito: existen para poder **verificar un
 * despliegue sin registrar rostros de prueba**. `GET /face/status` es la prueba de
 * la rehidratación del índice tras el spin-down de Render (tarea B6), y
 * `POST /face/warmup` carga el modelo bajo demanda para medir el cold start y
 * dejar la instancia caliente antes de la demo.
 */
@Controller('face')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class FaceController {
  constructor(private readonly faceService: FaceService) {}

  @Get('status')
  status() {
    return this.faceService.estado();
  }

  @Post('warmup')
  warmup() {
    return this.faceService.warmup();
  }
}
