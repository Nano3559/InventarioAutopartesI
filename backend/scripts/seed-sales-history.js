const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedSalesHistory() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'autopartesdb',
  });

  await client.connect();
  console.log('====================================================');
  console.log('📦 GENERANDO HISTORIAL REALISTA DE VENTAS (9 MESES)');
  console.log('====================================================');

  // 1. Obtener datos maestros
  const prodsRes = await client.query('SELECT * FROM products WHERE activo = true;');
  const products = prodsRes.rows;

  const locsRes = await client.query("SELECT * FROM locations WHERE tipo = 'tienda';");
  const tiendas = locsRes.rows.length > 0 ? locsRes.rows : (await client.query("SELECT * FROM locations;")).rows;

  const usersRes = await client.query("SELECT id FROM users;");
  const users = usersRes.rows;

  const clientesRes = await client.query("SELECT id FROM clientes;");
  const clientes = clientesRes.rows;

  if (products.length === 0 || tiendas.length === 0 || users.length === 0) {
    console.error('❌ Faltan productos, tiendas o usuarios base.');
    await client.end();
    return;
  }

  // Ponderador de probabilidad de venta según segmento del parque
  const weightedProducts = [];
  for (const p of products) {
    let weight = 1;
    if (p.segmentoParque === 'Alto') weight = 4;
    else if (p.segmentoParque === 'Medio') weight = 2;
    else weight = 1;

    // Frecuencia adicional si es iluminación o cerrajería
    if (p.categoriaRepuesto === 'Iluminación' || p.categoriaRepuesto === 'Cerrajería') {
      weight += 1;
    }

    for (let w = 0; w < weight; w++) {
      weightedProducts.push(p);
    }
  }

  const now = new Date();
  const TOTAL_DAYS = 270; // 9 meses hacia atrás
  let saleCounter = 1;
  let totalItemsCount = 0;
  let totalDevolucionesCount = 0;

  // Limpiar ventas y devoluciones previas si se desea un seed limpio
  console.log('🧹 Limpiando ventas y devoluciones anteriores...');
  await client.query('TRUNCATE TABLE devoluciones, payments, sale_items, sales RESTART IDENTITY CASCADE;');

  console.log('⏳ Insertando transacciones...');
  // Generar entre 2 y 5 ventas por día a lo largo de 270 días
  for (let dayOffset = TOTAL_DAYS; dayOffset >= 0; dayOffset--) {
    const saleDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    // Variación según día de la semana (domingo menos ventas)
    const isWeekend = saleDate.getDay() === 0;
    const salesToday = isWeekend ? randomBetween(1, 2) : randomBetween(2, 5);

    for (let s = 0; s < salesToday; s++) {
      const tienda = randomChoice(tiendas);
      const user = randomChoice(users);
      const cliente = clientes.length > 0 && Math.random() > 0.4 ? randomChoice(clientes).id : null;
      const isMayor = Math.random() < 0.15; // 15% venta mayorista
      const tipo = isMayor ? 'mayor' : 'menor';
      const codigo = `VEN-${saleDate.getFullYear()}${String(saleDate.getMonth() + 1).padStart(2, '0')}-${String(saleCounter).padStart(5, '0')}`;
      saleCounter++;

      // Hora aleatoria entre 08:30 y 18:30
      saleDate.setHours(randomBetween(8, 18), randomBetween(0, 59), randomBetween(0, 59));

      // Items en la venta (1 a 3 productos distintos)
      const numItems = isMayor ? 1 : randomBetween(1, 3);
      const selectedProducts = [];
      for (let i = 0; i < numItems; i++) {
        const prod = randomChoice(weightedProducts);
        if (!selectedProducts.some(sp => sp.id === prod.id)) {
          selectedProducts.push(prod);
        }
      }

      let totalVenta = 0;
      const itemsToInsert = [];

      for (const prod of selectedProducts) {
        let cantidad = 1;
        let precio = prod.precio1 || prod.costo * 1.35;

        if (isMayor) {
          cantidad = randomBetween(6, 18);
          precio = prod.precioMayor || prod.costo * 1.20;
        } else {
          cantidad = Math.random() < 0.8 ? 1 : 2;
        }

        const subtotal = Math.round(cantidad * precio * 100) / 100;
        totalVenta += subtotal;
        itemsToInsert.push({ prod, cantidad, precio, subtotal });
      }

      totalVenta = Math.round(totalVenta * 100) / 100;

      // Insertar Venta
      const saleInsert = await client.query(`
        INSERT INTO sales (codigo, fecha, tipo, total, "requiereFactura", "locationId", "usuarioId", "clienteId")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id;
      `, [codigo, saleDate, tipo, totalVenta, Math.random() < 0.3, tienda.id, user.id, cliente]);

      const saleId = saleInsert.rows[0].id;

      // Insertar Items
      for (const item of itemsToInsert) {
        const itemInsert = await client.query(`
          INSERT INTO sale_items ("saleId", "productId", cantidad, precio, subtotal)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id;
        `, [saleId, item.prod.id, item.cantidad, item.precio, item.subtotal]);
        totalItemsCount++;

        const itemId = itemInsert.rows[0].id;

        // Ocasional devolución (2% de los items)
        if (Math.random() < 0.025) {
          const motivo = randomChoice([
            'Falla de fábrica en encaje',
            'No coincide con año del cliente',
            'Defecto estético en pintura',
            'Devolución de taller por cambio de presupuesto'
          ]);

          const devolDate = new Date(saleDate.getTime() + randomBetween(1, 5) * 24 * 60 * 60 * 1000);
          await client.query(`
            INSERT INTO devoluciones (fecha, "productId", "ventaId", "saleItemId", motivo, cantidad, monto, metodo, "locationId", "usuarioId")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
          `, [devolDate, item.prod.id, saleId, itemId, motivo, 1, item.precio, 'efectivo', tienda.id, user.id]);
          totalDevolucionesCount++;
        }
      }

      // Insertar Pago
      const metodo = randomChoice(['efectivo', 'qr', 'transferencia']);
      await client.query(`
        INSERT INTO payments ("saleId", metodo, monto)
        VALUES ($1, $2, $3);
      `, [saleId, metodo, totalVenta]);
    }
  }

  console.log('\n====================================================');
  console.log('✅ HISTORIAL DE VENTAS SEMBRADO CON ÉXITO');
  console.log('====================================================');
  console.log(`📊 Ventas creadas:      ${saleCounter - 1}`);
  console.log(`📦 Líneas de detalle:   ${totalItemsCount}`);
  console.log(`↩️ Devoluciones:        ${totalDevolucionesCount}`);
  console.log(`🗓️ Rango temporal:      Últimos ${TOTAL_DAYS} días`);

  // Top 5 más vendidos vs Menos vendidos
  const topSales = await client.query(`
    SELECT p.id, p.producto, p.marca, p.modelo, p."segmentoParque", p."categoriaRepuesto", 
           SUM(si.cantidad) as total_unidades
    FROM sale_items si
    JOIN products p ON p.id = si."productId"
    GROUP BY p.id, p.producto, p.marca, p.modelo, p."segmentoParque", p."categoriaRepuesto"
    ORDER BY total_unidades DESC
    LIMIT 5;
  `);
  console.log('\n⭐ TOP 5 PRODUCTOS MÁS VENDIDOS:');
  console.table(topSales.rows);

  const bottomSales = await client.query(`
    SELECT p.id, p.producto, p.marca, p.modelo, p."segmentoParque", p."categoriaRepuesto", 
           COALESCE(SUM(si.cantidad), 0) as total_unidades
    FROM products p
    LEFT JOIN sale_items si ON p.id = si."productId"
    GROUP BY p.id, p.producto, p.marca, p.modelo, p."segmentoParque", p."categoriaRepuesto"
    ORDER BY total_unidades ASC
    LIMIT 5;
  `);
  console.log('\n⚠️ PRODUCTOS CON MENOR ROTACIÓN (ROTACIÓN LENTA):');
  console.table(bottomSales.rows);

  await client.end();
}

seedSalesHistory().catch(err => {
  console.error('Error al sembrar ventas:', err);
  process.exit(1);
});

