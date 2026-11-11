# Errores, diagnósticos y soluciones

## Análisis Predictivo de Viabilidad de Repuesto (IA)

Bitácora técnica de los problemas encontrados al construir y probar el módulo
**Análisis Predictivo de Viabilidad de Repuesto**, y de las decisiones que se
tomaron para llegar al estado actual. Fecha de corte: **10/11/2026**, rama
`feature/H4`, commits `0a8fa7e` (primer avance) y `3abfe14` (mejora ante datos
incoherentes).

Documentos relacionados:

- [API del endpoint `POST /api/products/predict-success`](api.md)
- [Configuración del modelo predictivo](configuracion-modelo-prediccion.md)
- [Entrenamiento y exportación ONNX](../notebooks/README.md)
- [Variables de entorno](entornos.md)
- [Despliegue](despliegue.md)

---

## 1. Qué hace la función

El formulario **Análisis Predictivo de Viabilidad de Repuesto (IA)** recibe los
datos de un repuesto que se quiere importar y devuelve una estimación comercial:

1. El usuario completa repuesto, marca, modelo, costo, precio de mostrador,
   precio mayorista, categoría, tipo de desgaste y segmento del parque.
2. El backend valida primero la **coherencia semántica y financiera**.
3. Si los datos son incoherentes, responde `400` y **no ejecuta el modelo**.
4. Si son válidos, prepara las siete entradas del Random Forest exportado a ONNX.
5. Ejecuta la inferencia y obtiene la probabilidad de alta rotación.
6. Combina esa probabilidad con reglas de margen y saturación del catálogo para
   calcular `scoreExito`, lote sugerido, días de rotación y viabilidad.
7. Devuelve `200/201` con resultados numéricos, guardrails y productos similares.

La regla principal que se adoptó es: **nunca inventar una predicción cuando la
entrada no es confiable**. Un dato inválido debe producir un mensaje claro, no un
porcentaje artificial.

---

## 2. Resumen de errores y soluciones

| # | Error o síntoma | Causa | Solución aplicada |
| :--- | :--- | :--- | :--- |
| 1 | El backend local no arrancaba correctamente | El puerto `3000` estaba ocupado por Grafana | Backend en `PORT=3001`; `frontend/.env.local` apunta a `http://localhost:3001/api` |
| 2 | Se intentaba conectar la base como si fuera Supabase | Confusión entre base de datos y Storage | TypeORM usa solo `DB_*`; PostgreSQL local `PrograA_H4`; Supabase queda para los buckets `products` y `faces` |
| 3 | El login de prueba no devolvía el campo esperado | El endpoint responde `token`, no `access_token` | Se ajustó la prueba y el consumo del token |
| 4 | `predict-success` no podía ejecutar el modelo | Faltaba `modelo_exito_autopartes.onnx` | El endpoint responde `503` sin inventar resultados; el artefacto se provisionó localmente y se documentó para Render |
| 5 | Primeros productos generaban predicciones raras | Metadatos legacy `General` / `preventivo` / `Medio` sin clasificación real | `normalizarMetadataCatalogo` detecta la tupla intacta e infiere categoría, desgaste y segmento sin modificar la BD |
| 6 | Categorías nuevas no reconocidas por el modelo | El entrenamiento solo cubrió 4 categorías | `OneHotEncoder(handle_unknown='ignore')`, advertencia de dominio y viabilidad de riesgo; 14 categorías canónicas en el negocio |
| 7 | “Pizza” con categoría “Iluminación” devolvía un porcentaje | El modelo solo ve números y categorías; no entiende semántica | Lista de palabras no automotrices + validación de categoría/desgaste; respuesta `400` sin resultados numéricos |
| 8 | Precios absurdos generaban análisis | No había límite de importes | Límite de Bs. `1.000.000` por importe; fuera de rango se rechaza con `400` |
| 9 | Precio de venta menor o igual al costo | No se validaba la relación financiera | Bloqueo financiero, score y lote en cero; si fue una edición, `400` |
| 10 | El modal mostraba `null%` o porcentajes de datos inválidos | Se intentaba renderizar un resultado que no debía existir | El `400` no trae resultado; el modal muestra el mensaje y conserva el formulario, sin KPIs ni porcentajes |
| 11 | El contrato ONNX no siempre traía probabilidades | Exportación con `output_label` solamente o con ZipMap | Se exige `probabilities`; se valida orden, rango y suma; si falla, `503` con mensaje explícito |
| 12 | Dos pruebas del cargador fallaron al aparecer el ONNX real | El cargador encontraba `backend/models` antes de los fixtures temporales | Se priorizaron las rutas relativas al `cwd` y se dejaron las rutas de `__dirname` como respaldo |
| 13 | El CRUD podía guardar metadatos incoherentes | No reutilizaba la validación semántica | `ProductsService` valida categoría/desgaste explícitos, infiere campos y valida precios |
| 14 | Las métricas del modelo podían leerse como una garantía | Muestra de 37 registros y holdout pequeño | Se documentaron accuracy 75%, recall de alta rotación 33% y el carácter heurístico del score |

