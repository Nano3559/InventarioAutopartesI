/**
 * Verificación del contrato real del modelo ArcFace (Hito 3, tarea B3).
 *
 * `npm test` **no** puede cobrir esto: el binding nativo de `onnxruntime-node`
 * valida los typed arrays con `instanceof Float32Array` de su propio realm y el
 * sandbox de Jest corre en otro, así que toda inferencia falla con
 * `A float32 tensor's data must be type of function Float32Array()`.
 * Mismo patrón que el spike B2 (`npm run spike:arcface`): la comprobación del
 * modelo se corre **fuera** de Jest.
 *
 * Uso:  npm run face:check
 * Modelo: backend/spike/models/arcfaceresnet100-11-int8.onnx (63 MB, no se versiona)
 */
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { FaceService } from '../src/face/face.service';
import { ARCFACE_DIMENSION } from '../src/face/face-embedding';

const MODELO =
  process.env.ARCFACE_MODEL ||
  path.join(__dirname, 'models', 'arcfaceresnet100-11-int8.onnx');

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);
const rss = () => Number(mb(process.memoryUsage().rss));
const norma = (v: number[]) => Math.sqrt(v.reduce((a, x) => a + x * x, 0));
const coseno = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);

/**
 * Rostro sintético: un óvalo con ojos, nariz y boca sobre fondo claro. No es una
 * persona real, pero sirve para comprobar que el modelo **distingue** dos entradas
 * distintas y que ordena por similitud.
 */
async function rostro(tono: number, seed: number): Promise<Buffer> {
  const lado = 320;
  const fondo = await sharp({
    create: {
      width: lado,
      height: lado,
      channels: 3,
      background: { r: 235 - seed * 5, g: 225 - seed * 5, b: 215 - seed * 5 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${lado}" height="${lado}">
             <ellipse cx="${lado / 2}" cy="${lado / 2}" rx="${lado * 0.33}" ry="${lado * 0.4}" fill="rgb(${tono + 40},${tono},${tono - 30})"/>
             <circle cx="${lado / 2 - 22}" cy="${lado / 2 - 18}" r="7" fill="#202020"/>
             <circle cx="${lado / 2 + 22}" cy="${lado / 2 - 18}" r="7" fill="#202020"/>
             <ellipse cx="${lado / 2}" cy="${lado / 2 + 6}" rx="7" ry="12" fill="#00000030"/>
             <path d="M ${lado / 2 - 26} ${lado / 2 + 42} q 26 18 52 0" stroke="#5a2a2a" stroke-width="5" fill="none"/>
           </svg>`,
        ),
        top: 0,
        left: 0,
      },
    ])
    .jpeg()
    .toBuffer();
  return fondo;
}

const comoArchivo = (buffer: Buffer, nombre: string) =>
  ({
    buffer,
    originalname: nombre,
    mimetype: 'image/jpeg',
    size: buffer.length,
  }) as Express.Multer.File;

async function main() {
  console.log('modelo           :', MODELO);
  console.log('');

  const rssBase = rss();
  const servicio = new FaceService(
    {} as never,
    new ConfigService({ ARCFACE_MODEL: MODELO }),
  );

  const t0 = Date.now();
  const a = await servicio.embeddingDeFoto(
    comoArchivo(await rostro(150, 0), 'persona-a-1.jpg'),
  );
  console.log(`[1] 1er embedding (incluye la carga de la session) ${Date.now() - t0} ms`);

  const t1 = Date.now();
  const [a2, a3, personaB] = await Promise.all([
    servicio.embeddingsDeFotos([comoArchivo(await rostro(150, 0), 'a2.jpg')]),
    servicio.embeddingsDeFotos([comoArchivo(await rostro(154, 1), 'a3.jpg')]),
    servicio.embeddingsDeFotos([comoArchivo(await rostro(60, 9), 'b1.jpg')]),
  ]);
  const t2 = Date.now();

  const mismo = coseno(a, a2[0]);
  const parecido = coseno(a, a3[0]);
  const otro = coseno(a, personaB[0]);

  console.log(`[2] 3 embeddings en ${t2 - t1} ms (${((t2 - t1) / 3).toFixed(0)} ms c/u)`);
  console.log(`[3] dimensión del embedding: ${a.length} (esperado ${ARCFACE_DIMENSION})`);
  console.log(`[4] ||embedding|| = ${norma(a).toFixed(6)} (debe ser 1: ArcFace exige normalizar)`);
  console.log('');
  console.log('--- Similitud coseno (esto es lo que se compara contra el umbral) ---');
  console.log(`  misma foto            ${mismo.toFixed(4)}`);
  console.log(`  mismo rostro, otra toma ${parecido.toFixed(4)}`);
  console.log(`  otro rostro            ${otro.toFixed(4)}`);
  console.log('');
  console.log(
    `  ${mismo.toFixed(4)} > ${parecido.toFixed(4)} > ${otro.toFixed(4)}  ${
      mismo > parecido && parecido > otro ? 'OK' : 'REVISAR: el orden no es el esperado'
    }`,
  );
  console.log(
    `  Nota: con rostros sintéticos estos valores no son los de una persona real.\n` +
      '        El UMBRAL_CONFIANZA_FACIAL se calibra con las fotos de R5 (tarea B4).',
  );
  console.log('');
  console.log(`[5] RSS ${rssBase} -> ${rss()} MB`);

  const consolidado = servicio.embeddingConsolidado([a, a2[0], a3[0]]);
  console.log(
    `[6] Consolidado de 3 fotos: ${consolidado.length} dims, ||.|| = ${norma(consolidado).toFixed(6)}`,
  );

  const fallos: string[] = [];
  if (a.length !== ARCFACE_DIMENSION)
    fallos.push(`dimensión ${a.length} != ${ARCFACE_DIMENSION}`);
  if (Math.abs(norma(a) - 1) > 1e-4) fallos.push('el embedding no está normalizado');
  if (!(mismo > parecido && parecido > otro))
    fallos.push('el orden de similitud no es el esperado');
  if (consolidado.length !== ARCFACE_DIMENSION)
    fallos.push('el consolidado tiene otra dimensión');

  console.log('');
  console.log(fallos.length ? `FALLÓ: ${fallos.join(' · ')}` : 'TODO OK');
  if (fallos.length) process.exit(1);
}

main().catch((e) => {
  console.error('FALLÓ:', e);
  process.exit(1);
});
