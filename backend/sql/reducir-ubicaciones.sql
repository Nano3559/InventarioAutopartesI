-- Migración: pasar de 4 almacenes + 3 tiendas a **1 almacén + 3 tiendas**.
--
-- Por qué existe: el seed (`backend/src/seed.ts`) ya solo siembra ALM-1 + TDA-1/2/3,
-- pero una BD que ya tenía las 7 ubicaciones sigue teniendo ALM-2, ALM-3 y ALM-4
-- con datos reales. Este script consolida ese stock en ALM-1 y borra las 3 filas.
--
-- ⚠️  DESTRUCTIVO E IRREVERSIBLE. Borra filas de `locations` y mueve/reasigna
--     datos de `inventory`, `sales`, `movimientos`, `devoluciones`,
--     `solicitudes` y `factura_items`. Hacé un backup (o snapshot de Supabase)
--     ANTES de ejecutar.
--
-- Cómo usarlo: correr el PASO 1, revisar el reporte, y solo si coincide con lo
-- esperado correr el PASO 2 (que va entero en una transacción: si algo falla,
-- no queda nada a medias).
--
-- Idempotente: si ALM-2/3/4 ya no existen, los UPDATE/DELETE no tocan nada.

-- ============================================================
-- PASO 1 — Reporte previo (solo lectura, no modifica nada)
-- ============================================================

-- 1a. Qué ubicaciones se van a borrar y cuánto stock tienen.
SELECT l.id, l.codigo, l.nombre, l.tipo,
       COALESCE(SUM(i.cantidad), 0) AS unidades_en_stock,
       COUNT(i.id)                  AS filas_inventario
FROM locations l
LEFT JOIN inventory i ON i."locationId" = l.id
WHERE l.codigo IN ('ALM-2', 'ALM-3', 'ALM-4')
GROUP BY l.id, l.codigo, l.nombre, l.tipo
ORDER BY l.id;

-- 1b. Cuántas filas de cada tabla referencian esas ubicaciones (lo que se reasigna).
SELECT 'inventory'        AS tabla, COUNT(*) AS filas FROM inventory        WHERE "locationId" IN (SELECT id FROM locations WHERE codigo IN ('ALM-2','ALM-3','ALM-4'))
UNION ALL SELECT 'sales',              COUNT(*) FROM sales                WHERE "locationId" IN (SELECT id FROM locations WHERE codigo IN ('ALM-2','ALM-3','ALM-4'))
UNION ALL SELECT 'movimientos.origen', COUNT(*) FROM movimientos          WHERE "origenId"   IN (SELECT id FROM locations WHERE codigo IN ('ALM-2','ALM-3','ALM-4'))
UNION ALL SELECT 'movimientos.destino',COUNT(*) FROM movimientos          WHERE "destinoId"  IN (SELECT id FROM locations WHERE codigo IN ('ALM-2','ALM-3','ALM-4'))
UNION ALL SELECT 'devoluciones',       COUNT(*) FROM devoluciones         WHERE "locationId" IN (SELECT id FROM locations WHERE codigo IN ('ALM-2','ALM-3','ALM-4'))
UNION ALL SELECT 'solicitudes.origen', COUNT(*) FROM solicitudes          WHERE "origenId"   IN (SELECT id FROM locations WHERE codigo IN ('ALM-2','ALM-3','ALM-4'))
UNION ALL SELECT 'factura_items',      COUNT(*) FROM factura_items        WHERE "almacenId"  IN (SELECT id FROM locations WHERE codigo IN ('ALM-2','ALM-3','ALM-4'))
UNION ALL SELECT 'asistencia',         COUNT(*) FROM asistencia           WHERE "locationId" IN (SELECT id FROM locations WHERE codigo IN ('ALM-2','ALM-3','ALM-4'))
ORDER BY tabla;

-- 1c. Confirmar que ALM-1 existe (es el destino de todo).
SELECT id, codigo, nombre FROM locations WHERE codigo = 'ALM-1';


-- ============================================================
-- PASO 2 — Migración (todo en una transacción)
-- ============================================================

BEGIN;

DO $$
DECLARE
  destino   integer;
  filas     integer;
