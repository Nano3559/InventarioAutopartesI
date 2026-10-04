/**
 * Prueba de rehidratación del índice facial tras un spin-down de Render (B6).
 *
 * El seed de producción no tiene rostros, así que `indiceEnMemoria === rostrosEnBase`
 * sería 0 === 0 y no probaría nada. Este script mete un embedding sintético en un
 * usuario **temporal**, para que al reiniciar la instancia el `onModuleInit` tenga
 * algo real que rehidratar:
 *
 *   1. crea el usuario por la API (mismo camino que el resto del equipo)
 *   2. le escribe un vector normalizado de 512 floats por SQL
 *   3. deja que Render apague la instancia por inactividad
 *   4. al primer request: cronometra el cold start y compara rostro en base vs índice
 *
 * Uso: node spike/probar-rehidratacion.mjs
 */
import 'dotenv/config';
import { Client } from 'pg';

const BASE = process.env.BASE_URL ?? 'https://inventarioautopartesi.onrender.com/api';
const ADMIN = { email: 'admin@importadoras.com', password: 'admin123' };
const TEMPORAL = {
  nombre: 'Temporal',
  apellido: 'Rehidratacion',
  email: 'temporal.rehidratacion@importadoras.com',
  password: 'Temporal123',
  rol: 'tienda',
};

async function api(ruta, opciones = {}) {
  const r = await fetch(`${BASE}${ruta}`, opciones);
  const texto = await r.text();
  if (!r.ok) throw new Error(`${ruta} -> ${r.status} ${texto.slice(0, 200)}`);
  return texto ? JSON.parse(texto) : null;
}

const token = await api('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(ADMIN),
}).then((r) => r.accessToken ?? r.token);
const auth = { Authorization: `Bearer ${token}` };

const estado = async () => api('/face/status', { headers: auth });

// ---------------------------------------------------------------- 1. usuario
let usuario = await api(`/users?search=${TEMPORAL.email}`, { headers: auth })
  .then((r) => r.find((u) => u.email === TEMPORAL.email));

if (!usuario) {
  usuario = await api('/users', {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(TEMPORAL),
  });
  console.log(`[1] usuario temporal creado: id=${usuario.id}`);
} else {
  console.log(`[1] usuario temporal ya existia: id=${usuario.id}`);
}

// ------------------------------------------------- 2. embedding sintético
const db = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});
await db.connect();
// Vector aleatorio normalizado a 1: es lo único que exige el índice (coseno).
const bruto = Array.from({ length: 512 }, () => Math.random() * 2 - 1);
const norma = Math.sqrt(bruto.reduce((s, x) => s + x * x, 0));
const embedding = bruto.map((x) => Number((x / norma).toFixed(8)));
// `users.embedding` es `jsonb`: se pasa el array, no un string.
await db.query('UPDATE users SET embedding = $1::jsonb WHERE id = $2', [
  JSON.stringify(embedding),
  usuario.id,
]);
await db.end();
console.log(`[2] embedding normalizado de 512 floats escrito en users.id=${usuario.id}`);

const antes = await estado();
console.log(
  `[3] con la instancia viva: rostrosEnBase=${antes.rostrosEnBase} ` +
    `indiceEnMemoria=${antes.indiceEnMemoria} indiceCompleto=${antes.indiceCompleto} ` +
    `(el índice en memoria solo crece al arrancar o al registrar un rostro)`,
);

// --------------------------------------- 4. esperar el spin-down de Render
const ESPERA_MS = Number(process.env.ESPERA_MS ?? 17 * 60 * 1000);
const limite = Date.now() + ESPERA_MS;
console.log(`[4] sin tocar el servicio por ${Math.round(ESPERA_MS / 60000)} min para que Render apague la instancia...`);
while (Date.now() < limite) {
  const restante = limite - Date.now();
  await new Promise((r) => setTimeout(r, Math.min(restante, 60_000)));
  console.log(`    ${Math.round((limite - Date.now()) / 60000)} min restantes`);
}

// ------------------------------------------------- 5. cold start + rehidratación
const t0 = Date.now();
const primerRequest = await api('/face/status', { headers: auth });
const coldStart = Date.now() - t0;
console.log(`[5] primer request tras la espera: ${coldStart} ms`);
console.log(
  `    rostrosEnBase=${primerRequest.rostrosEnBase} indiceEnMemoria=${primerRequest.indiceEnMemoria} ` +
    `indiceCompleto=${primerRequest.indiceCompleto} modelo=${primerRequest.modelo.disponible}`,
);
const warm = await api('/face/warmup', { method: 'POST', headers: auth });
console.log(`[6] warmup con el modelo en frio: ${warm.ms} ms (yaEstabaCargada=${warm.yaEstabaCargada})`);

if (process.env.LIMPIAR !== 'false') {
  await api(`/users/${usuario.id}`, { method: 'DELETE', headers: auth });
  console.log(`[7] usuario temporal ${usuario.id} eliminado`);
} else {
  console.log(`[7] LIMPIAR=false: el usuario ${usuario.id} queda en la BD`);
}