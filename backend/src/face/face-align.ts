/**
 * Alineación facial para ArcFace (Hito 3, tarea B3/B4).
 *
 * ArcFace se entrenó con caras **alineadas**: ojos a la altura horizontal, cara
 * centrada y normalizada a 112×112. Sin esa alineación, el embedding del mismo
 * rostro cambia mucho con el encuadre, dos personas se solapan y ningún umbral
 * sirve (es la causa raíz de los falsos positivos del marcaje).
 *
 * Este módulo es **puro**: no toca ONNX, `sharp` ni la base de datos, así que toda
 * su aritmética se testea sin descargar modelos. La detección de los 5 landmarks
 * (SCRFD) vive en `face-detector.ts`; acá solo se usa el resultado.
 *
 * El pipeline es el mismo que validó el spike `backend/spike/python/reconocer_rostro.py`:
 * 1. los dos ojos y la nariz alcanzan para estimar un warp de **similitud**
 *    (rotación + escala + traslación, sin cizalladura);
 * 2. se proyecta el rostro sobre la plantilla ArcFace de 112×112.
 */

/** Punto `[x, y]` en píxeles de la imagen de trabajo. */
export type Punto = readonly [number, number];

/** Imagen RGB sin canal alfa: `datos.length === ancho * alto * 3`. */
export interface ImagenRgb {
  datos: Uint8Array;
  ancho: number;
  alto: number;
}

/** Lado de la imagen que consume ArcFace. */
export const ARCFACE_LADO = 112;

/**
 * Plantilla ArcFace 112×112: posición a la que deben caer ojo izquierdo, ojo
 * derecho y nariz. Son los 3 puntos que usa el warp de similitud (los mismos del
 * spike y de `insightface`).
 */
export const PLANTILLA_ARCFACE: readonly Punto[] = [
  [38.2946, 51.6963], // ojo izquierdo del sujeto
  [73.5318, 51.5014], // ojo derecho del sujeto
  [56.0252, 71.7366], // nariz
];

/**
 * Transformación de similitud `dst = M·src + t` con
 * `M = [[a, -b], [b, a]]` y `t = [tx, ty]` (misma forma que
 * `cv2.estimateAffinePartial2D`).
 */
export interface MatrizSimilitud {
  a: number;
  b: number;
  tx: number;
  ty: number;
}

/**
 * Estima la similitud que mejor lleva `origen` a `destino` por mínimos cuadrados
 * (Procrustes con escala). Con 3 puntos (ojos + nariz) replica el
 * `cv2.estimateAffinePartial2D` del spike.
 */
export function estimarSimilitud(
  origen: readonly Punto[],
  destino: readonly Punto[],
): MatrizSimilitud {
  if (origen.length !== destino.length || origen.length < 2) {
    throw new Error(
      `La alineación requiere el mismo número de puntos (>=2); llegaron ${origen.length} y ${destino.length}`,
    );
  }

  const n = origen.length;
  let opx = 0;
  let opy = 0;
  let dpx = 0;
  let dpy = 0;
  for (let i = 0; i < n; i++) {
    opx += origen[i][0];
    opy += origen[i][1];
    dpx += destino[i][0];
    dpy += destino[i][1];
  }
  opx /= n;
  opy /= n;
  dpx /= n;
  dpy /= n;

  let denom = 0;
  let numA = 0;
  let numB = 0;
  for (let i = 0; i < n; i++) {
    const px = origen[i][0] - opx;
    const py = origen[i][1] - opy;
    const qx = destino[i][0] - dpx;
    const qy = destino[i][1] - dpy;
    denom += px * px + py * py;
    numA += qx * px + qy * py; // producto punto
    numB += qy * px - qx * py; // producto cruz
  }

  if (denom <= 1e-9) {
    throw new Error(
      'No se pudo estimar la alineación: los puntos de origen son degenerados',
    );
  }

  const a = numA / denom;
  const b = numB / denom;
  return {
    a,
    b,
    tx: dpx - (a * opx - b * opy),
    ty: dpy - (b * opx + a * opy),
  };
}

/** Muestreo bilineal con borde negro fuera de la imagen. */
function muestrearBilineal(
  imagen: ImagenRgb,
  x: number,
  y: number,
  canal: number,
  salida: Uint8Array,
  indiceSalida: number,
): void {
  if (x < 0 || y < 0 || x > imagen.ancho - 1 || y > imagen.alto - 1) return;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, imagen.ancho - 1);
  const y1 = Math.min(y0 + 1, imagen.alto - 1);
  const dx = x - x0;
  const dy = y - y0;

  const base = (fila: number, col: number) =>
    imagen.datos[(fila * imagen.ancho + col) * 3 + canal];

  const arriba = base(y0, x0) * (1 - dx) + base(y0, x1) * dx;
  const abajo = base(y1, x0) * (1 - dx) + base(y1, x1) * dx;
  salida[indiceSalida] = Math.round(arriba * (1 - dy) + abajo * dy);
}

/**
 * Recorta y alinea el rostro a `lado×lado` RGB proyectando por la inversa de la
 * similitud (para cada píxel de salida se busca su origen). Fuera de la imagen el
 * píxel queda negro, igual que el `borderValue=(0,0,0)` del spike.
 */
export function alinearRostro(
  imagen: ImagenRgb,
  landmarks: readonly Punto[],
  plantilla: readonly Punto[] = PLANTILLA_ARCFACE,
  lado = ARCFACE_LADO,
): Uint8Array {
  if (landmarks.length < 3) {
    throw new Error(
      `Se esperaban al menos 3 landmarks (2 ojos + nariz); llegaron ${landmarks.length}`,
    );
  }

  // Los 2 ojos se ordenan por x para no depender del orden que exporte SCRFD.
  const ojos = [landmarks[0], landmarks[1]].sort((p, q) => p[0] - q[0]);
  const fuente: Punto[] = [ojos[0], ojos[1], landmarks[2]];

  const m = estimarSimilitud(fuente, plantilla);

  const det = m.a * m.a + m.b * m.b;
  if (det <= 1e-9) {
    throw new Error('La transformación de alineación es degenerada');
  }

  const salida = new Uint8Array(lado * lado * 3);
  for (let oy = 0; oy < lado; oy++) {
    for (let ox = 0; ox < lado; ox++) {
      // dst = M·src + t  ⇒  src = M⁻¹·(dst - t)
      const ux = ox - m.tx;
      const uy = oy - m.ty;
      const sx = (m.a * ux + m.b * uy) / det;
      const sy = (-m.b * ux + m.a * uy) / det;
      const idx = (oy * lado + ox) * 3;
      muestrearBilineal(imagen, sx, sy, 0, salida, idx);
      muestrearBilineal(imagen, sx, sy, 1, salida, idx + 1);
      muestrearBilineal(imagen, sx, sy, 2, salida, idx + 2);
    }
  }
  return salida;
}
