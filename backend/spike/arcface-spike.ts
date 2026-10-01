/**
 * Spike B2 (Hito 3) — ¿entra ArcFace int8 en el contenedor de Render (512 MB)?
 *
 * Mide, con onnxruntime-node y el modelo real:
 *   - tiempo de carga de la InferenceSession
 *   - latencia por inferencia (1 embedding) y por tanda de 5
 *   - RSS del proceso: base, tras cargar el modelo, con 1 y con 5 embeddings en memoria
 *
 * Uso:  npm run spike:arcface
 * El modelo se descarga aparte a backend/spike/models/ (ver README.md del spike).
 */
import * as path from 'path';
import * as ort from 'onnxruntime-node';

const MODEL_PATH =
  process.env.ARCFACE_MODEL ||
  path.join(__dirname, 'models', 'arcfaceresnet100-11-int8.onnx');

const SIZE = 112;
const ITERACIONES = 20;
const EMBEDDINGS_EN_MEMORIA = 5;

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

/** RSS en MB. gc() opcional para que la lectura sea estable. */
function rss() {
  const g = global as unknown as { gc?: () => void };
  if (g.gc) g.gc();
  return Number(mb(process.memoryUsage().rss));
}

function ALEATORIO_SEMILLA(semilla: number): Float32Array {
  // Determinista: mismo input en cada corrida, para que los números sean comparables.
  let estado = semilla;
  const siguiente = () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    return estado / 4294967296;
  };
  const datos = new Float32Array(1 * 3 * SIZE * SIZE);
  for (let i = 0; i < datos.length; i++) {
    // Equivale a (px - 127.5) / 128 sobre un píxel de 0..255.
    datos[i] = (siguiente() * 255 - 127.5) / 128;
  }
  return datos;
}

async function main() {
  console.log('node            :', process.version);
  console.log('onnxruntime-node:', require('onnxruntime-node/package.json').version);
  console.log('model           :', MODEL_PATH);
  console.log('');

  const rssBase = rss();
  console.log(`[1] RSS base (sin modelo)          ${rssBase} MB`);

  const t0 = performance.now();
  const session = await ort.InferenceSession.create(MODEL_PATH, {
    executionProviders: ['cpu'],
    graphOptimizationLevel: 'all',
  });
  const cargaMs = performance.now() - t0;

  const entrada = session.inputNames[0];
  const salida = session.outputNames[0];
  console.log(`[2] Session creada en ${cargaMs.toFixed(0)} ms`);
  console.log(`    input  "${entrada}"  output "${salida}"`);
  console.log(`[3] RSS tras cargar el modelo     ${rssBase} -> ${rss()} MB`);

  const corrida = async (semilla: number) => {
    const tensor = new ort.Tensor('float32', ALEATORIO_SEMILLA(semilla), [
      1,
      3,
      SIZE,
      SIZE,
    ]);
    const salidaTensor = await session.run({ [entrada]: tensor });
    return salidaTensor[salida].data as Float32Array;
  };

  // Warmup: la primera inferencia paga inicialización de threads y arenas.
  await corrida(0);
  await corrida(1);
  console.log(`[4] RSS tras 2 inferencias        ${rss()} MB`);
  console.log('');

  // --- Latencia con 1 embedding ---
  const muestras1: number[] = [];
  for (let i = 0; i < ITERACIONES; i++) {
    const t = performance.now();
    await corrida(100 + i);
    muestras1.push(performance.now() - t);
  }
  muestras1.sort((a, b) => a - b);
  const media1 = muestras1.reduce((a, b) => a + b, 0) / muestras1.length;
  const p50 = muestras1[Math.floor(muestras1.length * 0.5)];
  const p95 = muestras1[Math.floor(muestras1.length * 0.95)];

  console.log(`[5] Latencia 1 embedding  (n=${ITERACIONES})`);
  console.log(
    `    media ${media1.toFixed(1)} ms  p50 ${p50.toFixed(1)} ms  p95 ${p95.toFixed(1)} ms`,
  );

  // --- Tanda de 5 embeddings (lo que hace el registro: promedia N fotos) ---
  const tanda = await Promise.all(
    Array.from({ length: EMBEDDINGS_EN_MEMORIA }, (_, i) => corrida(200 + i)),
  );
  const rss5 = rss();
  console.log(
    `[6] Tanda de ${EMBEDDINGS_EN_MEMORIA} embeddings  media ${(media1 * EMBEDDINGS_EN_MEMORIA).toFixed(1)} ms (estimado x5)`,
  );

  const dim = tanda[0].length;
  let norma = 0;
  for (const v of tanda[0]) norma += v * v;
  console.log(`    dimensión del embedding: ${dim}`);
  console.log(
    `    ||embedding sin normalizar|| = ${Math.sqrt(norma).toFixed(4)}  (ArcFace exige normalizar a 1)`,
  );

  // Los 5 embeddings quedan vivos a propósito: es el peor caso del índice en memoria.
  const resident = tanda.map((e) => Float32Array.from(e));
  const rssTrasRetener = rss();
  console.log(`[7] RSS con ${resident.length} embeddings retenidos  ${rss5} -> ${rssTrasRetener} MB`);

  const rssFinal = rss();
  const overheadModelo = rssFinal - rssBase;
  console.log('');
  console.log('--- Resumen ---');
  console.log(`RSS base                  ${rssBase} MB`);
  console.log(`RSS final                 ${rssFinal} MB`);
  console.log(`Overhead total (modelo + 5 embeddings) ${overheadModelo.toFixed(1)} MB`);
  console.log(`Latencia 1 embedding      ${media1.toFixed(1)} ms`);
  console.log(`Embeddings por segundo    ${(1000 / media1).toFixed(1)}`);
  console.log(
    `Presupuesto 512 MB: ${overheadModelo < 512 ? 'ENTRA' : 'NO ENTRA'} (holgura ${(512 - overheadModelo).toFixed(1)} MB)`,
  );

  if (resident.length !== EMBEDDINGS_EN_MEMORIA) {
    throw new Error('No se retuvieron los embeddings esperados');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
