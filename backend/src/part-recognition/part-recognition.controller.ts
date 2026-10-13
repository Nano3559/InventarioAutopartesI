import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  PART_IMAGE_LIMIT,
  PartRecognitionService,
} from './part-recognition.service';

@Controller('part-recognition')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('cliente')
export class PartRecognitionController {
  constructor(private readonly recognition: PartRecognitionService) {}

  @Post('predict')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: PART_IMAGE_LIMIT, files: 1, fields: 0, parts: 2 },
      fileFilter: (_req, file, cb) => {
        if (
          !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
        ) {
          cb(
            new BadRequestException(
              'Solo se permiten imágenes JPG, PNG y WebP',
            ),
            false,
          );
        } else cb(null, true);
      },
    }),
  )
  predict(@UploadedFile() file: Express.Multer.File | undefined) {
    return this.recognition.predict(file);
  }

  @Get('health') health() {
    return this.recognition.health();
  }
  @Get('model/info') modelInfo() {
    return this.recognition.modelInfo();
  }
  @Get('classes') classes() {
    return this.recognition.classes();
  }
}
