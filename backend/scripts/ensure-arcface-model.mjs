/**
 * Descarga los modelos de reconocimiento y detección facial si no están en el servidor:
 * 1. ArcFace int8 (Apache-2.0, 63 MB): embeddings de identidad (512 dims)
 * 2. UltraFace RFB-320 (MIT, 1.2 MB): detector de rostros y recorte automático
 *
 * Corre como `prestart:prod` antes del arranque del servicio en Render.
 */
import { createWriteStream, existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const MODELOS = [
  {
    nombre: 'arcfaceresnet100-11-int8.onnx',
    url: 'https://huggingface.co/onnxmodelzoo/arcfaceresnet100-11-int8/resolve/main/arcfaceresnet100-11-int8.onnx',
    envVar: 'ARCFACE_MODEL',
    minSize: 55 * 1024 * 1024,
    maxSize: 72 * 1024 * 1024,
    etiqueta: 'arcface',
  },
  {
    nombre: 'version-RFB-320.onnx',
    url: 'https://github.com/onnx/models/raw/main/validated/vision/body_analysis/ultraface/models/version-RFB-320.onnx',
    envVar: 'ULTRAFACE_MODEL',
    minSize: 1024 * 1024,
    maxSize: 3 * 1024 * 1024,
    etiqueta: 'ultraface',
  },
];

const avisos = (tag, mensaje) => console.warn(`[${tag}] ${mensaje}`);

function destino(m) {
  const desdeEnv = process.env[m.envVar]?.trim();
  if (desdeEnv) return resolve(desdeEnv);
  return join(RAIZ, 'models', m.nombre);
}

function yaEsta(m, ruta) {
  if (!existsSync(ruta)) return false;
  const { size } = statSync(ruta);
  if (size < m.minSize) {
    avisos(m.etiqueta, `"${ruta}" pesa ${size} bytes: descarga incompleta, se vuelve a bajar`);
    return false;
  }
  if (size > m.maxSize) {
    avisos(m.etiqueta, `"${ruta}" pesa ${size} bytes y no coincide con el rango esperado`);
    return false;
  }
  return true;
}

async function descargar(m, ruta) {
  mkdirSync(dirname(ruta), { recursive: true });
  const temporal = `${ruta}.descargando`;
  const respuesta = await fetch(m.url, { redirect: 'follow' });
  if (!respuesta.ok || !respuesta.body) {
    throw new Error(`HTTP ${respuesta.status} al bajar el modelo`);
  }
  await pipeline(Readable.fromWeb(respuesta.body), createWriteStream(temporal));
  const { size } = statSync(temporal);
  if (size < m.minSize) {
    throw new Error(`descarga incompleta: ${size} bytes`);
  }
  renameSync(temporal, ruta);
  console.log(
    `[${m.etiqueta}] modelo descargado en ${ruta} (${(size / 1024 / 1024).toFixed(1)} MB)`,
  );
}

for (const m of MODELOS) {
  const ruta = destino(m);
  if (yaEsta(m, ruta)) {
    console.log(`[${m.etiqueta}] modelo ya presente en ${ruta}`);
  } else {
    try {
      await descargar(m, ruta);
    } catch (err) {
      avisos(
        m.etiqueta,
        `no se pudo descargar el modelo (${err.message}). Se usará modo alternativo si está disponible.`,
      );
    }
  }
}