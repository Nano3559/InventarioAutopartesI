import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { User } from '../src/entities/user.entity';
import { UMBRAL_CONFIANZA_FACIAL } from '../src/common/constants';
import { createApp, db, login, bearer, TEST_USERS } from './test-utils';

/**
 * Diagnóstico del reconocimiento facial (rutas de la tarea B6). Se prueba **sin
 * correr ArcFace**: la ruta de modelo inexistente es justamente el error que hay
 * que ver bien claro en un despliegue mal configurado.
 */
describe('Face status/warmup (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let adminToken: string;
  let tiendaToken: string;

  beforeAll(async () => {
    delete process.env.ARCFACE_MODEL;
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
    delete process.env.ARCFACE_MODEL;
    await app.close();
  });

  it('GET /api/face/status informa el índice y la rehidratación', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/face/status')
      .set(bearer(adminToken))
      .expect(200);

    const embeddings = await ds
      .getRepository(User)
      .createQueryBuilder('u')
      .select('u.id')
      .where('u.embedding IS NOT NULL')
      .andWhere('u.activo = true')
      .getMany();

    expect(res.body.umbral).toBe(UMBRAL_CONFIANZA_FACIAL);
    expect(res.body.rostrosEnBase).toBe(embeddings.length);
    // El `onModuleInit` rehidrata el índice: tiene que coincidir con la BD.
    expect(res.body.indiceEnMemoria).toBe(embeddings.length);
    expect(res.body.indiceCompleto).toBe(true);
    expect(res.body.bucket).toBe('faces');
    expect(res.body.modelo.dimension).toBe(512);
    expect(res.body.modelo.entrada).toBe('112x112');
    // La InferenceSession es perezosa: no debe estar cargada si nadie marcó.
    expect(res.body.modelo.cargada).toBe(false);
  });

  it('GET /api/face/status exige token de admin', async () => {
    await request(app.getHttpServer()).get('/api/face/status').expect(401);
    await request(app.getHttpServer())
      .get('/api/face/status')
      .set(bearer(tiendaToken))
      .expect(403);
  });

  it('un ARCFACE_MODEL inexistente se reporta en status y rompe el warmup', async () => {
    process.env.ARCFACE_MODEL = 'C:/no/existe/arcface.onnx';

    const res = await request(app.getHttpServer())
      .get('/api/face/status')
      .set(bearer(adminToken))
      .expect(200);
    expect(res.body.modelo.disponible).toBe(false);
    expect(res.body.modelo.ruta).toBeNull();
    expect(String(res.body.modelo.detalle)).toContain('ARCFACE_MODEL');

    const fallo = await request(app.getHttpServer())
      .post('/api/face/warmup')
      .set(bearer(adminToken))
      .expect(503);
    expect(String(fallo.body.message)).toContain('ARCFACE_MODEL');
  });
});
