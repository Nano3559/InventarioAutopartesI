import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asistencia } from '../entities/asistencia.entity';
import { User } from '../entities/user.entity';
import { Location } from '../entities/location.entity';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { FaceModule } from '../face/face.module';

@Module({
  imports: [TypeOrmModule.forFeature([Asistencia, User, Location]), FaceModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
