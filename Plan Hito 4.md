# Plan Hito 4 — Modelo Predictivo de Éxito, Demanda y Rotación de Autopartes (Machine Learning + ONNX)

> **Versión:** 04/11/2026 → 14/11/2026 (9 días hábiles) · **Equipo:** Brian (backend + entrenamiento ML + Render), Raul (base de datos Supabase + móvil), Marco (frontend web Vercel).  
> **Sistema:** AutoParts Pro / AutoRepuestos PRO (Inventario y Ventas para 7 importadoras de autopartes).  
> **Hito previo:** Hito 3 cerrado (códigos de barras + asistencia facial con ArcFace vía `onnxruntime-node`).  
> **Propósito:** Implementar y desplegar un **Modelo de Machine Learning Supervisado (Random Forest exportado a ONNX)** para predecir el éxito comercial, rotación estimada y riesgo de nuevos productos antes de su importación, respaldado por explicabilidad de productos similares (k-NN).

---

## 0. Auditoría de Modos de Falla (Errores Críticos del Planteamiento)

Para no construir un modelo ciego que falle en producción o en la defensa académica, este plan resuelve de raíz los **12 errores críticos** detectados:

| # | Modo de Falla Crítico | Causa Raíz en Autopartes | Corrección Implementada en este Plan |
| :--- | :--- | :--- | :--- |
| **1** | **Demanda censurada por quiebre de stock** | Si un producto tuvo stock = 0 durante 20 días, sus ventas fueron bajas por desabastecimiento, no por falta de interés. | Se calcula la **Tasa de Demanda Diaria Activa**: $\text{Ventas} / \text{Días con Stock} > 0$. Nunca ventas brutas en el tiempo calendario. |
| **2** | **Fantasía de datos aleatorios en seed** | El ML sobre datos simulados con `Math.random()` solo reaprende ruido sin estructura. | Se construye un **Seed de Historial de Ventas con Lógica de Negocio Automotriz** (`seed-sales-history.ts`) basado en desgaste, parque automotor y temporalidad real. |
| **3** | **Omisión del Parque Automotor** | Un repuesto para Hilux vende 40x más que uno para Peugeot por la cantidad de vehículos en circulación en Bolivia. | Se incorpora el atributo de **Popularidad de Plataforma Vehicular** (`segmentoParque`: Alta / Media / Nicho) como feature de entrada al modelo. |
| **4** | **Frecuencia de Desgaste Mecánico** | Un filtro se cambia cada 5.000 km (preventivo); una cremallera cada 120.000 km (correctivo/colisión). | Se añade el atributo técnico `tipoDesgaste` (`preventivo` vs `correctivo`). |
| **5** | **Canibalización de Catálogo** | Traer un producto nuevo similar a uno existente no duplica la demanda; se reparten los mismos clientes. | Se incluye como feature el **Índice de Saturación Intracatálogo** (cuántos SKUs activos compiten por el mismo vehículo y función). |
| **6** | **Distorsión por Ventas Mayoristas** | Una compra aislada de 80 unidades de un taller infla artificialmente la rotación regular. | Descomposición en dos variables: **Frecuencia de Demanda Minorista** y **Volumen Mayorista Esporádico**. |
| **7** | **Dispersión entre las 7 Tiendas** | Una tienda diésel vende repuestos pesados; una urbana vende repuestos de autos compactos. | Las proyecciones se calculan **por sucursal (`locationId`)** y agregadas con pesos de inventario local. |
| **8** | **Régimen de Demanda Intermitente** | Las ventas de repuestos no son continuas (semanas con 0 ventas seguidas de saltos). | Modelado supervisado con variables agregadas mensuales y distribución Poisson / Gamma en lugar de regresores continuos tipo MSE. |
| **9** | **Devoluciones y Calidad Defectuosa** | Un producto que vendió 30 unidades pero tuvo 12 devoluciones por rotura de fábrica no es un éxito; es una pérdida. | Métrica de **Venta Neta Real**: $\text{Ventas} - \text{Devoluciones}$, penalizando el target de entrenamiento si la tasa de retorno supera el 5%. |
| **10** | **Obsolescencia por Edad del Auto** | Autos de 0–3 años van a concesionaria; autos de 4–10 años tienen pico aftermarket; autos de >15 años entran en desguace. | Feature de **Ventana de Vida Útil del Modelo**: antigüedad calculada entre el año del vehículo y el año actual. |
| **11** | **Métrica de Negocio Real (GMROI)** | Vender 100 arandelas ganando \$5 inmoviliza capital; vender 2 cajas de dirección ganando \$400 es mejor negocio. | La variable objetivo incorpora el **GMROI** (*Gross Margin Return on Investment*) combinado con la velocidad de agotamiento. |
| **12** | **Variación Cambiaria y Precios** | Comparar ventas en bolivianos de 2023 vs 2026 sin indexar distorsiona márgenes. | Normalización de márgenes porcentuales relativos: $(\text{precio} - \text{costo}) / \text{costo}$ en moneda homogénea. |

