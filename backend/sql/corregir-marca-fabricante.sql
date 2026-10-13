-- Corrección: `fabricante` y `marca` venían invertidos en los productos del seed.
--
-- Por qué existe: el seed sembraba la marca del VEHÍCULO (Toyota, Nissan) en
-- `fabricante` y el fabricante de la PIEZA (Tyc, Depo) en `marca`, al revés de
-- como lo esperan filtros, ficha, reportes y la app móvil. Se veía como:
--   - Ficha: "Fabricante: Toyota (Taiwán)"      (Toyota no es taiwanés)
--   - Reporte "Ventas por Marca de Vehículo: Tyc, Depo, Denso"
--   - Listados: "Tyc Hilux" en vez de "Toyota Hilux"
--
-- ⚠️ NO usar un swap sin condición:
--     UPDATE products SET fabricante = marca, marca = fabricante;
--   Eso rompería los productos creados desde el formulario web, que ya están
--   bien (`fabricante` = pieza, `marca` = vehículo). El predicado de abajo solo
--   atrapa los que están invertidos: fabricante con valor de VEHÍCULO y marca
--   con valor de PIEZA. Un producto correcto no puede cumplir las dos.
--
-- Idempotente: después de correrlo el predicado deja de cumplirse, así que una
-- segunda ejecución no toca nada. Es reversible (el mismo script con las listas
-- intercambiadas devuelve el estado anterior).
--
-- Cómo usarlo: PASO 1 (solo lectura) → revisar el reporte → PASO 2 (ejecutar).

-- ============================================================
-- PASO 1 — Reporte previo (solo lectura, no modifica nada)
-- ============================================================

-- 1a. Cuántos productos están invertidos y cuántos ya están bien.
SELECT
  CASE
    WHEN fabricante IN ('Toyota','Nissan','Renault','Jeep','Hyundai','Dodge','Mitsubishi','Mazda')
     AND marca IN ('Tyc','Depo','Denso','Koyo','Kage','Sankei','Valeo','Capris','Protzalee','Finar')
      THEN 'INVERTIDO (se va a corregir)'
    ELSE 'OK (no se toca)'
  END AS estado,
  COUNT(*) AS productos
FROM products
GROUP BY 1
ORDER BY 1;

-- 1b. Detalle de los que se van a corregir.
SELECT id, "codigoFabrica", producto, fabricante AS antes_fabricante,
       marca AS antes_marca, modelo, "empresaFabricante"
FROM products
WHERE fabricante IN ('Toyota','Nissan','Renault','Jeep','Hyundai','Dodge','Mitsubishi','Mazda')
  AND marca IN ('Tyc','Depo','Denso','Koyo','Kage','Sankei','Valeo','Capris','Protzalee','Finar')
ORDER BY id;

-- 1c. Verificación de que `empresaFabricante` queda coherente con el nuevo
--     `fabricante`. Después del swap debe leer "Fabricante: Tyc (Taiwán)".
SELECT fabricante, "empresaFabricante", COUNT(*) AS productos
FROM products
GROUP BY 1, 2
ORDER BY 1, 2;


-- ============================================================
-- PASO 2 — Corrección (swap condicionado, en una transacción)
-- ============================================================

BEGIN;

DO $$
DECLARE
  afectados integer;
BEGIN
  -- Solo los invertidos: `fabricante` con valor de vehículo y `marca` con valor
  -- de pieza. En PostgreSQL las expresiones de la derecha usan SIEMPRE los
  -- valores viejos de la fila, así que el intercambio es correcto en un solo
  -- UPDATE y no hace falta columna auxiliar.
  UPDATE products
  SET fabricante = marca,
      marca      = fabricante
  WHERE fabricante IN ('Toyota','Nissan','Renault','Jeep','Hyundai','Dodge','Mitsubishi','Mazda')
    AND marca     IN ('Tyc','Depo','Denso','Koyo','Kage','Sankei','Valeo','Capris','Protzalee','Finar');

  GET DIAGNOSTICS afectados = ROW_COUNT;
  RAISE NOTICE 'products: % productos corregidos', afectados;
END $$;

COMMIT;


-- ============================================================
-- PASO 3 — Verificación posterior
-- ============================================================

-- 3a. Debe quedar 0 en "INVERTIDO": no debe sobrar ningún producto al revés.
SELECT
  CASE
    WHEN fabricante IN ('Toyota','Nissan','Renault','Jeep','Hyundai','Dodge','Mitsubishi','Mazda')
     AND marca IN ('Tyc','Depo','Denso','Koyo','Kage','Sankei','Valeo','Capris','Protzalee','Finar')
      THEN 'INVERTIDO (no debería quedar ninguno)'
    ELSE 'OK'
  END AS estado,
  COUNT(*) AS productos
FROM products
GROUP BY 1
ORDER BY 1;

-- 3b. Reparto final: `marca` debe tener las 8 marcas de vehículo, `fabricante`
--     los 10 fabricantes de pieza.
SELECT 'marca (vehículo)' AS campo, marca AS valor, COUNT(*) AS productos
FROM products GROUP BY marca
UNION ALL
SELECT 'fabricante (pieza)', fabricante, COUNT(*)
FROM products GROUP BY fabricante
ORDER BY 1, 3 DESC;

-- 3c. Muestra de cómo queda la ficha: "Fabricante: Tyc (Taiwán)".
SELECT producto, fabricante, "empresaFabricante", marca, modelo
FROM products
ORDER BY id
LIMIT 10;
