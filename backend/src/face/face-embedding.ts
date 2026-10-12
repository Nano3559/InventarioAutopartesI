/**
 * Aritmética del reconocimiento facial (Hito 3, tarea B3).
 *
 * Son funciones **puras**: no tocan el modelo ONNX ni la base de datos, así que se
 * pueden testear sin descargar los 63 MB del modelo.
 *
 * Contrato del modelo (medido en el spike B2, `backend/spike/`):
 * - entrada `data`: `float32` `[1, 3, 112, 112]` (NCHW, **RGB**), preprocesado `(x - 127.5) / 128`
 * - salida `fc1`: `float32` `[1, 512]`, que hay que **normalizar a norma 1** antes de
 *   comparar por similitud coseno.
 * - Licencia Apache-2.0 (`onnxmodelzoo/arcfaceresnet100-11-int8`).
 */

/** Lado del recorte que espera ArcFace. La app recorta un cuadrado con guía oval. */
export const ARCFACE_ENTRADA = 112;

/** Dimensión del embedding (`fc1`). */
export const ARCFACE_DIMENSION = 512;

/** Media y desviación del preprocesado: `(x - MEDIA) / DESVIACION`. */
export const ARCFACE_MEDIA = 127.5;
export const ARCFACE_DESVIACION = 128;

export type Embedding = Float32Array | number[];

/**
 * Recorte cuadrado (en píxeles de la **foto ya girada por EXIF**) que la app
 * envía junto con el multipart del rostro. Es la zona del óvalo de la guía de
 * `FaceCamera`, calculada en el dispositivo: sin esto el backend encoge la escena
 * completa a 112×112 y la cara queda como un detalle del fondo, así que ArcFace
 * compara el entorno y cualquier persona se parece a cualquiera.
 */
export interface RecorteCara {
  x: number;
  y: number;
  tamano: number;
}

/**
 * Tamaño mínimo útil de recorte: por debajo de 32 px el rostro ya no tiene
 * 112×112 de información y es señal de una conversión de coordenadas rota.
 */
export const RECORTE_MINIMO = 32;

/**
 * Traduce los tres campos de texto del multipart (`cropX`, `cropY`, `cropTamano`)
 * a un `RecorteCara`. Devuelve `null` si vienen ausentes o no son enteros
 * coherentes: el backend entonces usa el encuadre completo (compatibilidad con
 * cámaras que no manden óvalo, p. ej. las fotos elegidas de la galería).
 */
export function parsearRecorteCara(
  cropX: unknown,
  cropY: unknown,
  cropTamano: unknown,
): RecorteCara | null {
  const numeros = [Number(cropX), Number(cropY), Number(cropTamano)];
  if (numeros.some((n) => !Number.isFinite(n))) return null;
  const [x, y, tamano] = numeros;
  if (![x, y, tamano].every(Number.isInteger)) return null;
  if (x < 0 || y < 0 || tamano < 1) return null;
  return { x, y, tamano };
}

/**
 * Valida un recorte contra las dimensiones reales (ya giradas) de la imagen.
 * Devuelve `null` si es inválido o queda fuera de la foto: la inferencia cae al
 * encuadre completo con un warn en vez de reventar el request.
 */
export function recorteUtilizable(
  recorte: RecorteCara | null | undefined,
  ancho: number,
  alto: number,
): RecorteCara | null {
  if (!recorte) return null;
  const { x, y, tamano } = recorte;
  if (![x, y, tamano].every(Number.isInteger)) return null;
  if (tamano < RECORTE_MINIMO || x < 0 || y < 0) return null;
  if (x + tamano > ancho || y + tamano > alto) return null;
  return { x, y, tamano };
}

const esNumeroFinito = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