---

## 3. Detalle de los problemas

### 3.1 Puerto 3000 ocupado por Grafana

**Síntoma.** El backend local no quedaba accesible en `http://localhost:3000` y
el frontend no podía iniciar sesión contra la API local.

**Causa.** El puerto `3000` estaba siendo usado por Grafana. No era un error de
NestJS ni de TypeORM.

**Solución.**

- `backend/.env`: `PORT=3001`.
- `frontend/.env.local`: `VITE_API_URL=http://localhost:3001/api`.
- `frontend/.env.production` se mantuvo apuntando al backend de Render.

**Verificación.** `POST /api/auth/login` contra el backend local respondió `200`.
El frontend dejó de mezclar la API local con la de producción.

---

### 3.2 La base de datos no es Supabase

**Síntoma.** Se intentaba cambiar la conexión como si la base de datos estuviera
en Supabase, pero TypeORM no la encontraba o se confundían las credenciales.

**Causa.** Supabase se usa en este proyecto **solo para Storage**:

- bucket `products` para imágenes de productos;
- bucket `faces` para rostros.

La base de datos es PostgreSQL y TypeORM se conecta exclusivamente con
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` y `DB_SSL`.

**Solución.**

- Base local: `PrograA_H4` en `localhost:5432`.
- `DB_SSL=false` para PostgreSQL local.
- Supabase sigue configurado con `SUPABASE_URL`, `SUPABASE_KEY`,
  `SUPABASE_BUCKET` y `FACE_BUCKET` para Storage.
- La aclaración quedó en [entornos.md](entornos.md).

**Verificación.** La base local tiene el esquema y los datos sembrados; el
script `npm run demand:check` encontró **37 productos activos** para probar la
inferencia.

---

### 3.3 Login: el campo es `token`

**Síntoma.** Al probar el inicio de sesión se buscaba `access_token` y no se
encontraba la sesión.

**Causa.** `POST /api/auth/login` devuelve `{ token, usuario }`.

**Solución.** Se usó el campo correcto. Usuarios de prueba:

| Usuario | Contraseña | Rol |
| :--- | :--- | :--- |
| `admin@importadoras.com` | `admin123` | admin |
| `inventario@importadoras.com` | `inventario123` | inventario |
| `tienda1@importadoras.com` | `venta123` | tienda |

**Verificación.** Login local con `admin@importadoras.com` / `admin123`:
`200 OK`.

---

### 3.4 Modelo ONNX ausente y respuesta `503`

**Síntoma.** El endpoint `POST /api/products/predict-success` no devolvía una
predicción porque no encontraba el archivo del modelo.

**Causa.** El artefacto `modelo_exito_autopartes.onnx` no estaba provisionado
en el entorno local. Los modelos y metadatos están fuera de Git.

**Solución.**

- No se genera una predicción sustituta ni se inventan números.
- Si el modelo no está disponible, el backend responde `503`:
  “El modelo de análisis predictivo no está disponible en este servidor. Los
  datos ingresados son válidos; solicite al administrador que configure el
  modelo para obtener el análisis.”
- El cargador busca el ONNX en `backend/models/` y en las rutas históricas
  (`src/models`, `notebooks` y la carpeta junto al código compilado).
- El JSON de metadatos se lee con el mismo nombre o como `modelo_metadata.json`.

**Estado actual.** Los artefactos ya están disponibles localmente:

| Archivo | Tamaño |
| :--- | ---: |
| `backend/models/modelo_exito_autopartes.onnx` | 112.602 bytes |
| `backend/models/modelo_exito_autopartes.json` | 2.635 bytes |

Al iniciar, el log confirma:
`Modelo ONNX cargado exitosamente desde: ...\backend\models\modelo_exito_autopartes.onnx`.

**Pendiente de despliegue.** En Render hay que provisionar ambos archivos. El
descargador de ArcFace no instala este modelo.

---

### 3.5 Metadatos legacy: `General` / `preventivo` / `Medio`

**Síntoma.** Los primeros productos del catálogo recibían siempre la misma tupla
por defecto. El modelo los trataba como una categoría válida, pero sin una
clasificación real, y las predicciones quedaban distorsionadas.

**Causa.** Los registros iniciales se sembraron con:

```text
categoriaRepuesto = General
tipoDesgaste      = preventivo
segmentoParque    = Medio
```

Esa tupla no era una clasificación; era un valor por defecto.

**Solución.** `normalizarMetadataCatalogo` reconoce exactamente esa tupla y,
solo si sigue intacta, infiere los valores a partir del nombre del producto y
del modelo del vehículo. No sobrescribe la base de datos. Si el usuario editó
alguno de los campos, la tupla deja de considerarse legacy y se valida como una
edición real.

Además, si se envía `productId`, el backend vuelve a leer el producto actual
para comprobar el origen de los valores. El ID no exime de validar una edición.

**Resultado.** Un `General` real puede seguir usándose, pero se advierte que la
precisión es menor. La metadata inferida se usa solo para el análisis.

---

### 3.6 Categorías fuera del dominio de entrenamiento

**Síntoma.** El negocio maneja 14 categorías, pero el dataset de entrenamiento
solo contiene 4:

- `Iluminación`
- `Refrigeración`
- `Cerrajería`
- `Carrocería`

Al probar categorías como `Frenos`, `Suspensión` o `Motor`, el modelo no tenía
un indicador OneHot entrenado para ellas.

**Causa.** El `OneHotEncoder` se ajustó con las categorías del dataset. Una
categoría desconocida no puede aportar información real al bosque.

**Solución.**

- El encoder usa `handle_unknown='ignore'`: una categoría nueva genera ceros en
  su bloque y no rompe la inferencia.
- El backend lee los dominios del metadata (`categorias_validas`,
  `tipos_desgaste`, `segmentos_parque`) y, si no están, usa los valores por
  defecto.
- Si el valor usado no pertenece al entrenamiento, agrega una advertencia:
  “no fue parte del entrenamiento del modelo; la rotación estimada es menos
  precisa”.
- Esa advertencia fuerza `viabilidad: riesgo`, sin convertirla en un `400`.

**Decisión.** Una categoría nueva es un dato válido del negocio, pero el modelo
no puede estimarla con la misma confianza. Se informa la limitación en lugar de
rechazar el análisis.

---

### 3.7 Datos ridículos: “Pizza”, nombres no automotrices y precios absurdos

**Síntoma.** Al escribir `Pizza` con categoría `Iluminación`, o al ingresar un
precio de varios millones, el formulario devolvía un score. El usuario veía un
porcentaje aunque los datos no correspondieran a un repuesto.

**Causa.** El Random Forest solo consume números y categorías. No sabe que
“Pizza” no es una autoparte. El `OneHotEncoder` podía asignar ceros y aun así
producir una probabilidad. No existía una barrera semántica ni un límite de
importes.

**Solución.** Se agregó una validación antes de cargar o ejecutar ONNX:

- Lista de palabras no automotrices (`pizza`, `hamburguesa`, `celular`,
  `computadora`, `mascota`, `prueba`, `asdf`, etc.) aplicada a producto, marca y
  modelo.
- Detección de categoría incoherente: por ejemplo, `Farol` declarado como
  `Cerrajería` cuando corresponde a `Iluminación`.
- Detección de tipo de desgaste incoherente para la categoría.
- Validación de año o rango de años (`1886` hasta el año actual + 1).
- Límite de importes: **Bs. 1.000.000** por costo o precio.
- Validación de precios positivos, precio de venta mayor al costo y mayorista
  menor o igual al de mostrador.

Cuando hay errores, el servicio lanza `BadRequestException` con:

```json
{
  "message": "Datos incoherentes: revise la información del repuesto y vuelva a introducir los datos para realizar el análisis.",
  "errores": [
    "Datos incoherentes: «Pizza» no parece una autoparte. Vuelva a introducir los datos del repuesto."
  ]
}
```

La respuesta `400` **no contiene** `scoreExito`, `probabilidadExito`,
`metricasProyectadas`, `loteSugeridoCompra` ni recomendaciones numéricas. El
modelo no se ejecuta para datos incoherentes.

**Frontend.** El modal muestra el mensaje del backend y deja el formulario
disponible para corregir. No muestra banner de score, KPIs, porcentajes ni
productos similares, porque no existe un resultado válido.

**Verificación.** `npm run demand:check` recorre los 37 productos activos y
prueba dos ediciones incoherentes por producto (`precio1: -1` y
`producto: "Pizza"`). Resultado: **74 rechazos**, sin métricas en la respuesta.

---

### 3.8 Incoherencias financieras

**Síntoma.** Se podía analizar un repuesto con precio de venta menor al costo, o
con un mayorista más caro que el de mostrador.

**Causa.** La primera versión del servicio no separaba la validación financiera
de la inferencia.

**Solución.** `validarFinanzas` devuelve `bloqueado: true` y errores cuando:

- costo o precio no son positivos;
- `precio1 <= costo`;
- `precioMayor > precio1`;
- `precioMayor <= costo`;
- algún importe supera Bs. 1.000.000.

Reglas comerciales aplicadas:

| Situación | Resultado |
| :--- | :--- |
| Margen `<= 0` | Bloqueado, score `0`, lote `0` |
| Margen `> 0` y `< 15%` | Advertencia, score máximo `45`, lote máximo `3` |
| Margen `>= 15%` | Sin bloqueo por margen; el score depende de rotación y saturación |
| Mayorista `>` mostrador | Error de validación |
| Precio de venta `<=` costo | Error de validación / bloqueo |

**Excepción importante.** Si se analiza un producto del catálogo con sus precios
originales, positivos e intactos, el análisis puede devolver inviabilidad con
score `0` en lugar de `400`. Así se pueden auditar productos históricos sin
falsificar la entrada. Si el usuario edita los precios y genera una
incoherencia, se rechaza la solicitud.

---

### 3.9 El modal mostraba porcentajes que no correspondían

**Síntoma.** Con datos inválidos, la interfaz llegaba a mostrar `null%` o un
`0%` engañoso, e incluso el margen en la caja de guardrails.

**Causa.** El frontend intentaba renderizar una respuesta que el backend no
debería haber producido.

**Solución.**

- El backend rechaza los datos incoherentes con `400` y no devuelve un objeto de
  predicción.
- `demandService.predictSuccess` propaga el `ApiError` con el `message` del
  backend.
- `PredictSuccessModal` muestra ese mensaje en el formulario y mantiene
  `result = null`; por lo tanto no renderiza score, KPIs, margen ni porcentajes.
- Cualquier cambio en el formulario limpia el resultado anterior para evitar
  que un análisis viejo quede visible con datos nuevos.

**Distinción clave.**

| Respuesta | Significado | Qué muestra la UI |
| :--- | :--- | :--- |
| `400` | Datos incoherentes o inválidos | Mensaje “vuelva a introducir los datos”, sin porcentajes |
| `503` | Datos válidos, pero falta el modelo | Mensaje de modelo no disponible; no se inventa un score |
| `200/201` | Análisis válido | Score, probabilidad, margen, lote y viabilidad |

Un `0%` solo es legítimo cuando el análisis sí se ejecutó y el resultado fue
comercialmente inviable.

---

### 3.10 Contrato ONNX incompleto

**Síntoma.** Algunas exportaciones solo traían `output_label` o devolvían las
probabilidades en un formato que el backend no podía interpretar.

**Causa.** La exportación no siempre incluía `probabilities` con el orden de
clases esperado.

**Solución.**

- La exportación usa `zipmap=False` y `target_opset=12`.
- El backend acepta `probabilities` y, por compatibilidad,
  `output_probability`.
- Lee `class_order` del JSON o usa `[0, 1, 2]`.
- Valida que la clase sea `0`, `1` o `2`; que las probabilidades sean finitas,
  estén entre 0 y 1 y sumen 1 con tolerancia `0.001`.
- Si el contrato no se cumple, responde `503` con un mensaje para revisar la
  exportación.
- `probabilidadExito` es la probabilidad de la clase `2` (alta rotación), no una
  probabilidad calibrada de ganar dinero.

**Verificación.** `npm run demand:check` ejecutó inferencia real sobre 37
productos:

```json
{
  "products": 37,
  "realOnnxPredictions": 37,
  "minProbability": 0.0066,
  "maxProbability": 0.948,
  "rejectedEdits": 74
}
```

---

### 3.11 Pruebas del cargador de modelo

**Síntoma.** Después de provisionar el ONNX real, dos pruebas empezaron a fallar:

```text
Expected: "...\Temp\prediction-loader-...\src\models\modelo_exito_autopartes.onnx"
Received: "...\backend\models\modelo_exito_autopartes.onnx"
```

**Causa.** El cargador revisaba una ruta relativa a `__dirname`
(`backend/models`) antes de las rutas temporales creadas por el test. Al existir
el modelo real, tapaba el fixture.

**Solución.** Se reordenaron los candidatos:

1. rutas relativas al `cwd` (`models`, `backend/models`, `src/models`,
   `backend/src/models`, `notebooks`);
2. rutas relativas a `__dirname` como respaldo.

Esto mantiene la compatibilidad con `start:prod` y permite que los tests usen
sus propios archivos temporales.

**Verificación.** Backend: **8 suites, 100 tests, todos pasan**.

---

### 3.12 Validación en el CRUD de productos

**Síntoma.** El formulario de alta/edición de productos no aplicaba las mismas
reglas que el análisis predictivo.

**Causa.** La validación semántica se había creado solo para `predict-success`.

**Solución.** `ProductsService` reutiliza `validarSemantica` y:

- rechaza categorías o desgastes explícitamente incoherentes;
- infiere categoría, desgaste y segmento cuando faltan;
- valida que el precio mayorista no supere al de mostrador;
- valida costos y precios positivos;
- guarda la metadata canónica resultante.

El `ValidationPipe` global de NestJS complementa la validación del DTO de
predicción con `class-validator`.

---

### 3.13 Métricas que podían interpretarse como garantía

**Síntoma.** El modelo reporta un accuracy de 75%, pero eso no significa que
acierte el 75% de las compras futuras.

**Causa.** El dataset local tiene 37 registros y el holdout es muy pequeño. En
particular, el recall de la clase de alta rotación es 33% (1 de 3).

**Solución.**

- El resultado se presenta como **estimación**, no como garantía.
- `probabilidadExito` se documenta como probabilidad del modelo, sin calibración
  adicional.
- `scoreExito` es un índice comercial con reglas de negocio, no una salida
  directa del Random Forest.
- Las categorías fuera del entrenamiento y los márgenes críticos generan
  advertencias y viabilidad de riesgo.
- Las métricas y limitaciones quedaron en
  [configuracion-modelo-prediccion.md](configuracion-modelo-prediccion.md).

---

## 4. Reglas finales del análisis

### 4.1 Validación semántica

Se revisa antes de la inferencia:

- nombre no automotriz reconocido;
- categoría declarada contra categoría inferida;
- tipo de desgaste contra los tipos típicos de la categoría;
- segmento de parque válido;
- año o rango de años coherente.

Cualquier incoherencia semántica produce `400`.

### 4.2 Validación financiera

- costo y precios positivos;
- importes menores o iguales a Bs. 1.000.000;
- precio de mostrador mayor al costo;
- precio mayorista menor o igual al de mostrador;
- precio mayorista mayor al costo.

### 4.3 Score comercial

```text
scoreSaturacion = max(0, 100 - cantidadSimilares × 20)
scoreExito = 0.40 × scoreRotacion
           + 0.40 × saludMargen
           + 0.20 × scoreSaturacion
