import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { SalesService } from './sales.service';
import type { SaleInput } from './sales.service';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Get()
  findAll(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('tiendaId') tiendaId?: string,
    @Query('tipo') tipo?: string,
    @Query('search') search?: string,
  ) {
    return this.salesService.findAll({
      desde,
      hasta,
      tiendaId: tiendaId ? Number(tiendaId) : undefined,
      tipo,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.findOne(id);
  }

  @Get(':id/nota')
  async notaVenta(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const html = await this.salesService.notaVenta(id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Post()
  @Roles('admin', 'tienda', 'inventario')
  create(@Body() body: SaleInput, @CurrentUser() user: AuthUser) {
    return this.salesService.create(body, user);
  }

  @Patch(':id')
  @Roles('admin', 'tienda', 'inventario')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SaleInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.salesService.update(id, body, user);
  }

  @Post('import-mayor/preview')
  @Roles('admin', 'tienda', 'inventario')
  @UseInterceptors(FileInterceptor('archivo'))
  async previewExcel(@UploadedFile() file: Express.Multer.File) {
    return this.salesService.previewExcel(file);
  }

  @Post('import-mayor')
  @Roles('admin', 'tienda', 'inventario')
  @UseInterceptors(FileInterceptor('archivo'))
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @Body('cliente') clienteStr?: string,
    @Body('requiereFactura') requiereFactura?: string,
    @Body('lugarEntrega') lugarEntrega?: string,
    @Body('paraQuien') paraQuien?: string,
    @Body('locationId') locationId?: string,
    @Body('pagos') pagosStr?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    let cliente:
      { nombre: string; ciNit?: string; celular?: string } | undefined;
    if (clienteStr) {
      try {
        const parsed: unknown = JSON.parse(clienteStr);
        if (parsed && typeof parsed === 'object' && 'nombre' in parsed) {
          cliente = parsed as {
            nombre: string;
            ciNit?: string;
            celular?: string;
          };
        } else {
          cliente = { nombre: clienteStr };
        }
      } catch {
        cliente = { nombre: clienteStr };
      }
    }

    let pagos: { metodo: string; monto: number }[] | undefined;
    if (pagosStr) {
      try {
        const parsed: unknown = JSON.parse(pagosStr);
        if (Array.isArray(parsed)) {
          pagos = parsed as { metodo: string; monto: number }[];
        }
      } catch {
        // ignore
      }
    }

    return this.salesService.importExcel(
      file,
      {
        cliente,
        requiereFactura: requiereFactura === 'true',
        lugarEntrega,
        paraQuien,
        locationId: locationId ? Number(locationId) : undefined,
        pagos,
      },
      user!,
    );
  }
}
