import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp } from './test-utils';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api (GET)', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET) devuelve 404', () => {
    return request(app.getHttpServer()).get('/health').expect(404);
  });
});
