import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, In } from 'typeorm';
import { User } from '../src/entities/user.entity';
import { Asistencia } from '../src/entities/asistencia.entity';
import { UMBRAL_CONFIANZA_FACIAL } from '../src/common/constants';
import { createApp, db, login, bearer, TEST_USERS } from './test-utils';

const FOTO_ROSTRO_A = Buffer.from('e2e-rostro-falso-persona-a-v1');
const FOTO_ROSTRO_B = Buffer.from('e2e-rostro-falso-persona-b-v2');
const FOTO_ROSTRO_C = Buffer.from('e2e-rostro-falso-persona-c-v3');

const adjunto = (foto: Buffer) =>
  ['foto', foto, { filename: 'rostro.jpg', contentType: 'image/jpeg' }] as [
    string,
    Buffer,
    { filename: string; contentType: string },
  ];

/**
 * Doble del `FaceService`. El embedding se deriva de los bytes de la foto, así
 * la misma foto siempre da el mismo vector y dos fotos distintas quedan
 * ortogonales (similitud 0). Es lo que permite ejercitar los tres caminos de
 * `/attendance/check` sin ArcFace: automático (≥ umbral), bajo umbral y manual.
 */
class RostroFalso {
  private readonly registro = new Map<number, number[]>();

  registrar(usuarioId: number, foto: Buffer): void {
    this.registro.set(usuarioId, RostroFalso.vectorDe(foto));
  }

  embeddingDeFoto(file: Express.Multer.File): Promise<number[]> {
    return Promise.resolve(RostroFalso.vectorDe(file.buffer));
  }

  buscar(
    embedding: number[],
    topK = 5,
  ): Promise<Array<{ usuarioId: number; similitud: number }>> {
    return Promise.resolve(
      [...this.registro.entries()]
        .map(([usuarioId, registrado]) => ({
          usuarioId,
          similitud: RostroFalso.coseno(embedding, registrado),
        }))
        .sort((a, b) => b.similitud - a.similitud)
        .slice(0, topK),
    );
  }

