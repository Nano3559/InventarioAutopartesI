import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { Proveedor } from '../src/entities/proveedor.entity';
import { createApp, db, login, bearer, TEST_USERS } from './test-utils';

describe('Proveedores (e2e)', () => {
  let app: INestApplication<App>;
  let ds: DataSource;
  let adminToken: string;
  let tiendaToken: string;

  const suffix = Date.now().toString(36);
  const nombre = `Proveedor E2E ${suffix}`;
  let proveedorId: number | null = null;

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
  });

  afterAll(async () => {
    if (proveedorId) {
      await ds.getRepository(Proveedor).delete({ id: proveedorId });
    }
    await app.close();
  });

  it('GET /api/proveedores devuelve la lista', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/proveedores')
      .set(bearer(adminToken))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });

  it('POST /api/proveedores crea un proveedor', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/proveedores')
      .set(bearer(adminToken))
      .send({ nombre, pais: 'Taiwán', contacto: 'proveedor@e2e.com' })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.nombre).toBe(nombre);
    expect(res.body.pais).toBe('Taiwán');
    expect(res.body.contacto).toBe('proveedor@e2e.com');
    proveedorId = res.body.id as number;
  });

  it('POST /api/proveedores sin nombre devuelve 400', async () => {
    await request(app.getHttpServer())
      .post('/api/proveedores')
      .set(bearer(adminToken))
      .send({ pais: 'Bolivia' })
      .expect(400);
  });

  it('POST /api/proveedores duplicado devuelve 400', async () => {
    await request(app.getHttpServer())
      .post('/api/proveedores')
      .set(bearer(adminToken))
      .send({ nombre })
      .expect(400);
  });

  it('POST /api/proveedores con rol tienda devuelve 403', async () => {
    await request(app.getHttpServer())
      .post('/api/proveedores')
      .set(bearer(tiendaToken))
      .send({ nombre: `No permitido ${suffix}` })
      .expect(403);
  });

  it('GET /api/proveedores/:id devuelve el proveedor', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/proveedores/${proveedorId}`)
      .set(bearer(adminToken))
      .expect(200);

    expect(res.body.id).toBe(proveedorId);
    expect(res.body.nombre).toBe(nombre);
  });

  it('GET /api/proveedores/:id inexistente devuelve 404', async () => {
    await request(app.getHttpServer())
      .get('/api/proveedores/999999')
      .set(bearer(adminToken))
      .expect(404);
  });

  it('PATCH /api/proveedores/:id actualiza los datos', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/proveedores/${proveedorId}`)
      .set(bearer(adminToken))
      .send({ pais: 'China', contacto: null })
      .expect(200);

    expect(res.body.pais).toBe('China');
    expect(res.body.contacto).toBeNull();
  });

  it('PATCH /api/proveedores/:id con nombre vacío devuelve 400', async () => {
    await request(app.getHttpServer())
      .patch(`/api/proveedores/${proveedorId}`)
      .set(bearer(adminToken))
      .send({ nombre: '   ' })
      .expect(400);
  });

  it('DELETE /api/proveedores/:id elimina el proveedor', async () => {
    await request(app.getHttpServer())
      .delete(`/api/proveedores/${proveedorId}`)
      .set(bearer(adminToken))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/proveedores/${proveedorId}`)
      .set(bearer(adminToken))
      .expect(404);
    proveedorId = null;
  });
});
