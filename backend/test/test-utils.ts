import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { FaceService } from '../src/face/face.service';

/**
 * `rostroFalso` reemplaza el `FaceService` real por un doble: `onnxruntime-node`
 * no corre dentro de Jest (su binding valida los typed arrays con `instanceof`
 * de su propio realm). Es el patrón que permite probar `/attendance/check`.
 */
export async function createApp(
  rostroFalso?: unknown,
): Promise<INestApplication> {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  if (rostroFalso) builder.overrideProvider(FaceService).useValue(rostroFalso);
  const moduleFixture = await builder.compile();
  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();
  return app;
}

export function db(app: INestApplication): DataSource {
  return app.get(DataSource);
}

export async function login(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);
  expect(res.body.token).toBeDefined();
  expect(typeof res.body.token).toBe('string');
  return res.body.token as string;
}

export const bearer = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const TEST_USERS = {
  admin: { email: 'admin@importadoras.com', password: 'admin123' },
  inventario: {
    email: 'inventario@importadoras.com',
    password: 'inventario123',
  },
  tienda: { email: 'tienda1@importadoras.com', password: 'venta123' },
};