---

## 1. Alcance, Decisiones y Arquitectura

### 1.1 Decisiones Tomadas en este Plan

| Decisión | Elección | Justificación |
| :--- | :--- | :--- |
| **Paradigma de IA** | Machine Learning Supervisado Tabular | Problema estocástico de predicción comercial multivariable; no aplica visión ni LLMs. |
| **Algoritmo Base** | Random Forest Classifier + Regressor | No lineal, maneja variables mixtas sin sobreajuste severo, genera *Feature Importances* auditables. |
| **Formato de Exportación** | **ONNX (`.onnx`)** vía `skl2onnx` | Estándar de la industria, portable, ligero (< 3 MB). |
| **Motor de Inferencia** | **`onnxruntime-node` in-process** en NestJS | Ya instalado y probado en el Hito 3; 0 dependencias externas; < 15 ms por inferencia; cabe en Render Free. |
| **Explicabilidad (XAI)** | **k-NN Vectorial (K=3)** con Distancia de Gower | Muestra los 3 productos históricos reales que respaldan la predicción; elimina el efecto "caja negra". |
| **Población Histórica** | Script `seed-sales-history.ts` con 8–12 meses | Evita datos aleatorios absurdos; modela la realidad de tiendas de repuestos en Bolivia. |
| **Roles Autorizados** | `admin` (global), `inventario` y `tienda` (por sucursal) | `cliente` recibe `403 Forbidden` (no tiene acceso a costos, márgenes ni proyecciones de compras). |

### 1.2 Flujo General de la Arquitectura

```
[Supabase: Catálogo de Productos]
           │
           ▼
[Paso 0: Seed Histórico de Ventas (seed-sales-history.ts)]
   └─ Genera 8-12 meses de ventas con lógica automotriz (desgaste, parque, mayorista/minorista, devoluciones)
           │
           ▼
[Paso 1: Extracción del Dataset (extract-training-data.ts)]
   └─ Calcula Demanda Diaria no censurada, GMROI y genera `dataset_entrenamiento.csv`
           │
           ▼
[Paso 2: Entrenamiento Offline en Python / Colab (Brian)]
   ├─ Feature Engineering: Variables numéricas y categóricas (costo, margen, desgaste, parque)
   ├─ Entrenamiento: Random Forest Classifier con optimización GridSearchCV
   ├─ Evaluación: Matriz de confusión, Curva ROC-AUC, F1-Score, R2, Feature Importances
   └─ Exportación: Conversión a ONNX (backend/src/models/modelo_exito_autopartes.onnx)
           │
           ▼
[Paso 3: Despliegue e Inferencia en NestJS Backend (Render)]
   ├─ Inferencia in-process con `onnxruntime-node`
   ├─ Búsqueda vectorial de K productos similares para explicabilidad
   └─ Exposición de API REST: POST /api/products/predict-success
           │
     ┌─────┴──────────────┐
     ▼                    ▼
[Frontend Web (Marco)]   [App Móvil (Raul)]
Modal de evaluación      Tarjeta de rotación y
y proyección de compras  reabastecimiento en bodega
```

