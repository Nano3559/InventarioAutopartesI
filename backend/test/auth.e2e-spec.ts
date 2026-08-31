import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp, TEST_USERS, bearer } from './test-utils';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/login con credenciales válidas devuelve token y usuario', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: TEST_USERS.admin.email,
        password: TEST_USERS.admin.password,
      })
      .expect(200);

    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(TEST_USERS.admin.email);
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.rol).toBe('admin');
  });

  it('POST /api/auth/login con contraseña incorrecta devuelve 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: TEST_USERS.admin.email, password: 'incorrecta' })
      .expect(401);
  });

  it('POST /api/auth/login con usuario inexistente devuelve 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'noexiste@autorepuestos.com', password: 'x' })
      .expect(401);
  });

  it('POST /api/auth/me con token devuelve el usuario autenticado', async () => {
    const token = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: TEST_USERS.tienda.email,
        password: TEST_USERS.tienda.password,
      })
      .then((r) => r.body.token as string);

    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set(bearer(token))
      .expect(200);

    expect(res.body.email).toBe(TEST_USERS.tienda.email);
    expect(res.body.rol).toBe('tienda');
    expect(res.body.password).toBeUndefined();
  });

  it('GET /api/auth/me sin token devuelve 401', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('GET /api/auth/me con token inválido devuelve 401', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set(bearer('token-invalido'))
      .expect(401);
  });
});
