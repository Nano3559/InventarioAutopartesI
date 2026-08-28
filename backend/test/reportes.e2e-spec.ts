import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createApp, login, bearer, TEST_USERS } from './test-utils';

describe('Reportes (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let tiendaToken: string;

  beforeAll(async () => {
    app = await createApp();
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/reportes/dashboard devuelve el resumen', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/reportes/dashboard')
      .set(bearer(adminToken))
      .expect(200);

    expect(res.body.inventario).toBeDefined();
    expect(typeof res.body.inventario.totalProductos).toBe('number');
    expect(typeof res.body.inventario.stockBajo).toBe('number');
    expect(typeof res.body.inventario.valorInventario).toBe('number');
    expect(typeof res.body.solicitudesPendientes).toBe('number');
    expect(res.body.ventas).toBeDefined();
    expect(typeof res.body.ventas.mes.total).toBe('number');
  });

  it('GET /api/reportes/ventas devuelve filas de venta', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/reportes/ventas')
      .set(bearer(adminToken))
      .expect(200);

    expect(res.body.filtros).toBeDefined();
    expect(typeof res.body.resumen.ventas).toBe('number');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('GET /api/reportes/ventas filtra por marca', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/reportes/ventas?marca=Toyota')
      .set(bearer(adminToken))
      .expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
    for (const item of res.body.items as Array<{ marca: string }>) {
      expect(item.marca).toBe('Toyota');
    }
  });

  it('GET /api/reportes/mensual (admin) devuelve filas mensuales', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/reportes/mensual')
      .set(bearer(adminToken))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    for (const fila of res.body as Array<{ mes: number; tienda: string }>) {
      expect(typeof fila.mes).toBe('number');
      expect(typeof fila.tienda).toBe('string');
    }
  });

  it('GET /api/reportes/mensual con rol tienda devuelve 403', async () => {
    await request(app.getHttpServer())
      .get('/api/reportes/mensual')
      .set(bearer(tiendaToken))
      .expect(403);
  });

  it('GET /api/reportes/proveedores (admin) devuelve el resumen por proveedor', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/reportes/proveedores')
      .set(bearer(adminToken))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    for (const fila of res.body as Array<{
      proveedor: string;
      facturas: number;
    }>) {
      expect(typeof fila.proveedor).toBe('string');
      expect(typeof fila.facturas).toBe('number');
    }
  });

  it('GET /api/reportes/proveedores con rol tienda devuelve 403', async () => {
    await request(app.getHttpServer())
      .get('/api/reportes/proveedores')
      .set(bearer(tiendaToken))
      .expect(403);
  });

  it('GET /api/reportes/dashboard sin token devuelve 401', async () => {
    await request(app.getHttpServer())
      .get('/api/reportes/dashboard')
      .expect(401);
  });
});
