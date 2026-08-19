import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { SolicitudesService } from './solicitudes.service';

@Controller('solicitudes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SolicitudesController {
  constructor(private solicitudesService: SolicitudesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.solicitudesService.findAll(user);
  }

  @Post()
  create(@Body() body: any, @CurrentUser() user: AuthUser) {
    return this.solicitudesService.create(body, user);
  }

  @Patch(':id/estado')
  @Roles('admin', 'inventario')
  updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { estado: string; origenId?: number },
    @CurrentUser() user: AuthUser,
  ) {
    return this.solicitudesService.updateEstado(id, body, user);
  }
}
