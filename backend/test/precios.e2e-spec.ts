import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { Product } from '../src/entities/product.entity';
import { Inventory } from '../src/entities/inventory.entity';
import { createApp, db, login, bearer, TEST_USERS } from './test-utils';

describe('Precios (e2e)', () => {
  let app: INestApplication<App>;
  let ds: DataSource;
  let adminToken: string;
  let tiendaToken: string;

  const suffix = Date.now().toString(36);
  const codigoFabrica = `E2E-${suffix}-PRECIO`;
  let productId: number | null = null;

  beforeAll(async () => {
    app = await createApp();
    ds = db(app);
    adminToken = await login(
      app,
      TEST_USERS.admin.email,
      TEST_USERS.admin.password,
    );
    tiendaToken = await login(
      app,
      TEST_USERS.tienda.email,
      TEST_USERS.tienda.password,
    );

    const created = await request(app.getHttpServer())
      .post('/api/products')
      .set(bearer(adminToken))
      .send({
        producto: 'Producto de precios e2e',
        fabricante: 'Mazda',
        marca: 'Mazda',
        modelo: 'CX-5',
        codigoFabrica,
        costo: 500,
        precio1: 620,
        precio2: 600,
        precioMayor: 580,
      })
      .expect(201);
    productId = created.body.id as number;
  });

  afterAll(async () => {
    if (productId) {
      await ds.getRepository(Inventory).delete({ productId });
      await ds.getRepository(Product).delete({ id: productId });
    }
    await app.close();
  });

  it('GET /api/precios devuelve la lista de precios', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/precios')
      .set(bearer(adminToken))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const first = res.body[0] as {
      id: number;
      producto: string;
      codigoFabrica: string;
      stockTotal: number;
    };
    expect(first.id).toBeDefined();
    expect(typeof first.codigoFabrica).toBe('string');
    expect(typeof first.stockTotal).toBe('number');
  });

  it('GET /api/precios?codigoFabrica= filtra y devuelve el producto creado', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/precios?codigoFabrica=${encodeURIComponent(codigoFabrica)}`)
      .set(bearer(adminToken))
      .expect(200);

    expect(res.body.length).toBe(1);
    const fila = res.body[0] as {
      id: number;
      costo: number;
      precio1: number;
      precio2: number;
      precioMayor: number;
    };
    expect(fila.id).toBe(productId);
    expect(fila.costo).toBe(500);
    expect(fila.precio1).toBe(620);
  });

  it('GET /api/precios/export devuelve un archivo Excel', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/precios/export')
      .set(bearer(adminToken))
      .expect(200);

    expect(res.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(Number(res.headers['content-length'])).toBeGreaterThan(100);
  });

  it('PATCH /api/precios/:id actualiza precios', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/precios/${productId}`)
      .set(bearer(adminToken))
      .send({ precio1: 660, precio2: 640, precioMayor: 610 })
      .expect(200);

    expect(res.body.precio1).toBe(660);
    expect(res.body.precio2).toBe(640);
    expect(res.body.precioMayor).toBe(610);
  });

  it('PATCH /api/precios/:id sin precios devuelve 400', async () => {
    await request(app.getHttpServer())
      .patch(`/api/precios/${productId}`)
      .set(bearer(adminToken))
      .send({})
      .expect(400);
  });

  it('PATCH /api/precios/:id con rol tienda devuelve 403', async () => {
    await request(app.getHttpServer())
      .patch(`/api/precios/${productId}`)
      .set(bearer(tiendaToken))
      .send({ precio1: 1 })
      .expect(403);
  });
});
