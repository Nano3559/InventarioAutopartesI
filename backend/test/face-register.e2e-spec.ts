import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { User } from '../src/entities/user.entity';
import { createApp, db, login, bearer, TEST_USERS } from './test-utils';

const FOTO = Buffer.from('e2e-face-register-foto-v1');

const adjunto = [
  'fotos',
  FOTO,
  { filename: 'rostro.jpg', contentType: 'image/jpeg' },
] as [string, Buffer, { filename: string; contentType: string }];

/**
 * Doble del `FaceService`: `onnxruntime-node` no corre dentro de Jest, y este
 * spec no quiere probar ArcFace (eso lo cubre `npm run face:check`), solo cómo
 * se resuelve **a qué usuario** se le asocia el rostro. Devuelve rutas falsas
 * del bucket y no sube nada.
 */
class FaceFalso {
  embedsDe(files: Express.Multer.File[]): Promise<number[][]> {
    return Promise.resolve(
      files.map(() => new Array<number>(512).fill(1 / 512)),
    );
  }

  embeddingsDeFotos(files: Express.Multer.File[]): Promise<number[][]> {
    return this.embedsDe(files);
  }

  embeddingConsolidado(embeddings: number[][]): number[] {
    return embeddings[0] ?? [];
  }

  subirFotoRostro(usuarioId: number): Promise<string> {
    return Promise.resolve(`rostros/e2e-${usuarioId}.jpg`);
  }

  urlFirmadaRostro(): Promise<string> {
    return Promise.resolve('https://example.test/firmada.jpg');
  }

  upsertEnIndice(): void {
    // El índice en memoria es de ArcFace; fuera de Jest no interesa.
  }

  borrarFotoRostro(): Promise<void> {
    return Promise.resolve();
  }
}

describe('Users /face/register (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let adminToken: string;
  let tiendaToken: string;

  const createdAt = Date.now().toString(36);
  let creadoId: number | null = null;

  beforeAll(async () => {
    app = await createApp(new FaceFalso());
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

    const res = await request(app.getHttpServer())
      .post('/api/users')
      .set(bearer(adminToken))
      .send({
        nombre: 'Persona',
        apellido: `Sin Rostro ${createdAt}`,
        email: `e2e-rostro-${createdAt}@auto.test`,
        password: '12345678',
        rol: 'tienda',
      })
      .expect(201);
    creadoId = res.body.id as number;
  });

  afterAll(async () => {
    if (creadoId) {
      await ds.getRepository(User).delete({ id: creadoId });
    }
    await app.close();
  });

  const registrar = (campos: Record<string, string>) =>
    request(app.getHttpServer())
      .post('/api/users/face/register')
      .set(bearer(adminToken))
      .field(campos)
      .attach(...adjunto);

  it('registra el rostro por usuarioId (el camino de la lista)', async () => {
    expect(creadoId).not.toBeNull();
    const res = await registrar({ usuarioId: String(creadoId) }).expect(201);

    expect(res.body.id).toBe(creadoId);
    expect(res.body.faceRegisteredAt).toBeDefined();
    expect(res.body.reconoce).toBe(false);

    const guardado = await ds
      .getRepository(User)
      .findOneByOrFail({ id: creadoId! });
    expect(guardado.facePhoto).toBeTruthy();
    expect(guardado.embedding?.length).toBe(512);

    const listados = await request(app.getHttpServer())
      .get('/api/users/rostros')
      .set(bearer(adminToken))
      .expect(200);
    expect(
      (listados.body as Array<{ id: number }>).some((u) => u.id === creadoId),
    ).toBe(true);
  });

  it('usuarioId gana sobre nombre: un nombre inválido no rompe el registro', async () => {
    const res = await registrar({
      usuarioId: String(creadoId),
      nombre: 'Nombre Que No Existe',
      apellido: 'Tampoco Existe',
    }).expect(201);

    expect(res.body.id).toBe(creadoId);
    // Se reemplaza el rostro ya registrado: es el mismo usuario otra vez.
    expect(res.body.reconoce).toBe(true);
  });

  it('usuarioId inexistente devuelve 404', async () => {
    await registrar({ usuarioId: '999999' }).expect(404);
  });

  it('usuarioId que no es un número devuelve 400', async () => {
    await registrar({ usuarioId: 'abc' }).expect(400);
  });

  it('sin fotos devuelve 400 antes de resolver al usuario', async () => {
    await request(app.getHttpServer())
      .post('/api/users/face/register')
      .set(bearer(adminToken))
      .field({ usuarioId: String(creadoId) })
      .expect(400);
  });

  it('el camino por nombre sigue funcionando: 404 si no existe', async () => {
    await registrar({
      nombre: 'Nombre',
      apellido: `Que No Existe ${createdAt}`,
    }).expect(404);
  });

  it('con rol tienda devuelve 403', async () => {
    await request(app.getHttpServer())
      .post('/api/users/face/register')
      .set(bearer(tiendaToken))
      .field({ usuarioId: String(creadoId) })
      .attach(...adjunto)
      .expect(403);
  });
});
