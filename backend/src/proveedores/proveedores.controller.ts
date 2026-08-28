import {
  Body,
  Controller,
  Delete,
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
import { ProveedoresService } from './proveedores.service';
import type { ProveedorInput } from './proveedores.service';

@Controller('proveedores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProveedoresController {
  constructor(private proveedoresService: ProveedoresService) {}

  @Get()
  findAll() {
    return this.proveedoresService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.proveedoresService.findOne(id);
  }

  @Post()
  @Roles('admin')
  create(@Body() body: ProveedorInput) {
    return this.proveedoresService.create(body);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Partial<ProveedorInput>,
  ) {
    return this.proveedoresService.update(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.proveedoresService.remove(id);
  }
}