/** L2. Devuelve una copia: nunca se muta el embedding que está en el índice. */
export function normalizar(v: Embedding): Float32Array {
  if (!Array.isArray(v) && !ArrayBuffer.isView(v)) {
    throw new Error('El embedding debe ser un arreglo de números');
  }
  let norma = 0;
  for (const x of v) {
    if (!esNumeroFinito(x))
      throw new Error('El embedding tiene valores no numéricos');
    norma += x * x;
  }
  norma = Math.sqrt(norma);
  // Un vector nulo no tiene dirección: no se puede normalizar ni comparar.
  if (norma === 0) throw new Error('El embedding tiene norma 0');

  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / norma;
  return out;
}

/**
 * Consolida las N fotos de un registro en **un solo embedding**: promedio
 * componente a componente y normalización final (ArcFace entrega las 512 dims sin
 * normalizar; sin normalizar, la similitud coseno no sirve).
 */
export function promediarYNormalizar(embeddings: Embedding[]): Float32Array {
  if (!embeddings.length) throw new Error('Se requiere al menos un embedding');

  const dim = embeddings[0].length;
  if (dim === 0) throw new Error('El embedding viene vacío');

  const suma = new Float64Array(dim);
  for (const e of embeddings) {
    if (e.length !== dim) {
      throw new Error(
        `Embeddings de dimensiones distintas: ${dim} y ${e.length}`,
      );
    }
    for (let i = 0; i < dim; i++) suma[i] += e[i];
  }

  const promedio = new Float32Array(dim);
  for (let i = 0; i < dim; i++) promedio[i] = suma[i] / embeddings.length;
  return normalizar(promedio);
}

/**
 * Similitud coseno entre dos embeddings **ya normalizados** (sale en [-1, 1];
 * para el mismo rostro ArcFace da ~0.28-0.45, ver la nota de calibración del
 * `UMBRAL_CONFIANZA_FACIAL` en `Plan Hito 3.md`).
 */
export function similitudCoseno(a: Embedding, b: Embedding): number {
  if (a.length !== b.length) {
    throw new Error(
      `No se pueden comparar embeddings de dimensiones distintas: ${a.length} y ${b.length}`,
    );
  }
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/** `jsonb` de Postgres: se guarda como arreglo plano de números. */
export function aNumero(v: Embedding): number[] {
  return Array.from(v);
}

/**
 * Píxeles RGB planos (`width * height * 3`, en ese orden) → tensor NCHW
 * `[1, 3, 112, 112]` con `(x - 127.5) / 128`, que es lo que espera ArcFace.
 * El preprocesado real (recorte a 112x112 con sharp) vive en `FaceService`.
 */
export function aTensorNchw(pixeles: Uint8Array, canales = 3): Float32Array {
  if (canales !== 3) {
    throw new Error(`Se esperaban 3 canales RGB y llegaron ${canales}`);
  }
  const esperado = ARCFACE_ENTRADA * ARCFACE_ENTRADA * 3;
  if (pixeles.length !== esperado) {
    throw new Error(
      `El recorte debe tener ${esperado} bytes (${ARCFACE_ENTRADA}x${ARCFACE_ENTRADA} RGB) y tiene ${pixeles.length}`,
    );
  }

  const plano = ARCFACE_ENTRADA * ARCFACE_ENTRADA;
  const tensor = new Float32Array(3 * plano);
  for (let i = 0; i < plano; i++) {
    tensor[i] = (pixeles[i * 3] - ARCFACE_MEDIA) / ARCFACE_DESVIACION;
    tensor[plano + i] =
      (pixeles[i * 3 + 1] - ARCFACE_MEDIA) / ARCFACE_DESVIACION;
    tensor[2 * plano + i] =
      (pixeles[i * 3 + 2] - ARCFACE_MEDIA) / ARCFACE_DESVIACION;
  }
  return tensor;
}

/** Valida un embedding leído de la BD antes de meterlo al índice en memoria. */
export function esEmbeddingValido(
  v: unknown,
  dim = ARCFACE_DIMENSION,
): v is number[] {
  return (
    Array.isArray(v) &&
    v.length === dim &&
    v.every((x) => typeof x === 'number' && Number.isFinite(x))
  );
}
