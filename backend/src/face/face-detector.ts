import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { DETECCION_CONFIANZA_FACIAL } from '../common/constants';
import type { Punto } from './face-align';

/** SCRFD-2.5G con BatchNorm y keypoints (Apache-2.0, `deepinsight/insightface`). */
export const NOMBRE_MODELO_SCRFD = 'scrfd_2.5g_bnkps.onnx';

export const RUTAS_MODELO_SCRFD = [
  path.resolve(__dirname, '..', '..', 'spike', 'models', NOMBRE_MODELO_SCRFD),
  path.resolve(__dirname, '..', '..', 'models', NOMBRE_MODELO_SCRFD),
];

/** Lado mayor al que se escala la imagen para la detección (el spike usa 640). */
const LADO_DETECCION = 640;

/** Strides de los tres mapas de características de SCRFD. */
const STRIDES = [8, 16, 32] as const;

/** Anclas por celda de la grilla (SCRFD-2.5G usa 2). */
const ANCLAS_POR_CELDA = 2;

/** IoU a partir del cual dos cajas se consideran el mismo rostro. */
const NMS_IOU = 0.45;

/**
 * Un rostro detectado. Cajas y landmarks están en píxeles de la **imagen de
 * trabajo** (la que se le pasó a `detectar`, ya rotada y acotada), listos para
 * alimentar `alinearRostro`.
 */
export interface RostroDetectado {
  caja: { x1: number; y1: number; x2: number; y2: number };
  landmarks: Punto[];
  score: number;
}

/**
 * Detector de rostros SCRFD con **5 landmarks**, que es lo que permite alinear
 * antes de ArcFace. Reemplaza a UltraFace: UltraFace detectaba la caja pero no
 * daba puntos, así que no se podía alinear y el embedding no separaba identidades.
 *
 * Es de la familia de detectores one-stage (mismo espíritu que YOLO); el modelo
 * pesa ~3.3 MB y corre en CPU con `onnxruntime-node`.
 */
export class FaceDetector {
  private static readonly logger = new Logger(FaceDetector.name);
  private static sesion?: Promise<ort.InferenceSession | null>;

  static rutaModelo(rutaPersonalizada?: string): string | null {
    if (rutaPersonalizada && fs.existsSync(rutaPersonalizada)) {
      return rutaPersonalizada;
    }
    const encontrada = RUTAS_MODELO_SCRFD.find((r) =>
      fs.existsSync(path.resolve(r)),
    );
    return encontrada ? path.resolve(encontrada) : null;
  }

  static async obtenerSesion(
    rutaPersonalizada?: string,
  ): Promise<ort.InferenceSession | null> {
    const ruta = this.rutaModelo(rutaPersonalizada);
    if (!ruta) {
      this.logger.warn(
        `Modelo SCRFD (${NOMBRE_MODELO_SCRFD}) no encontrado: el reconocimiento ` +
          'no estará disponible hasta instalar el detector.',
      );
      return null;
    }

    this.sesion ??= ort.InferenceSession.create(ruta, {
      executionProviders: ['cpu'],
      graphOptimizationLevel: 'all',
    }).catch((err: Error) => {
      this.sesion = undefined;
      this.logger.error(`Error al cargar SCRFD: ${err.message}`);
      return null;
    });

    return this.sesion;
  }

  /**
   * Detecta todos los rostros de la imagen y devuelve sus 5 landmarks. Si el
   * modelo no está disponible lanza 503; una lista vacía significa que no hay rostro.
   */
  static async detectar(
    buffer: Buffer,
    rutaPersonalizada?: string,
  ): Promise<RostroDetectado[]> {
    const sesion = await this.obtenerSesion(rutaPersonalizada);
    if (!sesion)
      throw new ServiceUnavailableException(
        'El detector SCRFD no está disponible',
      );

    const meta = await sharp(buffer).metadata();
    const ancho = meta.width ?? 0;
    const alto = meta.height ?? 0;
    if (!ancho || !alto) return [];

    const { data, info } = await sharp(buffer)
      .removeAlpha()
      .toColourspace('srgb')
      .resize({ width: LADO_DETECCION, height: LADO_DETECCION, fit: 'inside' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const nw = info.width;
    const nh = info.height;
    const plano = LADO_DETECCION * LADO_DETECCION;
    if (data.length !== nw * nh * 3) return [];

    // NCHW RGB con (x - 127.5) / 128, como el spike y como ArcFace.
    // Este export ONNX exige 640x640. Se rellena a derecha/abajo con negro,
    // conservando la proporción y el origen de cajas/landmarks de la foto.
    const blob = new Float32Array(3 * plano).fill(-127.5 / 128);
    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        const i = y * nw + x;
        const destino = y * LADO_DETECCION + x;
        blob[destino] = (data[i * 3] - 127.5) / 128;
        blob[plano + destino] = (data[i * 3 + 1] - 127.5) / 128;
        blob[2 * plano + destino] = (data[i * 3 + 2] - 127.5) / 128;
      }
    }

    const tensor = new ort.Tensor('float32', blob, [
      1,
      3,
      LADO_DETECCION,
      LADO_DETECCION,
    ]);
    const salida = await sesion.run({ [sesion.inputNames[0]]: tensor });

    const salidas = this.mapearSalidas(sesion.outputNames, salida);
    // Coordenadas de detección (nw×nh) → píxeles de la imagen de trabajo.
    const xs = ancho / nw;
    const ys = alto / nh;

    const detecciones = this.decodificar(
      salidas,
      LADO_DETECCION,
      LADO_DETECCION,
      xs,
      ys,
      ancho,
      alto,
    );
    return this.nms(detecciones);
  }

