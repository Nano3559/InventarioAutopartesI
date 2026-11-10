const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const ALTO_PARQUE = ['Hilux', 'Corolla', 'RAV4', 'Prado', 'Yaris', 'Frontier', 'NP300'];
const MEDIO_PARQUE = ['Sentra', 'Tiida', 'Tucson', 'Accent', 'L200', 'Montero', 'Mazda3', 'CX-5'];

function getCategory(producto) {
  const p = producto.toLowerCase();
  if (p.includes('farol') || p.includes('guiñador') || p.includes('stop')) return 'Iluminación';
  if (p.includes('radiador') || p.includes('condensador') || p.includes('tanque')) return 'Refrigeración';
  if (p.includes('jalador') || p.includes('manivela')) return 'Cerrajería';
  return 'Carrocería';
}

function getTipoDesgaste(categoria) {
  switch (categoria) {
    case 'Iluminación': return 'desgaste_medio';
    case 'Refrigeración': return 'correctivo';
    case 'Cerrajería': return 'desgaste_frecuente';
    case 'Carrocería':
    default: return 'colision';
  }
}

function getSegmentoParque(modelo) {
  for (const m of ALTO_PARQUE) {
    if (modelo.toLowerCase().includes(m.toLowerCase())) return 'Alto';
  }
  for (const m of MEDIO_PARQUE) {
    if (modelo.toLowerCase().includes(m.toLowerCase())) return 'Medio';
  }
  return 'Nicho';
}

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'autopartesdb',
  });

  await client.connect();
  console.log('🔄 Enriqueciendo clasificación técnica de los 37 productos...');

  const res = await client.query('SELECT id, producto, modelo FROM products;');
  for (const prod of res.rows) {
    const categoria = getCategory(prod.producto);
    const tipo = getTipoDesgaste(categoria);
    const parque = getSegmentoParque(prod.modelo);

    await client.query(`
      UPDATE products 
      SET "categoriaRepuesto" = $1, "tipoDesgaste" = $2, "segmentoParque" = $3
      WHERE id = $4;
    `, [categoria, tipo, parque, prod.id]);
  }

  console.log('✅ 37 productos clasificados con éxito.');
  const summary = await client.query(`
    SELECT "categoriaRepuesto", "tipoDesgaste", "segmentoParque", COUNT(*) as total
    FROM products
    GROUP BY "categoriaRepuesto", "tipoDesgaste", "segmentoParque"
    ORDER BY total DESC;
  `);
  console.table(summary.rows);

  await client.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

