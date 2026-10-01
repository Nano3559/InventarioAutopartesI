import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { multerImagenes } from '../common/image-upload';
import { FOTOS_MAXIMO_REGISTRO } from '../common/constants';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
// Ojo: el `@Roles('admin')` de la clase alcanza también a las rutas de rostro.
// Si alguna vez debe abrirse a otro rol, hay que **repetir** `@Roles(...)` en el
// método: el `RolesGuard` resuelve handler antes que clase.
@Roles('admin')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * Rostros registrados con **URL firmada** de la foto (el bucket `faces` es
   * privado). Antes de `@Get(':id')` no aplica: no hay ruta paramétrica conflictiva.
   */
  @Get('rostros')
  rostros() {
    return this.usersService.listarRostros();
  }

  /**
   * Registro facial (multipart): `nombre`, `apellido` y `fotos[]`.
   * Asocia el rostro a un `users` existente: **404** si no hay nadie con ese
   * nombre + apellido, y **409** si hay varios (el operador debe elegir).
   */
  @Post('face/register')
  @UseInterceptors(
    FilesInterceptor('fotos', FOTOS_MAXIMO_REGISTRO, multerImagenes()),
  )
  registerFace(
    @Body('nombre') nombre: string,
    @Body('apellido') apellido: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.usersService.registrarRostro(nombre, apellido, files);
  }

  @Post()
  create(@Body() body: any) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
