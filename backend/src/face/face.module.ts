import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { FaceService } from './face.service';
import { FaceController } from './face.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [FaceController],
  providers: [FaceService],
  exports: [FaceService],
})
export class FaceModule {}
