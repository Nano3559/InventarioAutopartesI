const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function extractTrainingData() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'autopartesdb',
  });

  await client.connect();
  console.log('====================================================');
  console.log('📊 EXTRAYENDO DATASET DE ENTRENAMIENTO PARA MACHINE LEARNING');
  console.log('====================================================');

  const query = `
    WITH ventas_agg AS (
      SELECT 
        si."productId",
        SUM(si.cantidad) AS total_vendido,
        COUNT(DISTINCT s.id) AS total_transacciones,
        AVG(si.precio) AS precio_promedio_venta
      FROM sale_items si
      JOIN sales s ON s.id = si."saleId"
      GROUP BY si."productId"
    ),
    devoluciones_agg AS (
      SELECT 
        "productId",
        SUM(cantidad) AS total_devuelto
      FROM devoluciones
      GROUP BY "productId"
    ),
    inventario_agg AS (
      SELECT 
        "productId",
        SUM(cantidad) AS stock_total,
        COUNT(DISTINCT "locationId") AS tiendas_con_stock
      FROM inventory
      GROUP BY "productId"
    )
    SELECT 
      p.id AS producto_id,
      p.producto,
      p.marca,
      p.modelo,
      COALESCE(p."categoriaRepuesto", 'General') AS categoria_repuesto,
      COALESCE(p."tipoDesgaste", 'preventivo') AS tipo_desgaste,
      COALESCE(p."segmentoParque", 'Medio') AS segmento_parque,
      p.costo,
      COALESCE(p.precio1, p.costo * 1.35) AS precio1,
      COALESCE(p."precioMayor", p.costo * 1.20) AS precio_mayor,
      ROUND(CAST((COALESCE(p.precio1, p.costo * 1.35) - p.costo) / NULLIF(p.costo, 0) AS numeric), 4) AS margen_relativo,
      ROUND(CAST(COALESCE(p."precioMayor", p.costo * 1.20) / NULLIF(COALESCE(p.precio1, p.costo * 1.35), 0) AS numeric), 4) AS ratio_precio_mayor,
      COALESCE(i.stock_total, 10) AS stock_actual,
      COALESCE(v.total_vendido, 0) AS unidades_vendidas_brutas,
      COALESCE(d.total_devuelto, 0) AS unidades_devueltas,
      (COALESCE(v.total_vendido, 0) - COALESCE(d.total_devuelto, 0)) AS ventas_netas,
      ROUND(CAST(COALESCE(d.total_devuelto, 0)::numeric / NULLIF(COALESCE(v.total_vendido, 0), 0) AS numeric), 4) AS tasa_devolucion,
      -- Días activos de venta (horizonte de 270 días)
      270 AS dias_horizonte,
      -- Demanda diaria promedio
      ROUND(CAST((COALESCE(v.total_vendido, 0) - COALESCE(d.total_devuelto, 0))::numeric / 270.0 AS numeric), 4) AS demanda_diaria_promedio,
      -- Estimación de días de rotación (cuánto tardan en agotarse 30 unidades)
      ROUND(CAST(30.0 / NULLIF((COALESCE(v.total_vendido, 0) - COALESCE(d.total_devuelto, 0))::numeric / 270.0, 0) AS numeric), 1) AS dias_rotacion_lote30
    FROM products p
    LEFT JOIN ventas_agg v ON v."productId" = p.id
    LEFT JOIN devoluciones_agg d ON d."productId" = p.id
    LEFT JOIN inventario_agg i ON i."productId" = p.id
    WHERE p.activo = true
    ORDER BY ventas_netas DESC;
  `;

  const res = await client.query(query);
  const rows = res.rows;

  // Calcular percentiles de ventas netas para etiquetar las clases de éxito objetivo (y)
  const ventasArray = rows.map(r => Number(r.ventas_netas)).sort((a, b) => a - b);
  const p33 = ventasArray[Math.floor(ventasArray.length * 0.33)];
  const p66 = ventasArray[Math.floor(ventasArray.length * 0.66)];

  console.log(`📈 Umbrales calculados: P33 = ${p33} ventas | P66 = ${p66} ventas`);

  const enrichedRows = rows.map(r => {
    const netas = Number(r.ventas_netas);
    const margen = Number(r.margen_relativo);
    const tasaDev = Number(r.tasa_devolucion) || 0;

    // Target y: 2 = Alto Éxito, 1 = Medio, 0 = Riesgo/Lento
    let claseExito = 1;
    let etiquetaExito = 'Medio';

    if (netas >= p66 && margen >= 0.25 && tasaDev < 0.05) {
      claseExito = 2;
      etiquetaExito = 'Alta Rotación';
    } else if (netas < p33 || tasaDev > 0.08) {
      claseExito = 0;
      etiquetaExito = 'Baja Rotación / Riesgo';
    }

    return {
      ...r,
      clase_exito: claseExito,
      etiqueta_exito: etiquetaExito,
    };
  });

  // Generar CSV
  const headers = Object.keys(enrichedRows[0]);
  const csvContent = [
    headers.join(','),
    ...enrichedRows.map(row => 
      headers.map(h => {
        let val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
        return val;
      }).join(',')
    )
  ].join('\n');

  const outputPath = path.join(__dirname, '..', '..', 'dataset_entrenamiento.csv');
  fs.writeFileSync(outputPath, csvContent, 'utf-8');

  console.log(`\n✅ Archivo CSV generado con éxito en:`);
  console.log(`   📁 ${outputPath}`);
  console.log(`📊 Total de filas procesadas: ${enrichedRows.length}`);

  // Resumen de clases generadas
  const classCounts = { 'Alta Rotación (2)': 0, 'Medio (1)': 0, 'Baja Rotación / Riesgo (0)': 0 };
  enrichedRows.forEach(r => {
    if (r.clase_exito === 2) classCounts['Alta Rotación (2)']++;
    else if (r.clase_exito === 1) classCounts['Medio (1)']++;
    else classCounts['Baja Rotación / Riesgo (0)']++;
  });
  console.table(classCounts);

  await client.end();
}

extractTrainingData().catch(err => {
  console.error('Error al extraer datos:', err);
  process.exit(1);
});

