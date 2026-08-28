import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { Product } from '../src/entities/product.entity';
import { Inventory } from '../src/entities/inventory.entity';
import { Movimiento } from '../src/entities/movimiento.entity';
import { createApp, db, login, bearer, TEST_USERS } from './test-utils';

describe('Movimientos (e2e)', () => {
  let app: INestApplication<App>;
  let ds: DataSource;
  let adminToken: string;
  let tiendaToken: string;

  const suffix = Date.now().toString(36);
  const codigoFabrica = `E2E-${suffix}-MOV`;
  let productId: number | null = null;
  let tiendaId: number;
  let almacenId: number;
  let movimientoId: number | null = null;

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
    almacenId = locations.find((l) => l.codigo === 'ALM-1')!.id;

    const created = await request(app.getHttpServer())
      .post('/api/products')
      .set(bearer(adminToken))
      .send({
        producto: 'Producto movimiento e2e',
        fabricante: 'Dodge',
        marca: 'Dodge',
        modelo: 'Ram',
        codigoFabrica,
        costo: 90,
        precio1: 150,
        stock: { [almacenId]: 15 },
      })
      .expect(201);
    productId = created.body.id as number;
  });

  afterAll(async () => {
    if (movimientoId) {
      await ds.getRepository(Movimiento).delete({ id: movimientoId });
    }
    if (productId) {
      await ds.getRepository(Inventory).delete({ productId });
      await ds.getRepository(Product).delete({ id: productId });
    }
    await app.close();
  });

  it('POST /api/movimientos traslada stock entre ubicaciones', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/movimientos')
      .set(bearer(adminToken))
      .send({
        productId,
        cantidad: 5,
        origenId: almacenId,
        destinoId: tiendaId,
        observacion: 'Traslado e2e',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.cantidad).toBe(5);
    expect(res.body.origenId).toBe(almacenId);
    expect(res.body.destinoId).toBe(tiendaId);
    movimientoId = res.body.id as number;

    const stock = await request(app.getHttpServer())
      .get(`/api/products/${productId}/stock`)
      .set(bearer(adminToken))
      .expect(200);
    const byLocation = stock.body as Array<{
      locationId: number;
      cantidad: number;
    }>;
    expect(byLocation.find((s) => s.locationId === almacenId)?.cantidad).toBe(
      10,
    );
    expect(byLocation.find((s) => s.locationId === tiendaId)?.cantidad).toBe(5);
  });

  it('POST /api/movimientos con stock insuficiente devuelve 400', async () => {
    await request(app.getHttpServer())
      .post('/api/movimientos')
      .set(bearer(adminToken))
      .send({
        productId,
        cantidad: 999,
        origenId: almacenId,
        destinoId: tiendaId,
      })
      .expect(400);
  });

  it('POST /api/movimientos origen=destino devuelve 400', async () => {
    await request(app.getHttpServer())
      .post('/api/movimientos')
      .set(bearer(adminToken))
      .send({
        productId,
        cantidad: 1,
        origenId: almacenId,
        destinoId: almacenId,
      })
      .expect(400);
  });

  it('POST /api/movimientos con rol tienda devuelve 403', async () => {
    await request(app.getHttpServer())
      .post('/api/movimientos')
      .set(bearer(tiendaToken))
      .send({
        productId,
        cantidad: 1,
        origenId: almacenId,
        destinoId: tiendaId,
      })
      .expect(403);
  });

  it('GET /api/movimientos devuelve la lista con el movimiento creado', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/movimientos')
      .set(bearer(adminToken))
      .expect(200);

    expect(
      (res.body as Array<{ id: number }>).some((m) => m.id === movimientoId),
    ).toBe(true);
  });
});
