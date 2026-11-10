/**
 * Script para clonar la base de datos de producción (Supabase) hacia la base de datos local (PostgreSQL).
 * Lee credenciales de backend/.env
 * Ejecutar con: node scripts/clone-db-from-supabase.js
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Cargar .env de backend
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const { Client } = require('pg');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: SUPABASE_URL o SUPABASE_KEY no definidos en backend/.env');
  process.exit(1);
}

// Orden de inserción respetando Foreign Keys
const TABLES = [
  'locations',
  'users',
  'proveedores',
  'clientes',
  'products',
  'inventory',
  'facturas',
  'factura_items',
  'sales',
  'sale_items',
  'payments',
  'movimientos',
  'solicitudes',
  'devoluciones',
  'asistencia'
];

async function fetchFromSupabase(table) {
  let allData = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Range-Unit': 'items',
        'Range': `${page * pageSize}-${(page + 1) * pageSize - 1}`
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      // Si la tabla no existe en Supabase, la saltamos
      if (res.status === 404 || errText.includes('does not exist')) {
        return [];
      }
      throw new Error(`Error ${res.status} al obtener ${table}: ${errText}`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  return allData;
}

async function clone() {
  console.log('====================================================');
  console.log('🔄 INICIANDO CLONACIÓN: SUPABASE ➔ POSTGRESQL LOCAL');
  console.log('====================================================');
  console.log(`📡 Origen (Supabase): ${SUPABASE_URL}`);
  console.log(`💻 Destino (Local):    ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'autopartesdb'}\n`);

  const localClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'autopartesdb',
    ssl: false
  });

  await localClient.connect();

  try {
    // 1. Limpiar datos locales
    console.log('🧹 Limpiando tablas locales existentes...');
    const tablesTruncate = TABLES.map(t => `"${t}"`).join(', ');
    await localClient.query(`TRUNCATE TABLE ${tablesTruncate} RESTART IDENTITY CASCADE;`);
    console.log('   ✓ Tablas locales limpiadas.\n');

    // 2. Descargar de Supabase e insertar en local
    for (const table of TABLES) {
      process.stdout.write(`📥 Clonando tabla [${table}]... `);
      const rows = await fetchFromSupabase(table);

      if (rows.length === 0) {
        console.log('0 registros (vacía)');
        continue;
      }

      // Preparar inserción masiva
      const columns = Object.keys(rows[0]);
      const quotedCols = columns.map(c => `"${c}"`).join(', ');

      for (const row of rows) {
        const values = columns.map(col => {
          const val = row[col];
          if (val === null || val === undefined) return null;
          // Si es array u objeto (ej. embedding jsonb), serializar a JSON
          if (typeof val === 'object') return JSON.stringify(val);
          return val;
        });

        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const query = `INSERT INTO "${table}" (${quotedCols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING;`;
        await localClient.query(query, values);
      }

      // Actualizar la secuencia del ID si existe
      try {
        await localClient.query(`
          SELECT setval(
            pg_get_serial_sequence('"${table}"', 'id'),
            COALESCE((SELECT MAX(id) FROM "${table}"), 1)
          );
        `);
      } catch (_) {
        // Algunas tablas podrían no tener columna id serial estándar
      }

      console.log(`✓ ${rows.length} registros copiados.`);
    }

    console.log('\n====================================================');
    console.log('✅ CLONACIÓN COMPLETADA CON ÉXITO');
    console.log('====================================================');

    // Resumen de verificación
    console.log('\n📊 Resumen de registros en tu Base de Datos Local:');
    for (const table of TABLES) {
      const res = await localClient.query(`SELECT COUNT(*) FROM "${table}";`);
      console.log(`   • ${table.padEnd(16)}: ${res.rows[0].count} filas`);
    }

  } catch (error) {
    console.error('\n❌ Error durante la clonación:', error.message);
  } finally {
    await localClient.end();
  }
}

clone();

