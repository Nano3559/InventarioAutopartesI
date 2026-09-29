import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asistencia } from '../entities/asistencia.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Asistencia])],
})
export class AttendanceModule {}
