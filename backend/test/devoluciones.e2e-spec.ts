import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { Product } from '../src/entities/product.entity';
import { Inventory } from '../src/entities/inventory.entity';
import { Devolucion } from '../src/entities/devolucion.entity';
import { createApp, db, login, bearer, TEST_USERS } from './test-utils';

describe('Devoluciones (e2e)', () => {
  let app: INestApplication<App>;
  let ds: DataSource;
  let adminToken: string;
  let tiendaToken: string;

  const suffix = Date.now().toString(36);
  const codigoFabrica = `E2E-${suffix}-DEV`;
  let productId: number | null = null;
  let tiendaId: number;
  let devolucionId: number | null = null;

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

    const locations = (
      await request(app.getHttpServer())
        .get('/api/locations')
        .set(bearer(adminToken))
        .expect(200)
    ).body as Array<{ id: number; codigo: string }>;
    tiendaId = locations.find((l) => l.codigo === 'TDA-1')!.id;

    const created = await request(app.getHttpServer())
      .post('/api/products')
      .set(bearer(adminToken))
      .send({
        producto: 'Producto devolución e2e',
        fabricante: 'Chevrolet',
        marca: 'Chevrolet',
        modelo: 'Sail',
        codigoFabrica,
        costo: 80,
        precio1: 130,
        stock: { [tiendaId]: 10 },
      })
      .expect(201);
    productId = created.body.id as number;
  });

  afterAll(async () => {
    if (devolucionId) {
      await ds.getRepository(Devolucion).delete({ id: devolucionId });
    }
    if (productId) {
      await ds.getRepository(Inventory).delete({ productId });
      await ds.getRepository(Product).delete({ id: productId });
    }
    await app.close();
  });

  it('POST /api/devoluciones registra una devolución y repone stock', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/devoluciones')
      .set(bearer(tiendaToken))
      .send({
        productId,
        motivo: 'Cliente devolvió el producto',
        cantidad: 2,
        monto: 130,
        metodo: 'efectivo',
        locationId: tiendaId,
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.cantidad).toBe(2);
    expect(res.body.productId).toBe(productId);
    devolucionId = res.body.id as number;

    const stock = await request(app.getHttpServer())
      .get(`/api/products/${productId}/stock`)
      .set(bearer(adminToken))
      .expect(200);
    const tienda = (
      stock.body as Array<{ locationId: number; cantidad: number }>
    ).find((s) => s.locationId === tiendaId);
    expect(tienda?.cantidad).toBe(12);
  });

  it('POST /api/devoluciones con cantidad 0 devuelve 400', async () => {
    await request(app.getHttpServer())
      .post('/api/devoluciones')
      .set(bearer(tiendaToken))
      .send({
        productId,
        motivo: 'Prueba',
        cantidad: 0,
        monto: 10,
        metodo: 'efectivo',
      })
      .expect(400);
  });

  it('POST /api/devoluciones con producto inexistente devuelve 404', async () => {
    await request(app.getHttpServer())
      .post('/api/devoluciones')
      .set(bearer(tiendaToken))
      .send({
        productId: 999999,
        motivo: 'Prueba',
        cantidad: 1,
        monto: 10,
        metodo: 'efectivo',
      })
      .expect(404);
  });

  it('GET /api/devoluciones devuelve la lista con la devolución creada', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/devoluciones')
      .set(bearer(adminToken))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(
      (res.body as Array<{ id: number }>).some((d) => d.id === devolucionId),
    ).toBe(true);
  });
});