  /** Localiza las 9 salidas por nombre (`score_8`…); cae a la posición si difieren. */
  private static mapearSalidas(
    nombres: readonly string[],
    salida: Record<string, ort.Tensor>,
  ): { scores: Float32Array[]; bboxes: Float32Array[]; kps: Float32Array[] } {
    const scores: Float32Array[] = [];
    const bboxes: Float32Array[] = [];
    const kps: Float32Array[] = [];
    const porNombre = new Map<string, Float32Array>();

    for (const nombre of nombres) {
      const dato = salida[nombre]?.data;
      if (dato) porNombre.set(nombre, dato as Float32Array);
    }

    for (const s of STRIDES) {
      const sc = porNombre.get(`score_${s}`);
      const bb = porNombre.get(`bbox_${s}`);
      const kp = porNombre.get(`kps_${s}`);
      if (sc && bb && kp) {
        scores.push(sc);
        bboxes.push(bb);
        kps.push(kp);
      }
    }

    if (scores.length === STRIDES.length) return { scores, bboxes, kps };

    // Export sin nombres canónicos: se asume el orden de `scrfd2onnx.py`
    // (score_8, score_16, score_32, bbox_8, bbox_16, bbox_32, kps_8, kps_16, kps_32).
    const datos = nombres.map((n) => salida[n]?.data as Float32Array);
    if (datos.length === 9 && datos.every(Boolean)) {
      return {
        scores: [datos[0], datos[1], datos[2]],
        bboxes: [datos[3], datos[4], datos[5]],
        kps: [datos[6], datos[7], datos[8]],
      };
    }

    throw new Error(
      `SCRFD devolvió ${nombres.length} salidas y no se pudieron mapear a los 3 strides`,
    );
  }

  private static decodificar(
    salidas: {
      scores: Float32Array[];
      bboxes: Float32Array[];
      kps: Float32Array[];
    },
    nw: number,
    nh: number,
    xs: number,
    ys: number,
    ancho: number,
    alto: number,
  ): RostroDetectado[] {
    const detecciones: RostroDetectado[] = [];

    for (let idx = 0; idx < STRIDES.length; idx++) {
      const stride = STRIDES[idx];
      const scores = salidas.scores[idx];
      const bboxes = salidas.bboxes[idx];
      const kps = salidas.kps[idx];

      const columnas = Math.floor(nw / stride);
      const filas = Math.floor(nh / stride);
      const total = filas * columnas * ANCLAS_POR_CELDA;

      for (let i = 0; i < total; i++) {
        const score = scores[i];
        if (!(score >= DETECCION_CONFIANZA_FACIAL)) continue;

        const celda = Math.floor(i / ANCLAS_POR_CELDA);
        const fila = Math.floor(celda / columnas);
        const columna = celda % columnas;
        const cx = columna * stride;
        const cy = fila * stride;

        const b = i * 4;
        const x1 = (cx - bboxes[b] * stride) * xs;
        const y1 = (cy - bboxes[b + 1] * stride) * ys;
        const x2 = (cx + bboxes[b + 2] * stride) * xs;
        const y2 = (cy + bboxes[b + 3] * stride) * ys;

        const landmarks: Punto[] = [];
        const k = i * 10;
        for (let p = 0; p < 5; p++) {
          landmarks.push([
            (cx + kps[k + p * 2] * stride) * xs,
            (cy + kps[k + p * 2 + 1] * stride) * ys,
          ]);
        }

        detecciones.push({
          caja: {
            x1: Math.max(0, Math.min(ancho, x1)),
            y1: Math.max(0, Math.min(alto, y1)),
            x2: Math.max(0, Math.min(ancho, x2)),
            y2: Math.max(0, Math.min(alto, y2)),
          },
          landmarks,
          score,
        });
      }
    }

    return detecciones;
  }

  /** Non-Maximum Suppression: deja el rostro de mayor score por zona. */
  private static nms(detecciones: RostroDetectado[]): RostroDetectado[] {
    const ordenadas = [...detecciones].sort((a, b) => b.score - a.score);
    const elegidas: RostroDetectado[] = [];

    for (const candidata of ordenadas) {
      const solapa = elegidas.some(
        (e) => this.iou(e.caja, candidata.caja) > NMS_IOU,
      );
      if (!solapa) elegidas.push(candidata);
    }
    return elegidas;
  }

  private static iou(
    a: { x1: number; y1: number; x2: number; y2: number },
    b: { x1: number; y1: number; x2: number; y2: number },
  ): number {
    const ix1 = Math.max(a.x1, b.x1);
    const iy1 = Math.max(a.y1, b.y1);
    const ix2 = Math.min(a.x2, b.x2);
    const iy2 = Math.min(a.y2, b.y2);
    const iw = Math.max(0, ix2 - ix1);
    const ih = Math.max(0, iy2 - iy1);
    const inter = iw * ih;
    if (inter <= 0) return 0;
    const areaA = Math.max(0, a.x2 - a.x1) * Math.max(0, a.y2 - a.y1);
    const areaB = Math.max(0, b.x2 - b.x1) * Math.max(0, b.y2 - b.y1);
    const union = areaA + areaB - inter;
    return union <= 0 ? 0 : inter / union;
  }
}