### 1.3 Estrategia de Datos y Seed de Historial de Ventas (`seed-sales-history.ts`)
Como la base de datos actual no tiene historial acumulado de transacciones, se implementa `backend/src/seed-sales-history.ts` ejecutado mediante `npm run seed:sales`. Este seeder sigue 5 reglas de negocio realistas:

1. **Horizonte Temporal:** Distribución uniforme de transacciones a lo largo de los últimos **270 a 360 días** para permitir split temporal honesto (Train: días 0–270, Test: días 271–360).
2. **Frecuencia por Naturaleza de Pieza:**
   - *Desgaste Preventivo* (Filtros, pastillas): 3 a 6 ventas semanales por tienda.
   - *Desgaste Medio* (Bujías, amortiguadores): 1 a 2 ventas semanales por tienda.
   - *Colisión / Correctivo* (Parachoques, radiadores): 1 venta cada 15–25 días (intermitente).
3. **Ponderación por Parque Automotor:**
   - Vehículos masivos en Bolivia (Toyota Hilux, Corolla, Suzuki Swift): factor $\times 3.5$ en volumen.
   - Vehículos de nicho (Renault, modelos antiguos): factor $\times 0.8$.
4. **Bimodalidad Mayorista vs Minorista:**
   - 85% de las órdenes: `tipo = 'menor'`, 1 a 2 unidades a precio de mostrador (`precio1`).
   - 15% de las órdenes: `tipo = 'mayor'`, 10 a 25 unidades a talleres con `precioMayor`.
5. **Trazabilidad de Devoluciones:**
   - 2% a 4% de las órdenes generan registro en `devoluciones` por defecto de fábrica.

---

## 2. Pipeline de Modelado Matemático y Entrenamiento

### 2.1 Preparación de Variables (Features $X$)
El vector de características para cada producto $i$ se compone de:

1. **Numéricas continuas:**
   * $x_1$: Costo unitario normalizado ($\text{MinMax}$ o $\text{StandardScaler}$).
   * $x_2$: Margen comercial relativo: $\frac{\text{precio1} - \text{costo}}{\text{costo}}$.
   * $x_3$: Ratio de precio mayorista: $\frac{\text{precioMayor}}{\text{precio1}}$.
   * $x_4$: Antigüedad del vehículo: $\text{año\_actual} - \text{año\_modelo}$.
   * $x_5$: Índice de saturación: Número de productos existentes en catálogo para el mismo modelo y función.
2. **Categóricas codificadas (One-Hot / Ordinal Encoding):**
   * $x_6$: `categoriaRepuesto` (Filtros, Frenos, Suspensión, Motor, etc.).
   * $x_7$: `tipoDesgaste` (0: Correctivo / Colisión, 1: Preventivo / Desgaste rápido).
   * $x_8$: `segmentoParque` (0: Nicho, 1: Medio, 2: Alta circulación en Bolivia).

### 2.2 Definición de la Variable Objetivo ($y$)
El target de entrenamiento se construye a partir de los datos históricos consolidados sin sesgo de stockout:

* **Tasa de Demanda Diaria Activa:**
  $$\lambda_{\text{ajustada}} = \frac{\sum \text{sale\_items.cantidad} - \sum \text{devoluciones.cantidad}}{\text{días\_con\_stock\_positivo}}$$
* **GMROI (Rentabilidad Real sobre Inversión):**
  $$\text{GMROI} = \left( \frac{(\text{precio1} - \text{costo}) \times \text{Ventas Netas}}{\text{Costo Promedio del Inventario}} \right) \times \left( \frac{365}{\text{Días de Rotación}} \right)$$

* **Target de Clasificación ($y_{\text{clase}}$):**
  * **Clase 2 (Éxito Alto):** $\lambda_{\text{ajustada}} \ge P_{70}$ y $\text{GMROI} \ge 1.5$.
  * **Clase 1 (Rotación Media):** $P_{30} \le \lambda_{\text{ajustada}} < P_{70}$.
  * **Clase 0 (Riesgo / Producto Lento):** $\lambda_{\text{ajustada}} < P_{30}$ o tasa de devoluciones $> 8\%$.

