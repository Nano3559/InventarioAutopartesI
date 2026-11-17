import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): number {
    // ERROR INTENCIONAL PARA PRUEBA DE BLOQUEO DE CI (FASE 3)
    return this.appService.getHello();
  }
}