BEGIN
  -- El almacén que sobrevive. Si no existe, aborta sin tocar nada.
  SELECT id INTO destino FROM locations WHERE codigo = 'ALM-1';
  IF destino IS NULL THEN
    RAISE EXCEPTION 'No existe la ubicación ALM-1: no hay adónde consolidar.';
  END IF;

  -- ----------------------------------------------------------
  -- 2a. INVENTORY: se SUMA el stock de los almacenes que se van
  --      al de ALM-1, y luego se borran sus filas.
  --      Ojo con el unique (productId, locationId): no se puede
  --      hacer un UPDATE simple, hay que agrupar primero.
  -- ----------------------------------------------------------
  WITH a_mover AS (
    SELECT "productId", SUM(cantidad) AS cantidad
    FROM inventory
    WHERE "locationId" IN (SELECT id FROM locations WHERE codigo IN ('ALM-2','ALM-3','ALM-4'))
    GROUP BY "productId"
  )
  UPDATE inventory inv
  SET cantidad = inv.cantidad + a_mover.cantidad
  FROM a_mover
  WHERE inv."locationId" = destino
    AND inv."productId"  = a_mover."productId";
  GET DIAGNOSTICS filas = ROW_COUNT;
  RAISE NOTICE 'inventory: % filas consolidadas en ALM-1', filas;

  -- Los productos que no tenían fila en ALM-1 se crean con el stock movido.
  INSERT INTO inventory ("productId", "locationId", cantidad)
  SELECT a_mover."productId", destino, a_mover.cantidad
  FROM a_mover
  WHERE NOT EXISTS (
    SELECT 1 FROM inventory
    WHERE "productId" = a_mover."productId" AND "locationId" = destino
  );
  GET DIAGNOSTICS filas = ROW_COUNT;
  RAISE NOTICE 'inventory: % productos nuevos creados en ALM-1', filas;

  -- Ya está consolidado: se borran las filas de los almacenes que desaparecen.
  DELETE FROM inventory
  WHERE "locationId" IN (SELECT id FROM locations WHERE codigo IN ('ALM-2','ALM-3','ALM-4'));

  -- ----------------------------------------------------------
  -- 2b. Registros históricos: se reasignan a ALM-1 para no
  --     perder el dato ni romper las foreign keys.
  --     `asistencia.locationId` y `users.tiendaId` son nullable
  --     con ON DELETE SET NULL, así que la propia BD los limpia.
  -- ----------------------------------------------------------
  UPDATE sales         SET "locationId" = destino WHERE "locationId" IN (SELECT id FROM locations WHERE codigo IN ('ALM-2','ALM-3','ALM-4'));
  UPDATE movimientos   SET "origenId"   = destino WHERE "origenId"   IN (SELECT id FROM locations WHERE codigo IN ('ALM-2','ALM-3','ALM-4'));
  UPDATE movimientos   SET "destinoId"  = destino WHERE "destinoId"  IN (SELECT id FROM locations WHERE codigo IN ('ALM-2','ALM-3','ALM-4'));
  UPDATE devoluciones  SET "locationId" = destino WHERE "locationId" IN (SELECT id FROM locations WHERE codigo IN ('ALM-2','ALM-3','ALM-4'));
  UPDATE solicitudes   SET "origenId"   = destino WHERE "origenId"   IN (SELECT id FROM locations WHERE codigo IN ('ALM-2','ALM-3','ALM-4'));
  UPDATE factura_items SET "almacenId"  = destino WHERE "almacenId"  IN (SELECT id FROM locations WHERE codigo IN ('ALM-2','ALM-3','ALM-4'));

  -- ----------------------------------------------------------
  -- 2c. Por fin se pueden borrar las ubicaciones.
  -- ----------------------------------------------------------
  DELETE FROM locations WHERE codigo IN ('ALM-2','ALM-3','ALM-4');
  GET DIAGNOSTICS filas = ROW_COUNT;
  RAISE NOTICE 'locations: % ubicaciones eliminadas', filas;

EXCEPTION WHEN OTHERS THEN
  -- Cualquier error revierte todo: no queda stock duplicado ni FK rota.
  RAISE;
END $$;

COMMIT;


-- ============================================================
-- PASO 3 — Verificación posterior
-- ============================================================

-- 3a. Deben quedar 4 ubicaciones: 1 almacén + 3 tiendas.
SELECT l.tipo, COUNT(*) AS cantidad
FROM locations l
GROUP BY l.tipo
ORDER BY l.tipo;

-- 3b. El total de unidades por producto debe ser el mismo que antes de la
--     migración (el stock no se pierde, solo se concentra en ALM-1).
SELECT SUM(cantidad) AS unidades_totales_en_sistema FROM inventory;

-- 3c. No debe quedar ninguna fila de otra tabla apuntando a una ubicación
--     inexistente (si esto devuelve filas, hay una FK descolgada).
SELECT 'inventory'   AS tabla, COUNT(*) AS huerfanos FROM inventory   i WHERE NOT EXISTS (SELECT 1 FROM locations l WHERE l.id = i."locationId")
UNION ALL SELECT 'sales',           COUNT(*) FROM sales           s WHERE NOT EXISTS (SELECT 1 FROM locations l WHERE l.id = s."locationId")
UNION ALL SELECT 'movimientos',     COUNT(*) FROM movimientos     m WHERE NOT EXISTS (SELECT 1 FROM locations l WHERE l.id IN (m."origenId", m."destinoId"))
UNION ALL SELECT 'devoluciones',    COUNT(*) FROM devoluciones    d WHERE NOT EXISTS (SELECT 1 FROM locations l WHERE l.id = d."locationId")
UNION ALL SELECT 'solicitudes',     COUNT(*) FROM solicitudes     s WHERE NOT EXISTS (SELECT 1 FROM locations l WHERE l.id IN (s."tiendaId", s."origenId"))
UNION ALL SELECT 'factura_items',   COUNT(*) FROM factura_items   f WHERE NOT EXISTS (SELECT 1 FROM locations l WHERE l.id = f."almacenId")
ORDER BY tabla;