### 2.3 Algoritmos de Entrenamiento (Python / Scikit-Learn / ONNX)
1. **Clasificador:** **Random Forest Classifier** ($n\_estimators=100$, $max\_depth=5$, $class\_weight=\text{'balanced'}$).
2. **Exportación:** Mediante `skl2onnx` a `backend/src/models/modelo_exito_autopartes.onnx`.
3. **Métricas mínimas de aceptación para pase a producción:**
   * $F_1\text{-score macro} \ge 0.75$.
   * $\text{ROC-AUC} \ge 0.80$.
   * Reporte explícito de *Feature Importances* demostrando qué variables pesan más.

---

## 3. Contrato de API y Esquema de Base de Datos

### 3.1 Contrato de Rutas Backend (NestJS)

#### `POST /api/products/predict-success`
Evalúa la viabilidad de un repuesto antes de importarlo o comprarlo.
* **Roles permitidos:** `admin`, `inventario`, `tienda`.
* **Payload Request (`PredictSuccessDto`):**
  ```json
  {
    "producto": "Filtro de Aceite",
    "fabricante": "Bosch",
    "marca": "Toyota",
    "modelo": "Hilux",
    "anio": "2018-2022",
    "costo": 12.50,
    "precio1": 18.00,
    "precioMayor": 15.00,
    "categoriaRepuesto": "Filtros",
    "tipoDesgaste": "preventivo",
    "segmentoParque": "Alto",
    "locationId": 2
  }
  ```
* **Respuesta Exitosa (HTTP 200):**
  ```json
  {
    "scoreExito": 88.5,
    "categoria": "Alta Rotación",
    "probabilidadExito": 0.88,
    "diasRotacionEstimados": 24,
    "loteSugeridoCompra": 30,
    "metricasProyectadas": {
      "demandaMensualEstimada": 26,
      "gmroiProyectado": 2.15,
      "margenRelativo": 0.44
    },
    "alertas": {
      "saturacionCatalogo": false,
      "mensaje": "Excelente balance de margen y alta demanda en parque vehicular."
    },
    "productosSimilares": [
      {
        "id": 14,
        "producto": "Filtro de Aceite",
        "marca": "Toyota",
        "modelo": "Hilux",
        "fabricante": "Mann-Filter",
        "similitud": 0.94,
        "ventasMensualesNetas": 28,
        "gmroiReal": 2.30
      },
      {
        "id": 18,
        "producto": "Filtro de Aceite",
        "marca": "Toyota",
        "modelo": "Corolla",
        "fabricante": "Denso",
        "similitud": 0.87,
        "ventasMensualesNetas": 22,
        "gmroiReal": 1.95
      }
    ]
  }
  ```

#### `GET /api/products/:id/demand-summary`
Consulta el estado de rotación y salud comercial de un producto existente en catálogo.
* **Roles permitidos:** `admin`, `inventario`, `tienda`.
* **Parámetros query opcionales:** `?locationId=2`.
* **Respuesta Exitosa (HTTP 200):**
  ```json
  {
    "productId": 14,
    "producto": "Filtro de Aceite",
    "stockActual": 8,
    "stockMinimo": 5,
    "estadoRotacion": "Alta Rotación",
    "diasParaAgotamiento": 11,
    "alertaReabastecimiento": true,
    "demandaDiaria": 0.72,
    "ventasUltimos30Dias": 22,
    "devolucionesUltimos30Dias": 0
  }
  ```

---

### 3.2 Modificaciones en Base de Datos (Supabase)

Migración idempotente `backend/sql/hito4.sql`:

