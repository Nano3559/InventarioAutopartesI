import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createApp, login, bearer, TEST_USERS } from './test-utils';

describe('Locations (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/locations devuelve las 7 ubicaciones (4 almacenes + 3 tiendas)', async () => {
    const token = await login(
      app,
      TEST_USERS.admin.email,
      TEST_USERS.admin.password,
    );
    const res = await request(app.getHttpServer())
      .get('/api/locations')
      .set(bearer(token))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(7);

    const almacenes = (res.body as Array<{ tipo: string }>).filter(
      (l) => l.tipo === 'almacen',
    );
    const tiendas = (res.body as Array<{ tipo: string }>).filter(
      (l) => l.tipo === 'tienda',
    );
    expect(almacenes.length).toBeGreaterThanOrEqual(4);
    expect(tiendas.length).toBeGreaterThanOrEqual(3);

    const first = res.body[0] as { codigo: string; nombre: string };
    expect(typeof first.codigo).toBe('string');
    expect(typeof first.nombre).toBe('string');
  });

  it('GET /api/locations sin token devuelve 401', async () => {
    await request(app.getHttpServer()).get('/api/locations').expect(401);
  });

  it('consulta de ubicaciones accesible para rol tienda', async () => {
    const token = await login(
      app,
      TEST_USERS.tienda.email,
      TEST_USERS.tienda.password,
    );
    const res = await request(app.getHttpServer())
      .get('/api/locations')
      .set(bearer(token))
      .expect(200);
    expect(res.body.length).toBe(7);
  });
});
