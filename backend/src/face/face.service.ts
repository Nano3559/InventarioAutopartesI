import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { User } from '../entities/user.entity';
import {
  ARCFACE_DIMENSION,
  ARCFACE_ENTRADA,
  aNumero,
  aTensorNchw,
  esEmbeddingValido,
  normalizar,
  promediarYNormalizar,
  similitudCoseno,
} from './face-embedding';

/** Nombre del modelo publicado por `onnxmodelzoo` (Apache-2.0). */
const NOMBRE_MODELO = 'arcfaceresnet100-11-int8.onnx';

/**
 * Dónde se busca el modelo cuando no viene `ARCFACE_MODEL`:
 * `spike/models/` en desarrollo (lo baja el spike B2) y `models/` para despliegue.
 */
const RUTAS_MODELO = [
  path.join('spike', 'models', NOMBRE_MODELO),
  path.join('models', NOMBRE_MODELO),
];

/** Bucket **privado** de Supabase Storage con las fotos de rostro (Ley 26935). */
const BUCKET_FACES_POR_DEFECTO = 'faces';

export interface CandidatoRostro {
  usuarioId: number;
  similitud: number;
}

@Injectable()
export class FaceService implements OnModuleInit {
  private readonly logger = new Logger(FaceService.name);

  /**
   * Índice de rostros en memoria: `usuarioId -> embedding normalizado`.
   * Vive en RAM, así que se rehidrata al arrancar (el modelo NO se carga acá:
   * son 92 MB y 561 ms, y solo hacen falta cuando alguien registra o marca asistencia).
   */
  private readonly indice = new Map<number, Float32Array>();

  private sesion?: Promise<ort.InferenceSession>;
  private rehidratando?: Promise<number>;