```sql
-- 1. Atributos para products
ALTER TABLE "products" 
ADD COLUMN IF NOT EXISTS "categoriaRepuesto" varchar DEFAULT 'General',
ADD COLUMN IF NOT EXISTS "tipoDesgaste" varchar DEFAULT 'preventivo', -- 'preventivo' | 'correctivo'
ADD COLUMN IF NOT EXISTS "segmentoParque" varchar DEFAULT 'Medio';     -- 'Alto' | 'Medio' | 'Nicho'

-- 2. Métricas consolidadas de demanda por sucursal
CREATE TABLE IF NOT EXISTS "product_demand_metrics" (
    "id" serial PRIMARY KEY,
    "productId" integer NOT NULL REFERENCES "products" ("id") ON DELETE CASCADE,
    "locationId" integer REFERENCES "locations" ("id") ON DELETE CASCADE,
    "unidadesVendidas" integer NOT NULL DEFAULT 0,
    "unidadesDevueltas" integer NOT NULL DEFAULT 0,
    "diasConStock" integer NOT NULL DEFAULT 1,
    "demandaDiaria" double precision NOT NULL DEFAULT 0,
    "rotacionDias" double precision NOT NULL DEFAULT 0,
    "gmroi" double precision NOT NULL DEFAULT 0,
    "updatedAt" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_product_location_demand" UNIQUE ("productId", "locationId")
);

CREATE INDEX IF NOT EXISTS "IX_demand_metrics_product" ON "product_demand_metrics" ("productId");
CREATE INDEX IF NOT EXISTS "IX_demand_metrics_location" ON "product_demand_metrics" ("locationId");
```

---

## 4. Cronograma Día a Día (9 Días Hábiles)

### Día 1 (04/11) — Migración Supabase, Seed Histórico de Ventas y Extracción de Dataset
* **Raul (R1):** Ejecutar migración `backend/sql/hito4.sql` en Supabase y verificar actualización de entidad TypeORM `Product`.
* **Brian (B1):** Construir y ejecutar `backend/src/seed-sales-history.ts` (`npm run seed:sales`) con 8 a 12 meses de ventas distribuidas. Programar `backend/scripts/extract_training_data.ts` y exportar `dataset_entrenamiento.csv`.
* **Marco (M1):** Diseñar vistas y componentes UI del evaluador de demanda en Web Admin (`frontend/src/pages/InventoryPage.tsx`).

### Día 2 (05/11) — Notebook de Entrenamiento y Feature Engineering (Python)
* **Brian (B2):** Crear notebook en Google Colab/Jupyter: cargar `dataset_entrenamiento.csv`, normalización, codificación de features y split temporal (train: 8 meses, test: 2 meses).
* **Raul (R2):** Preparar endpoint intermedio de sincronización de métricas en NestJS (`POST /api/products/refresh-metrics`).
* **Marco (M2):** Maquetar modal de evaluación en Web Admin con velocímetro de score y resumen de lote sugerido.

### Día 3 (06/11) — Entrenamiento, Validación y Exportación a ONNX
* **Brian (B3):** Entrenar Random Forest Classifier, optimizar con GridSearchCV, graficar matriz de confusión y curvas ROC. Exportar a `backend/src/models/modelo_exito_autopartes.onnx`.
* **Raul (R3):** Preparar tipos TypeScript y DTOs en `mobile/src/types/demand.ts`.
* **Marco (M3):** Integrar servicio de API web (`frontend/src/services/demand.service.ts`).

### Día 4 (07/11) — Inferencia ONNX in-process en NestJS
* **Brian (B4):** Crear `PredictionService` en NestJS usando `onnxruntime-node` para cargar el modelo `.onnx` y ejecutar `session.run()` en < 15 ms.
* **Raul (R4):** Construir componente `DemandForecastCard` en React Native (`mobile/src/screens/InventoryDetailScreen.tsx`).
* **Marco (M4):** Conectar modal interactivo "Analizar Viabilidad de Nuevo Repuesto" en Web Admin.

