import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PartRecognitionController } from './part-recognition.controller';
import { PartRecognitionService } from './part-recognition.service';

@Module({
  imports: [ConfigModule],
  controllers: [PartRecognitionController],
  providers: [PartRecognitionService],
})
export class PartRecognitionModule {}
