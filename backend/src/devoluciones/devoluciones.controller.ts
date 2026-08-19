import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/current-user.decorator';
import { DevolucionesService } from './devoluciones.service';

@Controller('devoluciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevolucionesController {
  constructor(private devolucionesService: DevolucionesService) {}

  @Get()
  findAll() {
    return this.devolucionesService.findAll();
  }

  @Post()
  create(@Body() body: any, @CurrentUser() user: AuthUser) {
    return this.devolucionesService.create(body, user);
  }
}