import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { User } from '../entities/user.entity';
import { UMBRAL_CONFIANZA_FACIAL } from '../common/constants';
import {
  ARCFACE_DIMENSION,
  ARCFACE_ENTRADA,
  aNumero,
  aTensorNchw,
  esEmbeddingValido,
  normalizar,
  promediarYNormalizar,
  similitudCoseno,
  type RecorteCara,
} from './face-embedding';
import {
  FaceDetector,
  NOMBRE_MODELO_SCRFD,
  type RostroDetectado,
} from './face-detector';
import { alinearRostro, type ImagenRgb } from './face-align';

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

/**
 * Lado máximo de la imagen de trabajo sobre la que se detecta y alinea. Acota la
 * memoria (una foto de celular sin tope son decenas de MB en `raw`) sin perder
 * precisión: el recorte final es de 112×112.
 */
const LADO_MAXIMO_TRABAJO = 1024;

export interface CandidatoRostro {
  usuarioId: number;
  similitud: number;
}

/** Resultado de analizar una foto: embedding + qué hizo el pipeline con el rostro. */
export interface AnalisisRostro {
  /** Embedding ArcFace de 512 dims; vacío si no hay un único rostro. */
  embedding: number[];
  /** `true` si el modelo SCRFD está presente en el servidor. */
  deteccionDisponible: boolean;
  /** `true` si SCRFD encontró y alineó (o halló) un rostro. */
  rostroDetectado: boolean;
  /** Score de la detección elegida (0-1), o `null` si no hubo detección. */
  score: number | null;
  /** Cuántos rostros detectó SCRFD (para avisar de "varios rostros"). */
  rostros: number;
  /** Solo una entrada alineada puede usarse para reconocer o registrar. */
  estrategia: 'alineado' | 'sin-rostro';
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
      // Actualiza en background los embeddings existentes con el pipeline alineado
      // (SCRFD): los registrados antes de la alineación quedan comparables.
      this.reprocesarRostrosExistentes().catch((err) => {
        this.logger.warn(
          `No se pudieron reprocesar rostros en background: ${(err as Error).message}`,
        );
      });
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
        similitud: Math.max(
          -1,
          Math.min(1, similitudCoseno(consulta, registrado)),
        ),
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
   * De la foto cruda a la entrada de ArcFace, **detectando y alineando** el rostro
   * único con SCRFD. Si falta el detector se responde 503; si no hay exactamente
   * un rostro no se ejecuta ArcFace ni se compara el fondo con la galería.
   *
   * Se trabaja sobre una imagen acotada a `LADO_MAXIMO_TRABAJO` (memoria) y la
   * detección escala internamente a 640. Registro, verificación y reindexado pasan
   * por acá, así que los tres usan **el mismo** preprocesado.
   */
  private async analizarBuffer(
    buffer: Buffer,
    _recorte?: RecorteCara | null,
  ): Promise<AnalisisRostro> {
    // Campo legado de la app: SCRFD obtiene la región real, nunca un recorte sin alinear.
    void _recorte;
    const trabajo = await sharp(buffer)
      .rotate()
      .resize({
        width: LADO_MAXIMO_TRABAJO,
        height: LADO_MAXIMO_TRABAJO,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();

    const rutaScrfd = this.config.get<string>('SCRFD_MODEL');
    const deteccionDisponible = FaceDetector.rutaModelo(rutaScrfd) !== null;

    if (!deteccionDisponible) {
      throw new ServiceUnavailableException(
        'El reconocimiento facial requiere SCRFD para detectar y alinear el rostro.',
      );
    }
    let rostros: RostroDetectado[] = [];
    if (deteccionDisponible) {
      try {
        rostros = await FaceDetector.detectar(trabajo, rutaScrfd);
      } catch (err) {
        this.logger.warn(`Falló la detección SCRFD: ${(err as Error).message}`);
        throw new ServiceUnavailableException(
          'No se pudo detectar y alinear el rostro. El reconocimiento facial no está disponible.',
        );
      }
    }

    if (rostros.length === 1) {
      const { data, info } = await sharp(trabajo)
        .removeAlpha()
        .toColourspace('srgb')
        .raw()
        .toBuffer({ resolveWithObject: true });
      const imagen: ImagenRgb = {
        datos: data,
        ancho: info.width,
        alto: info.height,
      };
      // NMS confirmó un único rostro; no se elige arbitrariamente un acompañante.
      const alineado = alinearRostro(imagen, rostros[0].landmarks);
      return {
        embedding: await this.inferir(this.tensorArcface(alineado)),
        deteccionDisponible: true,
        rostroDetectado: true,
        score: rostros[0].score,
        rostros: rostros.length,
        estrategia: 'alineado',
      };
    }

    return {
      embedding: [],
      deteccionDisponible,
      rostroDetectado: rostros.length > 0,
      score: null,
      rostros: rostros.length,
      estrategia: 'sin-rostro',
    };
  }

  /**
   * Píxeles RGB 112×112 → tensor `[1,3,112,112]` de ArcFace. Se pasa
   * `Array.from(...)` y no el `Float32Array`: onnxruntime valida con
   * `instanceof Float32Array` de su propio realm y el sandbox de Jest usa otro.
   */
  private tensorArcface(pixeles: Uint8Array): ort.Tensor {
    return new ort.Tensor('float32', Array.from(aTensorNchw(pixeles)), [
      1,
      3,
      ARCFACE_ENTRADA,
      ARCFACE_ENTRADA,
    ]);
  }

  /** Corre ArcFace sobre un tensor ya preparado y devuelve el embedding normalizado. */
  private async inferir(tensor: ort.Tensor): Promise<number[]> {
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
   * Analiza una foto: embedding + si se detectó rostro. Lo usa el marcaje para
   * poder responder "no se detectó rostro" en vez de forzar un match.
   */
  async analizarRostro(
    file: Express.Multer.File,
    recorte?: RecorteCara | null,
  ): Promise<AnalisisRostro> {
    try {
      return await this.analizarBuffer(file.buffer, recorte);
    } catch (err) {
      const e = err as Error;
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

  /**
   * Embedding **normalizado** de una foto (512 floats). Si SCRFD está disponible y
   * no encuentra exactamente un rostro, es un 400: no sirve para registrar.
   */
  async embeddingDeFoto(
    file: Express.Multer.File,
    recorte?: RecorteCara | null,
  ): Promise<number[]> {
    const analisis = await this.analizarRostro(file, recorte);
    if (
      !analisis.rostroDetectado ||
      analisis.rostros !== 1 ||
      analisis.estrategia !== 'alineado'
    ) {
      throw new BadRequestException(
        `Se requiere exactamente un rostro en "${file.originalname}". Volvé a tomarla con la ` +
          'cara bien encuadrada, de frente y con buena luz.',
      );
    }
    return analisis.embedding;
  }

  private async embeddingDeBuffer(
    buffer: Buffer,
    recorte?: RecorteCara | null,
  ): Promise<number[]> {
    return this.embeddingDeFoto(
      { buffer, originalname: 'foto de referencia' } as Express.Multer.File,
      recorte,
    );
  }

  /**
   * Un embedding por foto del registro. Se corren **secuenciales**: con el EP de CPU
   * no hay paralelismo real y así el error de una foto no se pierde en un
   * `Promise.all` (246.8 ms por foto según el spike B2).
   */
  async embeddingsDeFotos(
    files: Express.Multer.File[],
    recorte?: RecorteCara | null,
  ): Promise<number[][]> {
    const t0 = Date.now();
    const embeddings: number[][] = [];
    for (const file of files) {
      embeddings.push(await this.embeddingDeFoto(file, recorte));
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

  // ------------------------------------------------------------- diagnóstico

  /**
   * Estado del reconocimiento, para verificar un despliegue sin registrar rostros:
   * `indiceEnMemoria === rostrosEnBase` es la prueba de que **la rehidratación
   * del `onModuleInit` funcionó** (importa después de un spin-down de Render, que
   * borra la RAM con el índice).
   *
   * `modelo.cargada` es `false` casi siempre: la `InferenceSession` es perezosa a
   * propósito (92 MB y ~0.5 s que no se pagan si nadie marca asistencia).
   */
  async estado() {
    let modelo: {
      ruta: string | null;
      disponible: boolean;
      cargada: boolean;
      detalle: string | null;
    };
    try {
      modelo = {
        ruta: this.rutaModelo(),
        disponible: true,
        cargada: this.sesion !== undefined,
        detalle: null,
      };
    } catch (err) {
      modelo = {
        ruta: null,
        disponible: false,
        cargada: false,
        detalle: (err as Error).message,
      };
    }

    const rostrosEnBase = await this.usersRepo.count({
      where: { embedding: Not(IsNull()), activo: true },
    });

    const rutaDetector = FaceDetector.rutaModelo(
      this.config.get<string>('SCRFD_MODEL'),
    );

    return {
      umbral: UMBRAL_CONFIANZA_FACIAL,
      umbralCriterio:
        'similitud coseno sobre embeddings ArcFace normalizados (512 dims), rostros alineados con SCRFD',
      rostrosEnBase,
      indiceEnMemoria: this.indice.size,
      indiceCompleto: this.indice.size === rostrosEnBase,
      bucket: this.bucket(),
      modelo: {
        ...modelo,
        nombre: NOMBRE_MODELO,
        entrada: `${ARCFACE_ENTRADA}x${ARCFACE_ENTRADA}`,
        dimension: ARCFACE_DIMENSION,
      },
      detector: {
        nombre: NOMBRE_MODELO_SCRFD,
        ruta: rutaDetector,
        disponible: rutaDetector !== null,
        alineacion: true,
      },
    };
  }

  /**
   * Carga las sesiones de ArcFace y SCRFD a pedido y devuelve cuánto tardó.
   */
  async warmup() {
    const ruta = this.rutaModelo();
    const yaEstabaCargada = this.sesion !== undefined;
    const t0 = Date.now();
    await Promise.all([
      this.obtenerSesion(),
      FaceDetector.obtenerSesion(this.config.get<string>('SCRFD_MODEL')),
    ]);
    return {
      ruta,
      yaEstabaCargada,
      ms: Date.now() - t0,
      rostrosEnIndice: this.indice.size,
    };
  }

  /**
   * Reprocesa las fotos de referencia guardadas en Supabase con el pipeline
   * **SCRFD + alineación** para actualizar los embeddings a la máxima precisión y
   * eliminar falsos positivos de los registros viejos (calculados sin alinear).
   *
   * Ojo: recalcula el embedding desde la foto guardada, que es la que subió el
   * registro (una sola, la primera). Se reindexa en memoria al vuelo.
   */
  async reprocesarRostrosExistentes(): Promise<{
    actualizados: number;
    total: number;
  }> {
    const usuarios = await this.usersRepo.find({
      where: { activo: true, facePhoto: Not(IsNull()) },
    });
    if (!usuarios.length) return { actualizados: 0, total: 0 };

    let actualizados = 0;
    const cliente = this.cliente();
    for (const u of usuarios) {
      if (!u.facePhoto) continue;
      try {
        const { data, error } = await cliente.storage
          .from(this.bucket())
          .download(u.facePhoto);
        if (error || !data) {
          this.logger.warn(
            `No se pudo descargar ${u.facePhoto}: ${error?.message}`,
          );
          continue;
        }
        const buf = Buffer.from(await data.arrayBuffer());
        const nuevoEmbedding = await this.embeddingDeBuffer(buf);
        u.embedding = nuevoEmbedding;
        await this.usersRepo.save(u);
        this.indice.set(u.id, normalizar(nuevoEmbedding));
        actualizados++;
        this.logger.log(
          `Embedding actualizado con alineación SCRFD para usuario ${u.id} (${u.nombre})`,
        );
      } catch (err) {
        this.logger.warn(
          `Error al reprocesar foto de usuario ${u.id}: ${(err as Error).message}`,
        );
      }
    }
    return { actualizados, total: usuarios.length };
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
      // El bucket `faces` es privado sin policies: solo lo alcanza la clave
      // `service_role`. Si el entorno quedó con la clave `anon` (funciona en
      // `products` porque ese bucket sí tiene policy), la subida responde
      // "new row violates row-level security policy". Decirlo con la causa
      // ahorra que la persona que opera el despliegue tenga que adivinar.
      const esRls = /row-level security/i.test(error.message ?? '');
      const hint = esRls
        ? ' el bucket privado exige que SUPABASE_KEY sea la clave service_role del proyecto, no la anon'
        : '';
      throw new BadRequestException(
        `Error al guardar la foto del rostro: ${error.message} (bucket: ${this.bucket()}).${hint}`,
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
