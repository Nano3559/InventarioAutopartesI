import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Product } from '../src/entities/product.entity';
import { Inventory } from '../src/entities/inventory.entity';
import { Solicitud } from '../src/entities/solicitud.entity';
import { Movimiento } from '../src/entities/movimiento.entity';
import { createApp, db, login, bearer, TEST_USERS } from './test-utils';

describe('Solicitudes (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let adminToken: string;
  let tiendaToken: string;

  const suffix = Date.now().toString(36);
  const codigoFabrica = `E2E-${suffix}-SOL`;
  let productId: number | null = null;
  let tiendaId: number;
  let almacenId: number;
  let solicitudId: number | null = null;
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
        producto: 'Producto solicitud e2e',
        fabricante: 'Jeep',
        marca: 'Jeep',
        modelo: 'Cherokee',
        codigoFabrica,
        costo: 70,
        precio1: 120,
        stock: { [almacenId]: 20 },
      })
      .expect(201);
    productId = created.body.id as number;
  });

  afterAll(async () => {
    if (movimientoId) {
      await ds.getRepository(Movimiento).delete({ id: movimientoId });
    }
    if (solicitudId) {
      await ds.getRepository(Solicitud).delete({ id: solicitudId });
    }
    if (productId) {
      await ds.getRepository(Inventory).delete({ productId });
      await ds.getRepository(Product).delete({ id: productId });
    }
    await app.close();
  });

  it('POST /api/solicitudes crea una solicitud pendiente', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/solicitudes')
      .set(bearer(tiendaToken))
      .send({ productId, cantidad: 3 })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.estado).toBe('Pendiente');
    expect(res.body.tiendaId).toBe(tiendaId);
    expect(res.body.productId).toBe(productId);
    solicitudId = res.body.id as number;
  });

  it('POST /api/solicitudes con cantidad 0 devuelve 400', async () => {
    await request(app.getHttpServer())
      .post('/api/solicitudes')
      .set(bearer(tiendaToken))
      .send({ productId, cantidad: 0 })
      .expect(400);
  });

  it('GET /api/solicitudes (tienda) solo ve sus solicitudes', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/solicitudes')
      .set(bearer(tiendaToken))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const all = res.body as Array<{ id: number; tiendaId: number }>;
    expect(all.some((s) => s.id === solicitudId)).toBe(true);
    expect(all.every((s) => s.tiendaId === tiendaId)).toBe(true);
  });

  it('PATCH estado inválido devuelve 400', async () => {
    await request(app.getHttpServer())
      .patch(`/api/solicitudes/${solicitudId}/estado`)
      .set(bearer(adminToken))
      .send({ estado: 'Inventado' })
      .expect(400);
  });

  it('PATCH estado con rol tienda devuelve 403', async () => {
    await request(app.getHttpServer())
      .patch(`/api/solicitudes/${solicitudId}/estado`)
      .set(bearer(tiendaToken))
      .send({ estado: 'Enviado' })
      .expect(403);
  });

  it('PATCH /api/solicitudes/:id/estado lleva la solicitud a Enviado y genera movimiento', async () => {
    await request(app.getHttpServer())
      .patch(`/api/solicitudes/${solicitudId}/estado`)
      .set(bearer(adminToken))
      .send({ estado: 'En preparación' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .patch(`/api/solicitudes/${solicitudId}/estado`)
      .set(bearer(adminToken))
      .send({ estado: 'Enviado', origenId: almacenId })
      .expect(200);

    expect(res.body.estado).toBe('Enviado');
    expect(res.body.origenId).toBe(almacenId);

    const movimientos = (
      await request(app.getHttpServer())
        .get('/api/movimientos')
        .set(bearer(adminToken))
        .expect(200)
    ).body as Array<{ id: number; observacion: string | null }>;
    const relacionado = movimientos.find(
      (m) => m.observacion === `Despacho de solicitud #${solicitudId}`,
    );
    expect(relacionado).toBeDefined();
    movimientoId = relacionado!.id;

    const stock = await request(app.getHttpServer())
      .get(`/api/products/${productId}/stock`)
      .set(bearer(adminToken))
      .expect(200);
    const byLocation = stock.body as Array<{
      locationId: number;
      cantidad: number;
    }>;
    expect(byLocation.find((s) => s.locationId === almacenId)?.cantidad).toBe(
      17,
    );
    expect(byLocation.find((s) => s.locationId === tiendaId)?.cantidad).toBe(3);
  });

  it('PATCH solicitud inexistente devuelve 404', async () => {
    await request(app.getHttpServer())
      .patch('/api/solicitudes/999999/estado')
      .set(bearer(adminToken))
      .send({ estado: 'Enviado' })
      .expect(404);
  });
});
