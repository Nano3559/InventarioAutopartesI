import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { FaceService } from './face.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [FaceService],
  exports: [FaceService],
})
export class FaceModule {}
