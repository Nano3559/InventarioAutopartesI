import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CostosService } from './costos.service';
import type { FacturaItemInput } from './costos.service';

interface CreateFacturaBody {
  proveedorId?: number | string;
  numero?: string;
  tipoCambio?: number | string;
  porcentaje?: number | string;
  monto?: number | string;
  items?: string | FacturaItemInput[];
}

@Controller('costos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CostosController {
  constructor(private costosService: CostosService) {}

  @Get('facturas')
  findAll() {
    return this.costosService.findAll();
  }

  @Post('facturas')
  @Roles('admin')
  @UseInterceptors(FileInterceptor('archivo'))
  create(
    @Body() body: CreateFacturaBody,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    let items = body.items;
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items) as FacturaItemInput[];
      } catch {
        items = [];
      }
    }
    return this.costosService.create(
      {
        proveedorId: Number(body.proveedorId),
        numero: body.numero ?? '',
        tipoCambio: body.tipoCambio ? Number(body.tipoCambio) : undefined,
        porcentaje: body.porcentaje ? Number(body.porcentaje) : undefined,
        monto: body.monto ? Number(body.monto) : undefined,
        items: items ?? [],
      },
      archivo,
    );
  }
}
