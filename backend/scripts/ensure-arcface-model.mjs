/**
 * Descarga el modelo ArcFace int8 (Apache-2.0) si no está en el servidor.
 *
 * El modelo pesa 63 MB y **no se versiona**, así que Render no lo tiene: sin este
 * paso, `POST /users/face/register` y `POST /attendance/check` responden 503 con
 * "No se encontró el modelo ArcFace".
 *
 * Corre como `prestart:prod`, o sea en cada arranque del servicio. Es idempotente:
 *   - si `ARCFACE_MODEL` apunta a un archivo existente, no hace nada;
 *   - si el archivo ya está descargado (con el tamaño esperado), no hace nada.
 *
 * En Render el disco **persiste entre spin-down** (solo lo borra un deploy nuevo),
 * así que la descarga ocurre una sola vez por despliegue. Un fallo de red no debe
 * tumbar el arranque: el resto de la API funciona sin reconocimiento facial, por eso
 * sale con código 0 y un aviso.
 *
 * Uso: node scripts/ensure-arcface-model.mjs
 */
import { createWriteStream, existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NOMBRE = 'arcfaceresnet100-11-int8.onnx';
const URL_MODELO = `https://huggingface.co/onnxmodelzoo/arcfaceresnet100-11-int8/resolve/main/${NOMBRE}`;

/** 63 MB ± 5 %: un HTML de error de HuggingFace pesa mucho menos que esto. */
const TAMANO_MINIMO = 55 * 1024 * 1024;
const TAMANO_MAXIMO = 72 * 1024 * 1024;

const avisos = (mensaje) => console.warn(`[arcface] ${mensaje}`);

function destino() {
  const desdeEnv = process.env.ARCFACE_MODEL?.trim();
  if (desdeEnv) return resolve(desdeEnv);
  return join(RAIZ, 'models', NOMBRE);
}

function yaEsta(ruta) {
  if (!existsSync(ruta)) return false;
  const { size } = statSync(ruta);
  if (size < TAMANO_MINIMO) {
    avisos(`"${ruta}" pesa ${size} bytes: parece una descarga incompleta, se vuelve a bajar`);
    return false;
  }
  if (size > TAMANO_MAXIMO) {
    avisos(`"${ruta}" pesa ${size} bytes y no parece el modelo ArcFace (63 MB)`);
    return false;
  }
  return true;
}

async function descargar(ruta) {
  mkdirSync(dirname(ruta), { recursive: true });
  const temporal = `${ruta}.descargando`;
  const respuesta = await fetch(URL_MODELO, { redirect: 'follow' });
  if (!respuesta.ok || !respuesta.body) {
    throw new Error(`HTTP ${respuesta.status} al bajar el modelo`);
  }
  await pipeline(Readable.fromWeb(respuesta.body), createWriteStream(temporal));
  const { size } = statSync(temporal);
  if (size < TAMANO_MINIMO) {
    throw new Error(`descarga incompleta: ${size} bytes`);
  }
  renameSync(temporal, ruta);
  console.log(
    `[arcface] modelo descargado en ${ruta} (${(size / 1024 / 1024).toFixed(1)} MB)`,
  );
}

const ruta = destino();
if (yaEsta(ruta)) {
  console.log(`[arcface] modelo ya presente en ${ruta}`);
} else {
  try {
    await descargar(ruta);
  } catch (err) {
    avisos(
      `no se pudo descargar el modelo (${err.message}). El reconocimiento facial quedará ` +
        'deshabilitado (503) hasta que el archivo esté en el servidor; el resto de la API funciona.',
    );
  }
}