  private supabase?: ReturnType<typeof createClient>;

  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const n = await this.rehidratarIndice();
      this.logger.log(
        `Índice de rostros rehidratado: ${n} usuario(s) con embedding`,
      );
    } catch (err) {
      // Que la app levante igual: el índice se rehidrata en el primer uso.
      this.logger.warn(
        `No se pudo rehidratar el índice de rostros: ${(err as Error).message}`,
      );
    }
  }

  // ---------------------------------------------------------------- índice

  /**
   * `SELECT id, embedding FROM users WHERE embedding IS NOT NULL AND activo = true`.
   * Se eligen **columnas explícitas**: `leftJoinAndSelect` traería `password` y
   * `embedding` a cualquier respuesta.
   */
  async rehidratarIndice(): Promise<number> {
    const cargando = (this.rehidratando ??= this.cargarIndice());
    try {
      return await cargando;
    } finally {
      this.rehidratando = undefined;
    }
  }

  private async cargarIndice(): Promise<number> {
    const filas = await this.usersRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.embedding'])
      .where('u.embedding IS NOT NULL')
      .andWhere('u.activo = true')
      .getMany();

    this.indice.clear();
    for (const u of filas) {
      if (!esEmbeddingValido(u.embedding)) {
        this.logger.warn(
          `Usuario ${u.id} tiene un embedding inválido (se ignora en el índice)`,
        );
        continue;
      }
      this.indice.set(u.id, normalizar(u.embedding));
    }
    return this.indice.size;
  }

  private async asegurarIndice(): Promise<void> {
    if (this.indice.size === 0) await this.rehidratarIndice();
  }

  upsertEnIndice(usuarioId: number, embedding: number[]): void {
    this.indice.set(usuarioId, normalizar(embedding));
  }

  quitarDelIndice(usuarioId: number): void {
    this.indice.delete(usuarioId);
  }

  tamanioIndice(): number {
    return this.indice.size;
  }

  /**
   * Top-K por similitud coseno contra todos los rostros registrados.
   * Lo usa `POST /attendance/check` (B4).
   */
  async buscar(embedding: number[], topK = 5): Promise<CandidatoRostro[]> {
    await this.asegurarIndice();
    if (!this.indice.size) return [];
    const consulta = normalizar(embedding);
    return [...this.indice.entries()]
      .map(([usuarioId, registrado]) => ({
        usuarioId,
        similitud: similitudCoseno(consulta, registrado),
      }))
      .sort((a, b) => b.similitud - a.similitud)
      .slice(0, topK);
  }

  // ------------------------------------------------------------- inferencia

  /**
   * La `InferenceSession` se crea **perezosa** y se reutiliza: cargarla en
   * `onModuleInit` gastaría 92 MB de RAM y ~0.5 s en cada arranque (incluidos los
   * spin-down de Render) aunque nadie registre ni marque asistencia.
   */
  private obtenerSesion(): Promise<ort.InferenceSession> {
    this.sesion ??= ort.InferenceSession.create(this.rutaModelo(), {
      executionProviders: ['cpu'],
      graphOptimizationLevel: 'all',
    }).catch((err: Error) => {
      // Se limpia para que el próximo intento vuelva a buscar el archivo.
      this.sesion = undefined;
      throw err;
    });
    return this.sesion;
  }

  /** `ARCFACE_MODEL` si está; si no, el archivo en `spike/models/` o `models/`. */
  rutaModelo(): string {
    const desdeEnv = this.config.get<string>('ARCFACE_MODEL')?.trim();
    if (desdeEnv) {
      // Se valida que exista: un path mal escrito en Render tiene que fallar con
      // este mensaje, no con un error de ONNX Runtime mucho más abajo.
      if (fs.existsSync(desdeEnv)) return desdeEnv;
      throw new ServiceUnavailableException(
        `ARCFACE_MODEL apunta a "${desdeEnv}" y ese archivo no existe en el servidor.`,
      );
    }
    const encontrada = RUTAS_MODELO.find((ruta) =>
      fs.existsSync(path.resolve(ruta)),
    );
    if (!encontrada) {
      throw new ServiceUnavailableException(
        `No se encontró el modelo ArcFace (${NOMBRE_MODELO}). Descárgalo en backend/spike/models/ o ` +
          'defínelo con la variable ARCFACE_MODEL.',
      );
    }
    return path.resolve(encontrada);
  }

  /**
   * Recorte 112x112 RGB → tensor `float32 [1, 3, 112, 112]`.
   * `rotate()` sin argumentos aplica la orientación EXIF: las fotos del celular
   * llegan rotadas si no se tiene en cuenta.
   */
  private async preprocesar(buffer: Buffer): Promise<ort.Tensor> {
    const { data, info } = await sharp(buffer)
      .rotate()
      .resize(ARCFACE_ENTRADA, ARCFACE_ENTRADA, { fit: 'cover' })
      .flatten({ background: '#ffffff' })
      .toColourspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });

    const tensor = aTensorNchw(data, info.channels);
    // Se pasa un `number[]` y no el `Float32Array`: onnxruntime valida el tipo con
    // `instanceof Float32Array` **de su propio realm**, así que un typed array creado
    // en otro realm (el sandbox de Jest, por ejemplo) lo rechaza. La conversión son
    // 37 632 números, despreciable frente a los ~350 ms de inferencia.
    return new ort.Tensor('float32', Array.from(tensor), [
      1,
      3,
      ARCFACE_ENTRADA,
      ARCFACE_ENTRADA,
    ]);
  }

  /** Embedding **normalizado** de una foto (512 floats). */
  async embeddingDeFoto(file: Express.Multer.File): Promise<number[]> {
    try {
      return await this.embeddingDeBuffer(file.buffer);
    } catch (err) {
      const e = err as Error;
      // Una foto corrupta o que no es una imagen no debe tumbar el registro entero.
      if (
        e instanceof ServiceUnavailableException ||
        e instanceof BadRequestException
      ) {
        throw e;
      }
      throw new BadRequestException(
        `No se pudo procesar la foto "${file.originalname}": ${e.message}`,
      );
    }
  }

  private async embeddingDeBuffer(buffer: Buffer): Promise<number[]> {
    let sesion: ort.InferenceSession;
    try {
      sesion = await this.obtenerSesion();
    } catch (err) {
      this.logger.error(
        `No se pudo cargar el modelo ArcFace: ${(err as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'El reconocimiento facial no está disponible: falló la carga del modelo ArcFace',
      );
    }

    const tensor = await this.preprocesar(buffer);
    const salida = await sesion.run({ [sesion.inputNames[0]]: tensor });
    const datos = salida[sesion.outputNames[0]].data as Float32Array;
    if (datos.length !== ARCFACE_DIMENSION) {
      throw new Error(
        `El modelo devolvió ${datos.length} dimensiones y se esperaban ${ARCFACE_DIMENSION}`,
      );
    }
    return aNumero(normalizar(datos));
  }

  /**
   * Un embedding por foto del registro. Se corren **secuenciales**: con el EP de CPU
   * no hay paralelismo real y así el error de una foto no se pierde en un
   * `Promise.all` (246.8 ms por foto según el spike B2).
   */
  async embeddingsDeFotos(files: Express.Multer.File[]): Promise<number[][]> {
    const t0 = Date.now();
    const embeddings: number[][] = [];
    for (const file of files) {
      embeddings.push(await this.embeddingDeFoto(file));
    }
    this.logger.log(
      `${files.length} embedding(s) calculados en ${Date.now() - t0} ms`,
    );
    return embeddings;
  }

  /** Promedia y normaliza las N fotos en un único vector de identidad. */
  embeddingConsolidado(embeddings: number[][]): number[] {
    return aNumero(promediarYNormalizar(embeddings));
  }

  // ------------------------------------------------------- fotos (privadas)

  private cliente(): ReturnType<typeof createClient> {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_KEY');
    if (!url || !key) {
      throw new BadRequestException(
        'Faltan SUPABASE_URL / SUPABASE_KEY: no se puede guardar la foto del rostro',
      );
    }
    this.supabase ??= createClient(url, key);
    return this.supabase;
  }

  private bucket(): string {
    return (
      this.config.get<string>('FACE_BUCKET')?.trim() || BUCKET_FACES_POR_DEFECTO
    );
  }

  /**
   * Sube **una sola** foto de referencia al bucket privado `faces` y devuelve la
   * ruta del objeto. Las N fotos del registro son descartables: lo que se conserva
   * es el embedding consolidado.
   *
   * Se guarda la **ruta**, no una URL firmada: las URLs firmadas expiran y para
   * listar el personal hay que pedirlas en el momento (ver `urlFirmadaRostro`).
   */
  async subirFotoRostro(
    usuarioId: number,
    file: Express.Multer.File,
  ): Promise<string> {
    const extension = (path.extname(file.originalname ?? '') || '.jpg')
      .toLowerCase()
      .replace(/[^.a-z0-9]/g, '');
    // Nombre estable por usuario: re-registrar reemplaza en vez de acumular basura.
    const objeto = `user-${usuarioId}${extension || '.jpg'}`;
    const cliente = this.cliente();

    const { error } = await cliente.storage
      .from(this.bucket())
      .upload(objeto, file.buffer, {
        contentType: file.mimetype || 'image/jpeg',
        upsert: true,
      });
    if (error) {
      this.logger.error(
        `Error de Supabase al subir el rostro: ${error.message}`,
      );
      throw new BadRequestException(
        `Error al guardar la foto del rostro: ${error.message} (bucket: ${this.bucket()})`,
      );
    }

    this.logger.log(`Rostro del usuario ${usuarioId} guardado en ${objeto}`);
    return objeto;
  }

  /** Borra la foto de referencia. Silencioso: el objeto puede no existir. */
  async borrarFotoRostro(objeto: string): Promise<void> {
    try {
      await this.cliente().storage.from(this.bucket()).remove([objeto]);
    } catch (err) {
      this.logger.warn(
        `No se pudo borrar ${objeto} del bucket ${this.bucket()}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * URL firmada de corta duración para **mostrar** la foto. El bucket es privado,
   * así que nunca se expone una URL pública (Ley 26935: dato biométrico sensible).
   */
  async urlFirmadaRostro(
    objeto: string | null,
    expiraEn = 3600,
  ): Promise<string | null> {
    if (!objeto) return null;
    try {
      const { data, error } = await this.cliente()
        .storage.from(this.bucket())
        .createSignedUrl(objeto, expiraEn);
      if (error) {
        this.logger.warn(`No se pudo firmar ${objeto}: ${error.message}`);
        return null;
      }
      return data?.signedUrl ?? null;
    } catch (err) {
      this.logger.warn(
        `No se pudo firmar ${objeto}: ${(err as Error).message}`,
      );
      return null;
    }
  }
}
