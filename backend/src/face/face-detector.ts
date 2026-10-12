import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import { Logger } from '@nestjs/common';
import { ARCFACE_ENTRADA } from './face-embedding';

/** Nombre del modelo UltraFace RFB-320 (MIT). */
export const NOMBRE_MODELO_ULTRAFACE = 'version-RFB-320.onnx';

export const RUTAS_MODELO_ULTRAFACE = [
  path.join('spike', 'models', NOMBRE_MODELO_ULTRAFACE),
  path.join('models', NOMBRE_MODELO_ULTRAFACE),
];

export interface DeteccionRostro {
  detectado: boolean;
  score: number;
  bufferRecortado: Buffer;
}

/**
 * Detector de rostros ligero UltraFace RFB-320 (1.2 MB).
 * Ejecuta inferencia local con onnxruntime-node sobre CPU (~15 ms).
 */
export class FaceDetector {
  private static readonly logger = new Logger(FaceDetector.name);
  private static sesion?: Promise<ort.InferenceSession>;

  static rutaModelo(rutaPersonalizada?: string): string | null {
    if (rutaPersonalizada && fs.existsSync(rutaPersonalizada)) {
      return rutaPersonalizada;
    }
    const encontrada = RUTAS_MODELO_ULTRAFACE.find((r) =>
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
        `Modelo UltraFace (${NOMBRE_MODELO_ULTRAFACE}) no encontrado. Se usará recorte central como fallback.`,
      );
      return null;
    }

    this.sesion ??= ort.InferenceSession.create(ruta, {
      executionProviders: ['cpu'],
      graphOptimizationLevel: 'all',
    }).catch((err: Error) => {
      this.sesion = undefined;
      this.logger.error(`Error al cargar UltraFace: ${err.message}`);
      return null as unknown as ort.InferenceSession;
    });

    return this.sesion;
  }

  /**
   * Detecta el rostro en la foto y devuelve un recorte 112x112 centrado en el rostro.
   * Si no detecta rostro (o no está disponible el detector), recurre a recorte de seguridad.
   */
  static async recortarRostro(
    buffer: Buffer,
    rutaModelo?: string,
  ): Promise<DeteccionRostro> {
    const rotado = await sharp(buffer).rotate().toBuffer();
    const meta = await sharp(rotado).metadata();
    const origW = meta.width || 320;
    const origH = meta.height || 240;

    let sesion: ort.InferenceSession | null = null;
    try {
      sesion = await this.obtenerSesion(rutaModelo);
    } catch {
      sesion = null;
    }

    if (!sesion) {
      const fallback = await sharp(rotado)
        .resize(ARCFACE_ENTRADA, ARCFACE_ENTRADA, { fit: 'cover' })
        .toColourspace('srgb')
        .raw()
        .toBuffer({ resolveWithObject: true });
      return {
        detectado: false,
        score: 0,
        bufferRecortado: fallback.data,
      };
    }

    // Entrada UltraFace: 320x240 RGB normalizado (x - 127) / 128
    const { data: uData } = await sharp(rotado)
      .resize(320, 240, { fit: 'fill' })
      .toColourspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });

    const uFloat = new Float32Array(3 * 240 * 320);
    const plano = 240 * 320;
    for (let i = 0; i < plano; i++) {
      uFloat[i] = (uData[i * 3] - 127.0) / 128.0;
      uFloat[plano + i] = (uData[i * 3 + 1] - 127.0) / 128.0;
      uFloat[2 * plano + i] = (uData[i * 3 + 2] - 127.0) / 128.0;
    }

    const uTensor = new ort.Tensor(
      'float32',
      Array.from(uFloat),
      [1, 3, 240, 320],
    );
    const salida = await sesion.run({ [sesion.inputNames[0]]: uTensor });
    const scores = salida[sesion.outputNames[0]].data as Float32Array;
    const boxes = salida[sesion.outputNames[1]].data as Float32Array;

    let bestScore = 0;
    let bestIdx = -1;
    const numBoxes = Math.floor(scores.length / 2);
    for (let i = 0; i < numBoxes; i++) {
      const p = scores[i * 2 + 1];
      if (p > bestScore) {
        bestScore = p;
        bestIdx = i;
      }
    }

    // Si se detecta un rostro confiable (> 60%), recortamos con margen del 15%
    if (bestScore >= 0.6 && bestIdx >= 0) {
      const rx1 = Math.max(0, Math.min(1, boxes[bestIdx * 4]));
      const ry1 = Math.max(0, Math.min(1, boxes[bestIdx * 4 + 1]));
      const rx2 = Math.max(0, Math.min(1, boxes[bestIdx * 4 + 2]));
      const ry2 = Math.max(0, Math.min(1, boxes[bestIdx * 4 + 3]));

      const bw = rx2 - rx1;
      const bh = ry2 - ry1;
      const margin = 0.15;

      const x1 = Math.max(0, Math.floor((rx1 - bw * margin) * origW));
      const y1 = Math.max(0, Math.floor((ry1 - bh * margin) * origH));
      const x2 = Math.min(origW, Math.ceil((rx2 + bw * margin) * origW));
      const y2 = Math.min(origH, Math.ceil((ry2 + bh * margin) * origH));

      const cropW = Math.max(1, x2 - x1);
      const cropH = Math.max(1, y2 - y1);

      const recorte = await sharp(rotado)
        .extract({ left: x1, top: y1, width: cropW, height: cropH })
        .resize(ARCFACE_ENTRADA, ARCFACE_ENTRADA, { fit: 'cover' })
        .toColourspace('srgb')
        .raw()
        .toBuffer({ resolveWithObject: true });

      return {
        detectado: true,
        score: bestScore,
        bufferRecortado: recorte.data,
      };
    }

    // Fallback a recorte central
    const fallback = await sharp(rotado)
      .resize(ARCFACE_ENTRADA, ARCFACE_ENTRADA, { fit: 'cover' })
      .toColourspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });

    return {
      detectado: false,
      score: bestScore,
      bufferRecortado: fallback.data,
    };
  }
}