### Día 5 (08/11) — Motor de Explicabilidad k-NN y Endpoint Maestro
* **Brian (B5):** Añadir búsqueda de los 3 productos históricos más parecidos para justificar la predicción y exponer `POST /api/products/predict-success`.
* **Raul (R5):** Conectar pantalla de detalle de inventario móvil con la API de predicción.
* **Marco (M5):** Conectar modal web con la API y renderizar la justificación visual de los 3 productos similares.

### Día 6 (11/11) — Integración con Módulos de Compras y Solicitudes
* **Brian (B6):** Conectar sugerencia de lote con la creación de `solicitudes` y órdenes a `proveedores`.
* **Raul (R6):** Soporte móvil para consultar predicciones por sucursal (`locationId`).
* **Marco (M6):** Vista de alerta de productos con riesgo de estancamiento para el administrador.

### Día 7 (12/11) — Pruebas de Estrés y Casos Borde
* **Brian (B7):** Tests unitarios del servicio de inferencia ONNX y manejo de cold-start absoluto (categorías nunca antes vistas).
* **Raul (R7):** Verificación móvil en tablets (horizontal y vertical).
* **Marco (M7):** Validación de formularios web ante datos incompletos.

### Día 8 (13/11) — Despliegue en Render y Vercel
* **Brian (B8):** Build de producción de NestJS con el artefacto `.onnx` incluido en `dist/`, verificación de memoria en Render Free (< 400 MB).
* **Raul (R8):** Build Expo EAS para Android.
* **Marco (M8):** Build en Vercel y verificación E2E.

### Día 9 (14/11) — Documentación y Demostración
* **Brian (B9):** Actualizar `docs/api.md` con las nuevas rutas y `docs/arquitectura.md` con el diagrama del pipeline de ML.
* **Raul (R9):** Guía de pruebas rápidas en móvil para la defensa.
* **Marco (M9):** Preparación del guion de presentación para el tribunal docente.

---

## 5. Bloqueos Técnicos Conocidos y Medidas Preventivas

| # | Bloqueo Potencial | Dónde | Solución Preventiva |
| :--- | :--- | :--- | :--- |
| **1** | Error al cargar el modelo `.onnx` en NestJS | Backend | Reutilizar el patrón y dependencias de `onnxruntime-node` ya validadas en el Hito 3 con ArcFace. |
| **2** | Tamaño del archivo ONNX excede memoria en Render | Render Free (512 MB) | Árboles con `max_depth=5` para que el archivo pese < 3 MB; consumo de RAM despreciable. |
| **3** | Base de datos sin historial previo de ventas | Base de datos | **Ejecutar `seed-sales-history.ts` el Día 1** antes de cualquier extracción o modelado. |
| **4** | Desbalance de clases en dataset histórico | Entrenamiento | Usar `class_weight='balanced'` y evaluar con $F_1\text{-score macro}$, no con precisión simple. |
| **5** | Cliente consulta rutas de demanda indebidamente | Auth / RBAC | Decorador `@Roles('admin', 'inventario', 'tienda')` explícito en el controlador; `cliente` recibe `403`. |

---

## 6. Definition of Done (Criterios de Aceptación del Hito)

1. **Pipeline de Machine Learning Completo:** Existe un notebook reproducible con preparación de datos, entrenamiento supervisado, cálculo de métricas ($F_1 \ge 0.75, \text{ROC-AUC} \ge 0.80$) y exportación a ONNX.
2. **Inferencia en Producción:** El backend en NestJS carga `modelo_exito_autopartes.onnx` mediante `onnxruntime-node` y responde a `POST /api/products/predict-success` en menos de 50 ms.
3. **Explicabilidad:** La respuesta incluye la probabilidad de éxito, los días estimados de rotación y las 3 autopartes históricas reales que justifican la decisión.
4. **Plataformas Integradas:**
   * En **Web**, el administrador puede evaluar un producto borrador antes de comprarlo en `InventoryPage.tsx`.
   * En **Móvil**, el personal de inventario visualiza el nivel de rotación y salud del producto en `InventoryDetailScreen.tsx`.
5. **Calidad y Documentación:** Build y lint en verde en todos los subproyectos; rutas documentadas en `docs/api.md`.
