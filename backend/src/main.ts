import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });

  const port = parseInt(process.env.PORT ?? '3000', 10);

  const listen = async (p: number): Promise<void> => {
    try {
      await app.listen(p);
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code === 'EADDRINUSE') {
        console.warn(`Puerto ${p} en uso, intentando ${p + 1}...`);
        return listen(p + 1);
      }
      throw err;
    }
  };

  void listen(port);
}
void bootstrap();
