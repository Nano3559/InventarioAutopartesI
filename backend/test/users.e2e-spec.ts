import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { User } from '../src/entities/user.entity';
import { createApp, db, login, bearer, TEST_USERS } from './test-utils';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let adminToken: string;
  let tiendaToken: string;

  const createdAt = Date.now().toString(36);
  let createdUserId: number | null = null;

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
    if (createdUserId) {
      await ds.getRepository(User).delete({ id: createdUserId });
    }
    await app.close();
  });

  it('GET /api/users (admin) devuelve la lista de usuarios', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users')
      .set(bearer(adminToken))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(5);
    expect(res.body[0].password).toBeUndefined();
  });

  it('GET /api/users con rol tienda devuelve 403', async () => {
    await request(app.getHttpServer())
      .get('/api/users')
      .set(bearer(tiendaToken))
      .expect(403);
  });

  it('POST /api/users crea y devuelve el usuario (sin password)', async () => {
    const email = `e2e-${createdAt}@auto.test`;
    const res = await request(app.getHttpServer())
      .post('/api/users')
      .set(bearer(adminToken))
      .send({ nombre: 'Test E2E', email, password: '12345678', rol: 'tienda' })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.email).toBe(email);
    expect(res.body.password).toBeUndefined();
    createdUserId = res.body.id as number;
  });

  it('POST /api/users con email duplicado devuelve 400', async () => {
    const email = `e2e-${createdAt}@auto.test`;
    await request(app.getHttpServer())
      .post('/api/users')
      .set(bearer(adminToken))
      .send({ nombre: 'Duplicado', email, password: '12345678', rol: 'tienda' })
      .expect(400);
  });

  it('POST /api/users con rol inválido devuelve 400', async () => {
    await request(app.getHttpServer())
      .post('/api/users')
      .set(bearer(adminToken))
      .send({
        nombre: 'Rol malo',
        email: `e2e-rol-${createdAt}@auto.test`,
        password: '12345678',
        rol: 'superadmin',
      })
      .expect(400);
  });

  it('PATCH /api/users/:id actualiza el usuario', async () => {
    expect(createdUserId).not.toBeNull();
    const res = await request(app.getHttpServer())
      .patch(`/api/users/${createdUserId}`)
      .set(bearer(adminToken))
      .send({ nombre: 'Test E2E Actualizado' })
      .expect(200);

    expect(res.body.nombre).toBe('Test E2E Actualizado');
  });

  it('PATCH /api/users/:id inexistente devuelve 404', async () => {
    await request(app.getHttpServer())
      .patch('/api/users/999999')
      .set(bearer(adminToken))
      .send({ nombre: 'Nadie' })
      .expect(404);
  });

  it('DELETE /api/users/:id elimina el usuario', async () => {
    expect(createdUserId).not.toBeNull();
    await request(app.getHttpServer())
      .delete(`/api/users/${createdUserId}`)
      .set(bearer(adminToken))
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/users')
      .set(bearer(adminToken))
      .expect((res) => {
        const found = (res.body as Array<{ id: number }>).some(
          (u) => u.id === createdUserId,
        );
        expect(found).toBe(false);
      });
    createdUserId = null;
  });

  it('DELETE /api/users/:id inexistente devuelve 404', async () => {
    await request(app.getHttpServer())
      .delete('/api/users/999999')
      .set(bearer(adminToken))
      .expect(404);
  });
});