```

Ajustes:

- Si está bloqueado: `scoreExito = 0` y lote `0`.
- Si el margen es menor al 15%: `scoreExito <= 45` y lote `<= 3`.
- Si el catálogo está saturado, el lote se reduce.
- Si hay advertencias semánticas o de dominio, la viabilidad es `riesgo`.

### 4.4 Qué no devuelve un `400`

Un rechazo por datos incoherentes no devuelve:

- `scoreExito`;
- `probabilidadExito`;
- `diasRotacionEstimados`;
- `loteSugeridoCompra`;
- `metricasProyectadas`;
- productos similares.

Solo devuelve `message` y `errores` para que el usuario corrija la entrada.

---

## 5. Casos de prueba recomendados

Autenticación previa:

```http
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "admin@importadoras.com",
  "password": "admin123"
}
```

Usar el `token` devuelto como `Authorization: Bearer <token>`.

### 5.1 Caso válido de alto potencial

```json
{
  "producto": "Farol Delantero LED",
  "marca": "Toyota",
  "modelo": "Hilux",
  "costo": 280,
  "precio1": 430,
  "precioMayor": 360,
  "categoriaRepuesto": "Iluminación",
  "tipoDesgaste": "desgaste_medio",
  "segmentoParque": "Alto"
}
```

Esperado: `200/201` con score, probabilidad, lote y viabilidad. El margen sobre
costo es 53,6%, por lo que la salud de margen es alta.

### 5.2 Caso válido con margen crítico

```json
{
  "producto": "Espejo Lateral",
  "marca": "Toyota",
  "modelo": "Hilux",
  "costo": 100,
  "precio1": 112,
  "precioMayor": 105,
  "categoriaRepuesto": "Carrocería",
  "tipoDesgaste": "colision",
  "segmentoParque": "Alto"
}
```

Esperado: `200/201`, advertencia de margen insuficiente, score máximo 45 y lote
máximo 3. No es un `400`, porque los datos son coherentes aunque el negocio sea
riesgoso.

### 5.3 Caso incoherente: nombre no automotriz

```json
{
  "producto": "Pizza",
  "marca": "Toyota",
  "modelo": "Hilux",
  "costo": 100,
  "precio1": 150,
  "precioMayor": 130,
  "categoriaRepuesto": "Iluminación",
  "tipoDesgaste": "desgaste_medio",
  "segmentoParque": "Alto"
}
```

Esperado: `400` con el mensaje de datos incoherentes y la lista de errores. Sin
porcentajes ni métricas.

### 5.4 Caso incoherente: precio absurdo

```json
{
  "producto": "Farol Delantero LED",
  "marca": "Toyota",
  "modelo": "Hilux",
  "costo": 9999999,
  "precio1": 12000000,
  "categoriaRepuesto": "Iluminación",
  "tipoDesgaste": "desgaste_medio",
  "segmentoParque": "Alto"
}
```

Esperado: `400` por importes fuera del rango admitido.

### 5.5 Caso financiero inviable

```json
{
  "producto": "Farol Delantero LED",
  "marca": "Toyota",
  "modelo": "Hilux",
  "costo": 100,
  "precio1": 90,
  "categoriaRepuesto": "Iluminación",
  "tipoDesgaste": "desgaste_medio",
  "segmentoParque": "Alto"
}
```

Esperado: `400` si es una edición incoherente; si se trata de un producto del
catálogo con precios originales intactos, puede devolver inviabilidad con score
`0` y lote `0`.

---

## 6. Verificación ejecutada

Desde `backend/`:

| Comando | Resultado |
| :--- | :--- |
| `npm test -- --runInBand` | 8 suites, **100 tests pasan** |
| `npm run lint` | 0 errores, 8 warnings preexistentes en otros módulos |
| `npm run build` | Compila correctamente |
| `npm run demand:check` | 37 productos, 37 inferencias reales, 74 rechazos de ediciones incoherentes |

Desde `frontend/`:

| Comando | Resultado |
| :--- | :--- |
| `npm run lint` | Sin errores |
| `npm run build` | Build correcto; advertencia de chunk mayor a 500 kB |

Verificación local adicional:

- login `admin@importadoras.com` / `admin123`: `200 OK`;
- modelo ONNX y JSON presentes en `backend/models/`;
- el servicio registra la carga del modelo al iniciar;
- los rechazos de datos incoherentes no contienen campos numéricos.

---

## 7. Pendientes y limitaciones

1. **Provisionar el modelo en Render.** `backend/models/` está fuera de Git.
   Tanto el ONNX como el JSON deben copiarse durante el despliegue.
2. **Ampliar el dataset.** 37 registros y 4 categorías son insuficientes para
   generalizar a las 14 categorías del negocio.
3. **Reentrenar con datos reales.** El accuracy de 75% y el recall de alta
   rotación de 33% no deben presentarse como garantía comercial.
4. **La lista de palabras no automotrices es finita.** Detecta casos conocidos,
   pero no garantiza reconocer cualquier descripción inventada.
5. **Las categorías fuera del entrenamiento siguen siendo válidas.** Producen
   advertencia y viabilidad de riesgo, no un `400`.
6. **La probabilidad no está calibrada.** El score comercial es una regla del
   backend y no una salida de regresión del modelo.
7. **El rechazo es intencional.** Si el usuario ve un `400` con “vuelva a
   introducir los datos”, no es un fallo del modelo: es el guardrail evitando
   un porcentaje sin sentido.

---

## 8. Lecciones aprendidas

- Validar antes de inferir es más barato y más honesto que explicar después un
  resultado absurdo.
- Un `400` por datos incoherentes y un `503` por modelo ausente son estados
  distintos; la UI y los tests deben distinguirlos.
- El modelo no reemplaza las reglas de negocio: margen, precios, categoría y
  dominio del entrenamiento se validan fuera del ONNX.
- Los metadatos legacy deben normalizarse sin destruir el dato original.
- Un modelo con pocos datos debe comunicar sus límites; el porcentaje no es una
  promesa.
- Los artefactos del modelo no se versionan, pero su contrato, ubicación y
  verificación deben estar documentados.
