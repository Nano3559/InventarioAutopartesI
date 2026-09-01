import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();

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
