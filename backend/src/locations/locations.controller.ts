import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LocationsService } from './locations.service';

@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'tienda', 'inventario')
export class LocationsController {
  constructor(private locationsService: LocationsService) {}

  @Get()
  findAll() {
    return this.locationsService.findAll();
  }
}