  private static vectorDe(bytes: Buffer): number[] {
    const vector = new Array<number>(512).fill(0);
    let hash = 2166136261;
    for (const byte of bytes) {
      hash ^= byte;
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    vector[hash % vector.length] = 1;
    return vector;
  }

  private static coseno(a: number[], b: number[]): number {
    return a.reduce((sum, v, i) => sum + v * b[i], 0);
  }
}

function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('Attendance (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let adminToken: string;
  let tiendaToken: string;
  let inventarioToken: string;
  const rostro = new RostroFalso();

  let adminId: number;
  let tiendaLocationId: number;
  let usuarioMarcaje: number;

  const creados: number[] = [];
  const marcar = (id: number) => {
    if (id && !creados.includes(id)) creados.push(id);
    return id;
  };

  beforeAll(async () => {
    app = await createApp(rostro);
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
    inventarioToken = await login(
      app,
      TEST_USERS.inventario.email,
      TEST_USERS.inventario.password,
    );

    const usuarios = ds.getRepository(User);
    adminId = (
      await usuarios.findOneByOrFail({ email: TEST_USERS.admin.email })
    ).id;
    const vendedor = await usuarios.findOneByOrFail({
      email: TEST_USERS.tienda.email,
    });
    usuarioMarcaje = vendedor.id;
    tiendaLocationId = vendedor.tiendaId as number;

    rostro.registrar(usuarioMarcaje, FOTO_ROSTRO_A);
  });

  afterAll(async () => {
    if (creados.length) {
      await ds.getRepository(Asistencia).delete({ id: In(creados) });
    }
    await app.close();
  });

  const marcarCon = async (
    foto: Buffer,
    cuerpo: Record<string, string> = {},
    estado = 201,
  ) =>
    request(app.getHttpServer())
      .post('/api/attendance/check')
      .set(bearer(adminToken))
      .field(cuerpo)
      .attach(...adjunto(foto))
      .expect(estado);

  describe('POST /api/attendance/check', () => {
    it('sin foto devuelve 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/attendance/check')
        .set(bearer(adminToken))
        .expect(400);
      expect(String(res.body.message)).toContain('foto');
    });

    it('sin token devuelve 401', async () => {
      await request(app.getHttpServer())
        .post('/api/attendance/check')
        .attach(...adjunto(FOTO_ROSTRO_A))
        .expect(401);
    });

    it('con rol tienda o inventario devuelve 403', async () => {
      for (const token of [tiendaToken, inventarioToken]) {
        await request(app.getHttpServer())
          .post('/api/attendance/check')
          .set(bearer(token))
          .attach(...adjunto(FOTO_ROSTRO_A))
          .expect(403);
      }
    });

    it('reconoce el rostro y registra entrada automática', async () => {
      const antes = await ds.getRepository(Asistencia).count();
      const res = await marcarCon(FOTO_ROSTRO_A);
      const body = res.body as {
        reconocido: boolean;
        manual: boolean;
        requiereConfirmacion: boolean;
        umbral: number;
        candidato: { usuarioId: number; similitud: number };
        asistencia: {
          id: number;
          tipo: string;
          metodo: string;
          confianza: number;
          usuarioId: number;
        };
      };

      expect(body.reconocido).toBe(true);
      expect(body.manual).toBe(false);
      expect(body.requiereConfirmacion).toBe(false);
      expect(body.umbral).toBe(UMBRAL_CONFIANZA_FACIAL);
      expect(body.candidato.usuarioId).toBe(usuarioMarcaje);
      expect(body.candidato.similitud).toBeCloseTo(1, 5);
      expect(body.asistencia.metodo).toBe('automatico');
      expect(body.asistencia.tipo).toBe('entrada');
      expect(body.asistencia.confianza).toBeGreaterThanOrEqual(
        UMBRAL_CONFIANZA_FACIAL,
      );
      marcar(body.asistencia.id);

      const despues = await ds.getRepository(Asistencia).count();
      expect(despues).toBe(antes + 1);
    });

    it('el segundo marcaje del día alterna a salida', async () => {
      const res = await marcarCon(FOTO_ROSTRO_A);
      const body = res.body as { asistencia: { id: number; tipo: string } };
      expect(body.asistencia.tipo).toBe('salida');
      marcar(body.asistencia.id);
    });

    it('acepta tipo y locationId explícitos', async () => {
      const res = await marcarCon(FOTO_ROSTRO_A, {
        tipo: 'salida',
        locationId: String(tiendaLocationId),
      });
      const body = res.body as {
        asistencia: { id: number; tipo: string; locationId: number };
      };
      expect(body.asistencia.tipo).toBe('salida');
      expect(body.asistencia.locationId).toBe(tiendaLocationId);
      marcar(body.asistencia.id);
    });

    it('tipo inválido devuelve 400', async () => {
      const res = await marcarCon(FOTO_ROSTRO_A, { tipo: 'permuta' }, 400);
      expect(String(res.body.message)).toContain('tipo');
    });

    it('locationId inexistente devuelve 404', async () => {
      await marcarCon(FOTO_ROSTRO_A, { locationId: '999999' }, 404);
    });

    it('bajo umbral devuelve candidatos y no registra nada', async () => {
      const antes = await ds.getRepository(Asistencia).count();
      const res = await marcarCon(FOTO_ROSTRO_B);
      const body = res.body as {
        reconocido: boolean;
        requiereConfirmacion: boolean;
        umbral: number;
        candidatos: Array<{ usuarioId: number; similitud: number }>;
        asistencia?: unknown;
      };

      expect(body.reconocido).toBe(false);
      expect(body.requiereConfirmacion).toBe(true);
      expect(body.umbral).toBe(UMBRAL_CONFIANZA_FACIAL);
      expect(body.candidatos.length).toBeGreaterThan(0);
      expect(body.candidatos[0].usuarioId).toBe(usuarioMarcaje);
      expect(body.candidatos[0].similitud).toBeLessThan(
        UMBRAL_CONFIANZA_FACIAL,
      );
      expect(body.asistencia).toBeUndefined();

      const despues = await ds.getRepository(Asistencia).count();
      expect(despues).toBe(antes);
    });

    it('con usuarioId registra el marcaje manual sin reconocer', async () => {
      const res = await marcarCon(FOTO_ROSTRO_B, {
        usuarioId: String(usuarioMarcaje),
        locationId: String(tiendaLocationId),
      });
      const body = res.body as {
        reconocido: boolean;
        manual: boolean;
        candidato: { usuarioId: number; similitud: number | null };
        asistencia: {
          id: number;
          metodo: string;
          confianza: number | null;
          confirmadoPorId: number;
          usuarioId: number;
        };
      };

      expect(body.reconocido).toBe(true);
      expect(body.manual).toBe(true);
      expect(body.candidato.similitud).toBeNull();
      expect(body.asistencia.metodo).toBe('manual');
      expect(body.asistencia.confianza).toBeNull();
      expect(body.asistencia.confirmadoPorId).toBe(adminId);
      expect(body.asistencia.usuarioId).toBe(usuarioMarcaje);
      marcar(body.asistencia.id);
    });

    it('con usuarioId inexistente devuelve 404', async () => {
      await marcarCon(FOTO_ROSTRO_C, { usuarioId: '999999' }, 404);
    });
  });

  describe('POST /api/attendance/:id/confirm', () => {
    it('convierte un marcaje automático en manual confirmado', async () => {
      const auto = await marcarCon(FOTO_ROSTRO_A);
      const id = marcar(
        (auto.body as { asistencia: { id: number } }).asistencia.id,
      );

      const res = await request(app.getHttpServer())
        .post(`/api/attendance/${id}/confirm`)
        .set(bearer(adminToken))
        .expect(201);
      expect(res.body.metodo).toBe('manual');
      expect(res.body.confianza).toBeNull();
      expect(res.body.confirmadoPorId).toBe(adminId);
    });

    it('inexistente devuelve 404', async () => {
      await request(app.getHttpServer())
        .post('/api/attendance/999999/confirm')
        .set(bearer(adminToken))
        .expect(404);
    });
  });

  describe('PATCH /api/attendance/:id', () => {
    it('corrige tipo, fecha y persona', async () => {
      const auto = await marcarCon(FOTO_ROSTRO_A);
      const id = marcar(
        (auto.body as { asistencia: { id: number } }).asistencia.id,
      );

      const res = await request(app.getHttpServer())
        .patch(`/api/attendance/${id}`)
        .set(bearer(adminToken))
        .send({ tipo: 'salida', fecha: '2026-01-15T08:30:00.000Z' })
        .expect(200);
      expect(res.body.tipo).toBe('salida');
      expect(new Date(res.body.fecha).getTime()).toBe(
        Date.parse('2026-01-15T08:30:00.000Z'),
      );
    });

    it('metodo manual anula la confianza y sella el confirmante', async () => {
      const auto = await marcarCon(FOTO_ROSTRO_A);
      const id = marcar(
        (auto.body as { asistencia: { id: number } }).asistencia.id,
      );

      const res = await request(app.getHttpServer())
        .patch(`/api/attendance/${id}`)
        .set(bearer(adminToken))
        .send({ metodo: 'manual' })
        .expect(200);
      expect(res.body.metodo).toBe('manual');
      expect(res.body.confianza).toBeNull();
      expect(res.body.confirmadoPorId).toBe(adminId);
    });

    it('tipo inválido y usuario inexistente devuelven 400/404', async () => {
      const auto = await marcarCon(FOTO_ROSTRO_A);
      const id = marcar(
        (auto.body as { asistencia: { id: number } }).asistencia.id,
      );

      await request(app.getHttpServer())
        .patch(`/api/attendance/${id}`)
        .set(bearer(adminToken))
        .send({ tipo: 'permuta' })
        .expect(400);
      await request(app.getHttpServer())
        .patch(`/api/attendance/${id}`)
        .set(bearer(adminToken))
        .send({ usuarioId: 999999 })
        .expect(404);
    });
  });

  describe('GET /api/attendance', () => {
    it('devuelve el historial paginado', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attendance?limit=5')
        .set(bearer(adminToken))
        .expect(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.limit).toBe(5);
      expect(typeof res.body.total).toBe('number');
    });

    it('filtra por usuarioId y tipo', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/attendance?usuarioId=${usuarioMarcaje}&tipo=entrada&limit=200`,
        )
        .set(bearer(adminToken))
        .expect(200);
      for (const fila of res.body.data as Array<{ usuarioId: number }>) {
        expect(fila.usuarioId).toBe(usuarioMarcaje);
      }
    });

    it('tipo inválido devuelve 400 y sin token 401', async () => {
      await request(app.getHttpServer())
        .get('/api/attendance?tipo=permuta')
        .set(bearer(adminToken))
        .expect(400);
      await request(app.getHttpServer()).get('/api/attendance').expect(401);
      await request(app.getHttpServer())
        .get('/api/attendance')
        .set(bearer(tiendaToken))
        .expect(403);
    });
  });

  describe('GET /api/attendance/dashboard', () => {
    it('trae al marcaje de hoy en la tienda del vendedor', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attendance/dashboard')
        .set(bearer(adminToken))
        .expect(200);
      const body = res.body as {
        fecha: string;
        totales: Record<string, number>;
        porTienda: Array<{
          locationId: number;
          presentes: Array<{ usuarioId: number; dentro: boolean }>;
        }>;
        ultimosMarcajes: unknown[];
      };

      expect(body.fecha).toBe(hoy());
      expect(body.totales.presentes).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(body.ultimosMarcajes)).toBe(true);

      const grupos = body.porTienda.filter(
        (g) => g.locationId === tiendaLocationId,
      );
      expect(grupos.length).toBe(1);
      const presentes = grupos[0].presentes.filter(
        (p) => p.usuarioId === usuarioMarcaje,
      );
      expect(presentes.length).toBe(1);
      expect(typeof presentes[0].dentro).toBe('boolean');
    });

    it('un día sin marcajes devuelve todo en cero', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attendance/dashboard?fecha=1999-01-01')
        .set(bearer(adminToken))
        .expect(200);
      const body = res.body as {
        fecha: string;
        totales: Record<string, number>;
        porTienda: Array<{ totalPersonal: number; presentes: unknown[] }>;
      };
      expect(body.fecha).toBe('1999-01-01');
      expect(body.totales.presentes).toBe(0);
      expect(body.totales.ausentes).toBe(body.totales.personal);
      expect(body.totales.marcajes).toBe(0);
      for (const grupo of body.porTienda) {
        expect(grupo.presentes).toEqual([]);
      }
    });

    it('una fecha imposible o mal formada devuelve 400', async () => {
      for (const fecha of ['2026-02-31', 'ayer', '2026-10', '2026-1-1']) {
        await request(app.getHttpServer())
          .get(`/api/attendance/dashboard?fecha=${fecha}`)
          .set(bearer(adminToken))
          .expect(400);
      }
    });

    it('exige token de admin', async () => {
      await request(app.getHttpServer())
        .get('/api/attendance/dashboard')
        .expect(401);
      for (const token of [tiendaToken, inventarioToken]) {
        await request(app.getHttpServer())
          .get('/api/attendance/dashboard')
          .set(bearer(token))
          .expect(403);
      }
    });
  });
});
