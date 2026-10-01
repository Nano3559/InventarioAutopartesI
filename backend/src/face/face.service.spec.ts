import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { FaceService } from './face.service';
import { ARCFACE_DIMENSION } from './face-embedding';
import type { User } from '../entities/user.entity';

/**
 * OJO — lo que here no se testea: la **inferencia con `onnxruntime-node`**.
 * Su binding nativo valida los typed arrays con `instanceof` de su propio realm, y
 * el sandbox de Jest usa otro realm, así que *toda* inferencia falla con
 * `A float32 tensor's data must be type of function Float32Array()`. El contrato
 * real del modelo (input `data`, output `fc1`, 512 dims) se verifica fuera de Jest
 * con `npm run face:check` (mismo patrón que el spike B2, `npm run spike:arcface`).
 */

/** Repo con un índice vacío: `embedding IS NOT NULL AND activo = true` → 0 filas. */
const repoVacio = {
  createQueryBuilder: () => ({
    select: () => ({
      where: () => ({
        andWhere: () => ({ getMany: () => Promise.resolve([]) }),
      }),
    }),
  }),
} as unknown as Repository<User>;

/** Repositorio con las filas que se le pasen (para probar la rehidratación). */
const repoCon = (filas: Array<Partial<User>>) =>
  ({
    createQueryBuilder: () => ({
      select: () => ({
        where: () => ({
          andWhere: () => ({ getMany: () => Promise.resolve(filas) }),
        }),
      }),
    }),
  }) as unknown as Repository<User>;

/** Embedding de prueba normalizado y 512 dims. */
const embedding = (semilla = 0) => {
  const v = new Array<number>(ARCFACE_DIMENSION);
  let estado = semilla + 1;
  for (let i = 0; i < v.length; i++) {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    v[i] = estado / 4294967296 - 0.5;
  }
  const norma = Math.sqrt(v.reduce((a, x) => a + x * x, 0));
  return v.map((x) => x / norma);
};

describe('FaceService (Hito 3)', () => {
  describe('ruta del modelo', () => {
    it('usa ARCFACE_MODEL cuando el archivo existe', () => {
      const servicio = new FaceService(
        repoVacio,
        new ConfigService({ ARCFACE_MODEL: __filename }),
      );
      expect(servicio.rutaModelo()).toBe(__filename);
    });

    it('avisa con un mensaje accionable si ARCFACE_MODEL apunta a un archivo inexistente', () => {
      const servicio = new FaceService(
        repoVacio,
        new ConfigService({ ARCFACE_MODEL: 'no-existe.onnx' }),
      );
      expect(() => servicio.rutaModelo()).toThrow(/ARCFACE_MODEL/);
    });
  });

  describe('índice de rostros', () => {
    let servicio: FaceService;

    beforeEach(() => {
      servicio = new FaceService(repoVacio, new ConfigService());
    });

    it('busca por similitud y ordena de mayor a menor', async () => {
      const a = embedding(1);
      const b = embedding(42);
      servicio.upsertEnIndice(7, a);
      servicio.upsertEnIndice(8, b);
      expect(servicio.tamanioIndice()).toBe(2);

      const candidatos = await servicio.buscar(a, 5);
      expect(candidatos[0].usuarioId).toBe(7);
      expect(candidatos[0].similitud).toBeGreaterThan(candidatos[1].similitud);
      // La misma foto contra sí misma vale ~1.
      expect(candidatos[0].similitud).toBeCloseTo(1, 6);

      servicio.quitarDelIndice(7);
      expect(servicio.tamanioIndice()).toBe(1);
      expect((await servicio.buscar(a))[0].usuarioId).toBe(8);
    });

    it('respeta el topK', async () => {
      for (let i = 0; i < 8; i++) servicio.upsertEnIndice(i, embedding(i));
      expect(await servicio.buscar(embedding(0), 3)).toHaveLength(3);
    });

    it('reindexar el mismo usuario reemplaza el embedding', async () => {
      const antes = embedding(1);
      servicio.upsertEnIndice(3, antes);
      servicio.upsertEnIndice(3, embedding(99));
      expect(servicio.tamanioIndice()).toBe(1);
      const candidatos = await servicio.buscar(antes, 1);
      expect(candidatos[0].similitud).toBeLessThan(0.99);
    });

    it('sin nadie registrado devuelve la lista vacía', async () => {
      expect(await servicio.buscar(embedding(1))).toEqual([]);
    });
  });

  describe('rehidratación', () => {
    it('carga embedding y activo, e ignora los embeddings corruptos', async () => {
      const filas = [
        { id: 1, embedding: embedding(1) },
        { id: 2, embedding: embedding(2) },
        { id: 3, embedding: [1, 2, 3] }, // dimensión incorrecta
        { id: 4, embedding: embedding(4).fill(Number.NaN) },
      ];
      const servicio = new FaceService(repoCon(filas), new ConfigService());
      expect(await servicio.rehidratarIndice()).toBe(2);
      expect(servicio.tamanioIndice()).toBe(2);
    });
  });

  describe('consolidado de N fotos', () => {
    it('promedia y normaliza en un solo vector de 512 dims', () => {
      const servicio = new FaceService(repoVacio, new ConfigService());
      const salida = servicio.embeddingConsolidado([
        embedding(1),
        embedding(2),
        embedding(3),
      ]);
      expect(salida).toHaveLength(ARCFACE_DIMENSION);
      const norma = Math.sqrt(salida.reduce((a, x) => a + x * x, 0));
      expect(norma).toBeCloseTo(1, 6);
    });

    it('avisa si una foto trae otra dimensión', () => {
      const servicio = new FaceService(repoVacio, new ConfigService());
      expect(() =>
        servicio.embeddingConsolidado([embedding(1), [0.1, 0.2]]),
      ).toThrow(/dimensiones distintas/);
    });
  });

  describe('bucket de rostros', () => {
    it('avisa con 400 si faltan SUPABASE_URL / SUPABASE_KEY', async () => {
      const servicio = new FaceService(
        repoVacio,
        new ConfigService({ SUPABASE_URL: '', SUPABASE_KEY: '' }),
      );
      await expect(
        servicio.subirFotoRostro(1, {
          originalname: 'rostro.jpg',
          buffer: Buffer.from('x'),
        } as never),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('sin foto guardada no hay URL firmada que devolver', async () => {
      const servicio = new FaceService(repoVacio, new ConfigService());
      expect(await servicio.urlFirmadaRostro(null)).toBeNull();
      expect(await servicio.urlFirmadaRostro('')).toBeNull();
    });
  });
});
