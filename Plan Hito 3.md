# Plan Hito 3 — Código de barras (identificación de producto) + Asistencia facial

> **Versión:** 29/09/2026 → 06/10/2026 (8 días) · **Equipo:** Brian (backend + deploy Render), Raul (móvil + base de datos Supabase), Marco (web admin).
> Este plan reemplaza al de 15 días. Comprime el alcance a 8 días reales resolviendo por adelantado las 3 decisiones que `Documento de Integración Hito 3.md` dejaba abiertas (modelo de IA, integración IA, despliegue demo).

---

## Objetivo

Dos flujos con visión asistida:

1. **Código de barras → producto.** Generar una etiqueta Code128 **a todos los productos** (`products.codigo`), escanearla con la cámara del celular y mostrar **un mensaje con los datos del producto que están en la base de datos** (nombre, precio, stock, imagen). **Debe quedar funcionando el 29/09.**
2. **Asistencia facial → quién es y a qué hora.** El personal se registra **una sola vez** con un formulario de **nombre completo que debe existir en la base de datos** + N fotos del rostro tomadas con la **misma cámara**. Después, cada día, la persona pasa frente a la cámara, el sistema **reconoce quién es** y **registra la hora de su llegada**.

> **Descartado** (alcance anterior): conteo de autopartes con YOLO (dataset + entrenamiento).

---

## Decisiones tomadas en este plan

| Decisión | Elección | Por qué |
| --- | --- | --- |
| Identidad del producto | Code128 generado por el equipo → `products.codigo` | Ya existe la columna + unicidad validada en el backend |
| Librería de código de barras | **`@bwip-js/node`** (backend) · **`@bwip-js/browser`** (web) · **`@bwip-js/react-native`** (móvil) | Mismo proyecto en las 3 plataformas, 0 dependencias nativas, tipos TS incluidos, `toBuffer()` → PNG en Node. Sustituye a `jsbarcode`/`bwip-js` v3 |
| Escaneo | `expo-camera` (`onBarcodeScanned` + multiscan). **Simbologías 1D: `code128`, `ean13`, `ean8`, `upc_a`, `upc_e`, `code39`, `code93`, `itf14`, `codabar`** | Sin dependencia nueva de render en móvil para leer. **No restringir a `code128`**: losEAN/UPC de cajas de proveedor y los Code39/ITF de etiquetas de repuesto se decodifican y aviso "no registrado"; si el filtro los excluye, el móvil no decodifica nada y el operador no ve nada, que en el POS se lee como "se escaneó" |
| **Contenido del código** | **`AP-<id>-<codigoFabrica>`** (ej. `AP-0001-DAI309005`), codificado **solo en las barras** | Garantiza unicidad (el `id` es único), trazabilidad contra la BD y es 100% ASCII, seguro para Code128 |
| **Formato de la etiqueta** | **Solo barras**: `includetext: false` — sin nombre ni texto impreso | El celular decodifica las barras; el texto estorba y ocupa espacio. El código se consulta igual en la web (columna "Código de barras") |
| **Dónde corre la IA facial** | **Dentro de NestJS con `onnxruntime-node`** — un solo servicio | Cierra la decisión pendiente del doc de integración. Un 2º servicio FastAPI no cabe en Render Free (512 MB, 750 h/mes) y agrega un 2º cold start |
| **Modelo de IA** | **ArcFace ONNX int8** (`onnxmodelzoo/arcfaceresnet100-11-int8`, **Apache-2.0**, ~63 MB, embedding 512-dim, entrada 112×112) | Apache-2.0 evita el problema legal de InsightFace ("solo investigación no comercial"); int8 cabe en la RAM de Render; 99.8% LFW. Backup si no entra: MobileFaceNet (~13 MB) |
| **Detector de rostros** | **Ninguno.** Encuadre guiado: la app recorta un cuadrado 112×112 con el rostro dentro de una guía oval | ArcFace ya espera un recorte alineado. Ahorra un modelo detector completo (Yunet/SCRFD) y días de trabajo |
| Autenticación entre servicios | **No aplica** (IA in-process). Desaparecen `FACE_SERVICE_URL` y `FACE_API_KEY` | El doc de integración los daba por supuestos; ya no hacen falta |
| Nombre del formulario | Debe coincidir con un `users` existente (`nombre` + `apellido`); 404 si no existe | El requerimiento dice "conforme a la base de datos": el registro facial **asocia** un rostro a un usuario ya creado, no crea usuarios |
| Tipo de marcaje | **Automático**: 1ª marcaje del día = `entrada`, 2ª = `salida`, con override manual | El objetivo es "a qué hora se registró su llegada" |
| Dónde corre la demo | Render (prod) + **plan B local WiFi** medido el día 6 | Render Free hace spin-down a los 15 min; el día 6 se mide el cold start y se decide |

---

## Qué YA está listo (no rehacer)

- **Entidades:** `Product.codigo` (`varchar unique nullable`) · `User` con `apellido`, `embedding` (jsonb), `facePhoto`, `faceRegisteredAt`, `activo` · entidad `Asistencia` completa con sus 2 índices.
- **Constantes:** `TIPOS_ASISTENCIA`, `METODOS_ASISTENCIA`, `UMBRAL_CONFIANZA_FACIAL = 0.55` (`backend/src/common/constants.ts`).
- **SQL:** `backend/sql/hito3.sql` (idempotente) y `backend/schema.sql` (14 tablas) ya incluyen todo.
- **Config:** `AttendanceModule` registrado en `app.module.ts`; autodetect de `DB_SSL`.
- **Base de datos en Supabase:** tabla `asistencia` + 5 columnas en `users` aplicadas.
- **Patrón reutilizable:** `FileInterceptor` + `memoryStorage` (10 MB, filtro `image/*`) en `products.controller.ts:23-39`; subida a Supabase en `products.service.ts:455-497`; `computeHash` en `common/image-hash.ts`.

---

## Bloqueos conocidos (léelos antes de empezar el día)

| # | Bloqueo | Dónde | Quién |
| --- | --- | --- | --- |
| 1 | **`npx tsc --noEmit` falla HOY en `mobile/` con 5 errores** (`@react-navigation/drawer`, `expo-image-picker`, `expo-document-picker` no resuelven): `node_modules` desactualizado respecto a `package.json`. Sin `npm install` no hay verificación posible en todo el hito | `mobile/` | Raul (día 1, paso 0) |
| 2 | `@bwip-js/node` **no está instalado** en `backend/` | `backend/package.json` | Brian (día 1) |
| 3 | `expo-camera` **no está instalado** y `app.json` solo declara el permiso `INTERNET` (falta `android.permissions.CAMERA` + plugin) | `mobile/` | Raul (día 1) |
| 4 | **Orden de rutas en NestJS:** `@Get('by-barcode/:codigo')` debe declararse **antes** de `@Get(':id')` (`products.controller.ts:51`), si no Nest intenta parsear `"by-barcode"` con `ParseIntPipe` → 400 | `backend/src/products/products.controller.ts` | Brian (día 1) |
| 5 | `UsersController` tiene `@Roles('admin')` **a nivel de clase** (`users.controller.ts:19`) | `backend/src/users/` | Brian (día 3) |
| 6 | Bucket `faces` **no existe** en Supabase Storage (hoy solo `products`, público). **Reverificado el 01/10 al cerrar B3:** sigue sin existir, así que `POST /users/face/register` responde `400 Bucket not found`. Sin bucket no hay registro facial posible | Supabase | Raul (día 2, **pendiente**) |
| 7 | `attendance.module.ts` tiene 8 líneas: **sin controller ni service**, no expone ninguna ruta | `backend/src/attendance/` | Brian (día 2) |
| 8 | `SUPABASE_URL` / `SUPABASE_KEY` / `SUPABASE_BUCKET` se leen del código pero **no están en `docs/entornos.md`** | `docs/entornos.md` | Brian (día 6) |
| 9 | `ProductSeed` no incluye `codigo` → los productos quedaban sin etiqueta; se agrega la generación masiva (`npm run seed` y `POST /products/barcode/generate-all`) | `backend/src/seed.ts:35` | Brian (día 1) |
| 10 | `clearAll()` del seed hace `TRUNCATE` **sin `asistencia`** → filas huérfanas | `backend/src/seed.ts` | Brian (día 5) |
| 11 | Frontend **no tiene ninguna pantalla de personal** (`routes/index.tsx` no lista usuarios, no hay `users.service.ts`) | `frontend/src/` | Marco (día 3) |
| 12 | `SalesScreen` solo acepta `initialSaleId`; su `addToCart` es un **closure local** sobre `cart` → el escáner no puede reutilizarlo desde otra pantalla (motivo de la opción C: botón + modal) | `mobile/src/screens/SalesScreen.tsx:71-75, 247-270` | Raul (tarea pendiente) |
| 13 | El POS valida contra `stockByLocation[user.tiendaId]`, **no** contra `stockTotal` (que suma las 7 ubicaciones) | `mobile/src/screens/SalesScreen.tsx:110` | Raul (tarea pendiente) |
| 14 | `Sales` y `Scanner` son pantallas **hermanas** del drawer, no una pila → el escáner no se puede apilar encima de la venta; el `inventario` además no tiene POS | `mobile/App.tsx:54,60` · `mobile/src/components/AppDrawer.tsx:27,40,46,55` | Raul (tarea pendiente) |
| 15 | **`onnxruntime-node` no corre dentro de Jest**: su binding nativo valida los typed arrays con `instanceof Float32Array` de su propio realm y el sandbox de Jest usa otro → *toda* inferencia muere con `A float32 tensor's data must be type of function Float32Array()`. Por eso el contrato del modelo se verifica con `npm run face:check` (script, fuera de Jest) y no con un spec | `backend/spike/face-check.ts` | Brian (día 3, cerrado) |

---

## Objetivo del día 1 (29/09) — lo que hay que lograr

Solo dos cosas, y ninguna puede quedar a medias:

1. **Una etiqueta para cada producto.** Los 37 productos de la BD quedan con `codigo` asignado (`AP-<id>-<codigoFabrica>`) y su PNG Code128 generado. Ningún producto se queda sin código para "generarlo después".
2. **El celular reconoce el producto y avisa.** Al apuntar la cámara a una etiqueta, el móvil muestra un **mensaje con la información**: nombre, código, precio, stock (total y por tienda) e imagen — leídos de Supabase a través de Render.

**Cómo se comprueba (a ojo, en 5 minutos):**

1. `GET /api/products?limit=100` → ningún producto con `codigo: null`.
2. Descargar una etiqueta: `curl -o et.png <url-render>/api/products/1/barcode` (o imprimir la hoja de Marco).
3. Abrir **ScannerScreen** en el celular y apuntar a la etiqueta → aparece la ficha del producto.
4. Apuntar a un código inexistente → mensaje **"código no registrado"**, nunca pantalla en blanco ni crash.

**Orden dentro del día (para que nadie quede esperando):**

1. Brian sube `by-barcode` **primero** (no necesita dependencia nueva) → Raul ya monta el escáner contra algo real desde la mañana.
2. En paralelo Raul corre `npm install` e instala `expo-camera`.
3. Brian genera los 39 códigos + `:id/barcode`; Marco arma la impresión masiva.
4. Raul apunta el móvil a Render y hace la prueba de los 5 minutos.

> ⚠️ Render hace *spin-down* tras 15 min sin tráfico: la primera petición tarda ~1 min. Conviene tener `by-barcode` "caliente" antes de que Raul vaya a probar.

---

## Plan día a día (29/09 → 06/10)

**Regla diaria:** el día termina con `lint` + `build` en verde en el módulo tocado, PR y merge a `main`. Flujo de Git según `docs/git-convention.md`.

| Día | Brian — Backend + Render | Raul — Móvil + Supabase | Marco — Web admin |
| --- | --- | --- | --- |
| **1** Mar 29/09<br>**Flujo A completo** | **B1** ✅ **Hecho** (29/09) — Instalar `@bwip-js/node`. **Generar el código de los 37 productos** con formato `AP-<id>-<codigoFabrica>` → script/bulk + campo `codigo` en `ProductSeed`. `GET /products/:id/barcode` → PNG Code128 **solo barras** (`includetext: false`, `scale: 3`, `height: 12`). `GET /products/by-barcode/:codigo` → producto + precio + stock + imagen, **filtrando `activo = true`** (**antes** de `@Get(':id')`). Filtro `codigo` + `p.codigo` en `search`. **Primer deploy en Render** apuntando a Supabase (`DB_SSL=true`). `lint`+`build` verdes · *Necesita: —* | **R1** ✅ **Hecho** (29/09 → 03/10) — Escáner completo y verificado contra la API de Render: 37/37 productos con `codigo` en la BD desplegada, `by-barcode` devuelve precio + stock total + stock por tienda, y el 404 del código inexistente funciona. **Ping diario corregido:** fallaba 4/4 corridas (30/09→03/10) en "Consultar products" porque a `service_role` le faltan los `GRANT` sobre el schema `public` (403 `permission denied for table products`), no por los secrets. Ahora el liveness va contra `GET /rest/v1/` (200 con cualquier `service_role`), agregué un paso que **verifica el bucket `faces` y que siga privado** (datos biométricos, Ley 26935) y el conteo de productos sin código quedó como aviso no bloqueante. Los 4 pasos ejecutados en verde contra el proyecto real. *Cerrado el 04/10:* `GRANT` aplicados (el paso 4 ya lee `products`: **0 productos sin código**), índice único confirmado en el SQL Editor (`UQ_e7a41b4ae1811faffbf9da6a55d`, lo crea TypeORM con su nombre automático) y secrets cargados en el repo. Los 4 pasos ejecutados en verde contra el proyecto real. Solo falta mergear el PR `feature/r1-ping-diario` a `main`. *Paso 0:* `npm install` (desbloquea `tsc`). `expo install expo-camera` + permiso y plugin en `app.json`. `ScannerScreen` con `onBarcodeScanned` (`code128`) + multiscan → **mensaje visible con la información del producto** (nombre, código, precio, stock total y por tienda, imagen) y mensajes claros para **código no registrado** y **sin stock**. Registrar en los 3 puntos de navegación (drawer, `App.tsx`, `RootStackParamList`). Supabase: verificar índice único de `codigo` + ping diario (evita pausa a los 7 días). `tsc --noEmit` verde · *Necesita: —* | **M1** ✅ **Hecho** (29/09) — Instalar `@bwip-js/browser`. Columna "Código de barras" en `ProductTable.tsx` (chip `p.codigo`) + botón "Generar etiqueta". `products.service.ts`: `getBarcode(id)` (blob) + `getProductByBarcode()`. **Impresión masiva** de las etiquetas de todo el catálogo (hoja A4, `toCanvas` + `@media print`, **solo barras sin texto**) para escanear con el celular. `lint`+`build` verdes · *Necesita: —* |
| **2** Mié 30/09<br>Decisión IA + esqueleto | **B2** ✅ **Hecho** (30/09) — **Spike medido** (`npm run spike:arcface`, `backend/spike/`): ArcFace int8 **entra en 512 MB**, overhead **125.9 MB** (73.4 base → 92.5 modelo → 27 arenas de ORT → **+0.1 MB por 5 embeddings**, son 2 KB cada uno). Latencia **246.8 ms**/embedding (media; p50 233.2, p95 367.6) → tanda de 5 = **~1.2 s**. 4.1 embeddings/s. Carga de la session 561 ms. Medido en i7-5500U 2.4 GHz (2c/4h) con `onnxruntime-node` 1.30.0, CPU EP; **el cuello de botella es la latencia, no la RAM** → el reconocimiento en vivo va con 1 sola foto y el registro con 5. **No hace falta el fallback a MobileFaceNet.** Ojo: son 125.9 MB del proceso Node con ORT, falta sumar el resto del backend NestJS — **repetir la medición en Render antes de cerrar B4**. Contrato: entrada `data` `float32 [1,3,112,112]` `(x-127.5)/128`, salida `fc1` `[1,512]` a normalizar. Licencia Apache-2.0. `attendance.controller.ts` + `attendance.service.ts`: `GET /attendance` (paginado `page`/`limit` + filtros `usuarioId`, `locationId`, `tipo`, `metodo`, `desde`, `hasta`, `search`) y `PATCH /attendance/:id` (corregir persona/tienda/tipo/fecha; `metodo:'manual'` anula `confianza` y sella `confirmadoPorId`). Solo `admin`. Joins con columnas explícitas: `leftJoinAndSelect` filtraba el hash de contraseña a la respuesta. `tsconfig.build.json` ahora excluye `spike` (rompía `dist/main` → `start:prod`). `lint`+`build` verdes · *Necesita: B1* | **R2** ✅ **Hecho** (30/09 → 04/10) — Bucket `faces` **verificado el 04/10**: existe, `public=false`, 5 MB, `allowed_mime_types=[image/jpeg,image/png,image/webp]` (creado el 03/10, después de que B3 lo reportó inexistente). **Policies: 0 que lo toquen** — las únicas dos de `storage.objects` son de `products`, así que `faces` solo lo alcanza `service_role` (BYPASSRLS) y la app lo muestra con URL firmada. Ese chequeo quedó automatizado en el paso "Verificar bucket faces" del ping diario. `FaceRegisterScreen` con formulario + guía oval + contador + feedback. `requestForm()`/`appendFile()` extraídos (`client.ts:100,116`) y usados en `products`, `sales` y `users`. **Multipart probado en vivo contra Render:** 0 fotos → `400`, usuario inexistente → `404`, rol `tienda` → `403` (los 3 mensajes son los que la app espera; el 404 corta antes de ArcFace, así que no se generó ningún embedding). `tsc --noEmit` verde · *Necesita: —* | **M2** ✅ **Hecho** (30/09) — Etiqueta imprimible: `includetext: false` (**solo barras, sin texto legible**), `scale: 3`, `height: 12` mm, zona de silencio de 10 módulos a cada lado y `@page { size: A4 }` para la hoja masiva. Modal de impresión masiva con filtros de tienda y vista previa. `lint`+`build` verdes · *Necesita: M1* |
| **3** Jue 01/10<br>Registro facial | **B3** ✅ **Hecho** (01/10) — Nuevo módulo `backend/src/face/`: `FaceService` (ArcFace int8 **in-process** con `onnxruntime-node`, `InferenceSession` **perezosa** para no gastar 92 MB al arrancar) + `face-embedding.ts` (aritmética pura: `promediarYNormalizar`, `similitudCoseno`, `aTensorNchw`) + índice en memoria con **rehidratación en `onModuleInit`** (`embedding IS NOT NULL AND activo = true`, columnas explícitas) y `buscar()` top-K por coseno que usa B4. `POST /users/face/register` (multipart `nombre`, `apellido`, `fotos[]`): resuelve el usuario en la BD → **404 si no existe**, **409 con `candidatos[]` si hay homónimos**, **409 si está dado de baja**; preprocesa 112×112 `(x-127.5)/128` (con `rotate()` para el EXIF del celular), corre ArcFace, **promedia y normaliza** los N embeddings → `users.embedding`; sube 1 foto a `faces` (nombre estable `user-<id>.jpg`, `upsert`) → `facePhoto` (**ruta**, no URL firmada) + `faceRegisteredAt`; actualiza el índice sin reiniciar. Orden deliberado: inferencia → subida → `save`, así una subida fallida no deja un embedding sin foto. `users.service.ts` extiende `apellido`, `activo` y `eliminarEmbedding` (baja biométrica: borra embedding + foto + índice); `auth.service.ts` **rechaza `activo=false` (401)** y ya no filtra `embedding` en el login. Extra: `GET /users/rostros` con **URL firmada** (la que necesita M3) y `common/image-upload.ts` para no duplicar el `multer` de productos. Tests: 27 verdes (los puros en Jest) + `npm run face:check` para el contrato real del modelo — **512 dims, norma 1, 250 ms/embedding, orden de similitud correcto**. Medido en vivo contra la BD: 3 fotos = 1271 ms. `lint`+`build`+`test` verdes · *Bloqueado: el bucket `faces` **no existe** en Supabase (verificado 01/10: `Bucket not found`)* · *Necesita: B2* | **R3** Conectar `FaceRegisterScreen`: error "usuario no encontrado" con sugerencia, progreso por foto, resultado con nombre completo. **Completar `apellido` de los usuarios reales de prueba en Supabase** (los 5 del seed lo tienen NULL) antes de registrar rostros · *Necesita: R2, B3* | **M3** ✅ **Hecho** (01/10) — Pantalla web **Personal** (`/personal`): listado con nombre completo, badge biométrico, fecha de registro y foto vía signed URL (`GET /users/rostros`). Item en `Sidebar.tsx`, `users.service.ts` y diseño consistente. `lint`+`build` verdes · *Necesita: B3* |
| **4** Vie 02/10<br>Marcaje | **B4** ✅ **Hecho** (02/10) — `POST /attendance/check` (multipart `foto`, `tipo?`, `locationId?`): embedding → índice en memoria → **similitud coseno** → top-5 candidatos. `≥ umbral` registra automático; `< umbral` devuelve candidato + `requiereConfirmacion` sin insertar. **`tipo` automático** (1ª del día `entrada`, 2ª `salida`). **Rehidratación en `onModuleInit`:** `SELECT id, embedding FROM users WHERE embedding IS NOT NULL AND activo = true`. **`UMBRAL_CONFIANZA_FACIAL` recalibrado a 0.35** (ver nota ⚠️). Ruta de confirmación manual (`metodo='manual'`, `confirmadoPorId`) · *Necesita: B3* | **R4** `AttendanceScreen`: foto en vivo → match → **nombre completo + hora exacta + tienda** → confirmar. UX "no reconocido": mostrar candidatos y elegir el nombre a mano. `AttendanceHistoryScreen` (quién entró, a qué hora, confianza) · *Necesita: B4* | **M4** ✅ **Hecho** (02/10) — Web: pantalla de historial de asistencia (`/asistencia`) con filtros (fecha, usuario, tienda, tipo, método), tabla paginada, modal de corrección manual (`PATCH /attendance/:id`), estados de carga y vacío. `lint`+`build` verdes · *Necesita: B4* |
| **5** Sáb 03/10 *(medio día)*<br>E2E + dashboard | **B5** ✅ **Hecho** (04/10) — `GET /attendance/dashboard?fecha=YYYY-MM-DD`: presentes/ausentes por tienda (`porTienda` ordenado por `codigo`, más `sinTienda`), `dentro` = el último marcaje del día fue `entrada`, `horaEntrada`/`horaSalida`, `ultimaMarca`, `marcajes`, `rostroRegistrado`, `totales` y los 10 últimos marcajes. La fecha se parsea como **día local** (`new Date(y, m-1, d)`): la forma ISO sería medianoche UTC y en Bolivia (UTC-4) caería en el día anterior; formato o fecha imposible → `400`. `POST /attendance/check` acepta `usuarioId` = **marcaje manual** (el operador elige a quién pertenece la foto; salta ArcFace, `metodo:'manual'`, `confianza: null`, `confirmadoPorId` = admin). Endurecido: `tipo` inválido → `400`, `locationId`/`usuarioId` inexistente o que no sea tienda → `404`, **sin foto → `400`** (era 500). Observabilidad para B6: `GET /face/status` (rostros en BD vs índice en memoria, umbral, modelo disponible/cargada) y `POST /face/warmup` (carga la `InferenceSession` y devuelve los ms). Tests: `attendance.e2e-spec` (automático / bajo umbral / manual / `confirm` / `PATCH` / dashboard / RBAC, con doble de `FaceService` porque `onnxruntime-node` no corre en Jest) y `face.e2e-spec` (estado, rehidratación, warmup, ruta de modelo inválida). `by-barcode` ampliado: existente, inexistente 404, producto **`codigo` NULL** (400) e inactivo. `clearAll()` ya truncaba `asistencia`. **`jest-e2e.json` con `testTimeout: 60000`:** el `beforeAll` levanta Nest contra Postgres remoto y reventaba el límite de 5 s (fallaban los 15 specs, no solo los nuevos). `lint`+`build`+`test` (27) + **`test:e2e` 129/129 verdes** · *Necesita: B4* | **R5** ⏳ En curso (06/10) — **Terreno verificado contra Render**: login admin, `face/status` (índice completo, modelo disponible, umbral 0.35), `face/warmup` (2.84 s), `attendance/check` automático con imagen sintética (201, `reconocido:false`, **ArcFace corrió de verdad**), errores 404/400/401 correctos, `by-barcode` (200 + 404), `attendance/dashboard` (5 usuarios, 0 rostros) y los 5 usuarios seed con `apellido` completado y `activo:true`. Faltó el E2E en **dispositivo físico** (registrar rostros reales, escanear etiquetas, marcar): protocolo + tabla de scores en `docs/e2e-asistencia.md` · *Necesita: R4* | **M5** ✅ **Hecho** (03/10) — Dashboard del día (`/asistencia/dashboard`): métricas de presentes/ausentes/puntualidad, desglose por las 7 tiendas, listado de últimos marcajes y estado de personal. `lint`+`build` verdes · *Necesita: M4* |
| **6** Dom 04/10 *(medio día)*<br>Deploy + privacidad | **B6** ✅ **Hecho** (04/10) — Deploy `cd76007` **live** en `inventarioautopartesi.onrender.com` (PR #59) con env completo: se agregó **`FACE_BUCKET=faces`** por API (ya estaban `DB_*`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_BUCKET`). **El modelo faltaba:** son 63 MB que no se versionan y Render borra el filesystem en cada deploy, así que sin más el reconocimiento facial daba 503 → `scripts/ensure-arcface-model.mjs` + `prestart:prod` lo baja en el arranque (idempotente, valida el tamaño, y si falla la red avisa sin tumbar la API). Verificado en el servidor: `/opt/render/project/src/backend/models/arcfaceresnet100-11-int8.onnx`. **Rehidratación verificada de verdad** (`npm run spike:rehidratacion`: usuario temporal + embedding sintético → 17 min sin tráfico → primer request → borrar): `rostrosEnBase=1, indiceEnMemoria=1, indiceCompleto=true`. **Cold start medido: 52.7 s** el primer request tras el apagado, **2.2 s** en cargar el modelo con la sesión fría (561 ms en local). Rutas de diagnóstico para que el equipo lo repita sin registrar rostros: `GET /face/status` y `POST /face/warmup`. Documentado `SUPABASE_*`, `FACE_BUCKET` y `ARCFACE_MODEL` en `docs/entornos.md` y el cold start en `docs/despliegue.md` · *Necesita: B5* | **R6** Apuntar el móvil a Render (`EXPO_PUBLIC_API_URL`) + `npx expo export` verde. Cámara en dispositivo real: permisos, flash, errores claros. **Consentimiento:** texto breve + checkbox obligatorio antes de capturar ("autorizas el uso de tu imagen para control de asistencia", Ley 26935 Bolivia) · *Necesita: R5* | **M6** ✅ **Hecho** (04/10) — QA web en producción (Vercel) + responsive en tablets/móviles. Verificación de seguridad biométrica: ninguna pantalla expone `facePhoto` directo, uso exclusivo de URLs firmadas temporales (`faces`). `lint`+`build` verdes · *Necesita: M5* |
| **7** Lun 05/10<br>Endurecer + documentar | **B7** ✅ **Hecho** (05/10) — `docs/api.md`: contrato completo de las **5 rutas** de asistencia (params, tablas de campos, respuestas y errores), ficha de la tabla `asistencia` (columnas + 2 índices) y de las 5 columnas faciales de `users`; corregidas 2 inexactitudes que venían de B4/B5 (límite real de la foto = 10 MB `image/*`, no 8 MB; `locationId` solo se valida por existencia, no por tipo). `docs/arquitectura.md`: §3.1 módulos `attendance`+`face` (archivos, entidades, rutas, `FaceModule` exporta a `AttendanceModule`) y **§3.2 el modelo de reconocimiento sin detector** (diagrama, por qué in-process y no FastAPI, sesión perezosa, rehidratación obligatoria, umbral 0.35 por coseno, sin detector porque la app recorta con guía oval, medidas spike/Render, y las 5 trampas: Jest vs `onnxruntime-node`, el realm del tensor, `leftJoinAndSelect`, modelo no versionado, embeddings corruptos). También los flujos de los dos del hito en §5, las 5 pantallas nuevas en §7 y 5 decisiones en §8. Extra: borrada la referencia a `/face/match`, **ruta que nunca existió** (venía del doc de integración), de `api.md`, `schema.sql`, `constants.ts`, `asistencia.entity.ts` y `user.entity.ts` (que además decía "microservicio /face/embed" y "URL" donde es **ruta** del objeto); y `docs/stack-tecnologico.md` con `onnxruntime-node`, `@bwip-js/node`, `expo-camera` y el conteo real de pantallas por rol (13/10/6). `lint`+`build`+`test` (27) + **`test:e2e` 129/129 verdes** · *Necesita: B6* | **R7** UX: pulido de las 3 pantallas nuevas, estados de carga/error, permitir repetir la captura. **Sincronizar `RootStackParamList`** con las rutas reales del drawer (hoy faltan `SalesHistory`, `SearchByImage`, `Inventario`). `tsc --noEmit` + `expo export` verdes · *Necesita: R6* | **M7** ✅ **Hecho** (05/10) — **README raíz** al día con alcance completo de Hito 3 (códigos de barras Code128 y asistencia facial), badges actualizados, credenciales demo, guías de arranque. `lint`+`build` verdes · *Necesita: M6* |
| **8** Mar 06/10<br>Demo y cierre | **B8** Bugfixes acumulados, dejar Render desplegado y despierto, tag de release · *Necesita: B7* | **R8** Guión + video demo móvil: etiqueta → scan → producto; registro → marcaje → **nombre + hora** · *Necesita: R7* | **M8** ✅ **Hecho** (06/10) — Demo web documentada paso a paso en `docs/demo-web.md` (4 escenarios de prueba: códigos de barras A4, personal con fotos biométricas firmadas, historial con filtros/corrección y dashboard en vivo). **Definición de Terminado cumplida**: build + lint verdes en los 3 módulos (`frontend/`: oxlint 0 err + vite build ok; `backend/`: eslint 0 err + nest build ok; `mobile/`: tsc --noEmit ok + expo export ok). *PR feature/m8-demo-cierre-web* · *Necesita: B8, R8* |

> ⚠️ **Calibración del umbral (tarea de B4).** `UMBRAL_CONFIANZA_FACIAL = 0.55` quedó definido para el scoring de InsightFace. Con **similitud coseno sobre embeddings ArcFace normalizados** el rango típico de "misma persona" es **0.28–0.45**. Con 0.55 fijo el sistema daría falsos negativos. Medir con los rostros de R5 y ajustar la constante en `common/constants.ts` antes de la demo.
> **Estado:** B4 lo dejó en **0.35** (mitad del rango típico, a favor de no rechazar a quien sí es la persona). Si R5 reporta falsos positivos, **subirlo**; falsos negativos, **bajar**. El umbral sale en `GET /face/status` y en cada respuesta de `POST /attendance/check`.

---

## Tarea R9 — modo tiqueador (agregada al plan, 06/10)

No estaba en el cronograma original: salió de que **una tablet en el mostrador no debe poder vender, cambiar precios ni ver reportes**. Cada tablet es un kiosk que solo marca asistencia.

| | |
| --- | --- |
| **Qué es** | Un item **Tiqueador** en el sidebar del admin que convierte la tablet en un kiosk: se entra y se sale con la contraseña del administrador, y mientras está activo la app **no renderiza el drawer ni el stack**, solo la pantalla de marcaje. |
| **Un solo admin** | Las 3 tablets se loguean con la **misma** cuenta (Brian Barrientos, `admin@importadoras.com`). `/attendance` y `/users/face/register` son solo `admin`, así que el kiosk tiene que seguir siendo admin — de ahí el gate de contraseña en lugar de un usuario por tienda. |
| **La tienda es del dispositivo** | No sale de `users.tiendaId`: si saliera del usuario, el admin tendría una sola tienda y las 3 tablets marcarían siempre en la misma. Vive en `storage/terminal.ts` (`SecureStore`, `localStorage` en web), se configura una vez por tablet y hay que reconfigurar si se desinstala la app. En producción el admin quedó con **`users.tiendaId = NULL`** (`PATCH /users/1`), así que la config del dispositivo es el único camino que puede asignar tienda. `user.tiendaId` queda solo como último recurso para el rol `tienda`. |
| **Archivos** | `src/storage/terminal.ts` (config + flag), `src/context/TiqueadorContext.tsx`, `src/components/AdminPasswordGate.tsx` (valida con `POST /auth/login`, **descarta** el token nuevo y mantiene la sesión), `src/components/TiendaSelector.tsx`, más `App.tsx`, `AppDrawer.tsx` y `AttendanceScreen.tsx` (props `modoTiqueador` / `onSalir`). |
| **Trampa: el kiosco hay que **persistirlo** | Un estado en memoria se pierde al reiniciar la app y el **token de admin sigue guardado** en esa tablet: cualquiera que la tome vería la app completa. Por eso el flag va a `SecureStore` y `RootNavigator` no dibuja **ninguna** pantalla hasta leerlo (`listo`), para que tampoco asome un instante. |
| **Sin tienda no hay cámara** | `faltaTienda` impide montar `FaceCamera` y habilita el CTA, **en cualquier modo** (no solo en tiqueador): pedir una foto que después no se puede registrar solo confunde al operador. Si falta tienda y quien está en la app no es admin, la tarjeta lo dice en vez de ofrecer un botón inútil. Configurar o **cambiar** la tienda también pide la contraseña del admin (decide dónde caen todos los marcajes). |
| **Horizontal en el tiqueador** | `app.json` pasó de `orientation: "portrait"` a **`"default"`**: la tablet del kiosco se apoya de lado y ahí la columna única de la pantalla de marcaje dejaba la cámara angosta con la mitad de la pantalla vacía. Con `useWindowDimensions` + `breakpoints.tablet` (768, el token del design system) la pantalla se **reestructura en dos paneles**: cámara a la izquierda ocupando el alto (`flex: 3`) y acciones/resultado a la derecha (`flex: 2`). Por debajo de 768 de ancho (teléfono rotado) se queda en una columna. Se usa el **ancho**, no el modelo del dispositivo ni un chequeo de plataforma. Consecuencia asumida: `default` es de **toda la app**, así que las demás pantallas también pueden rotar — seavisó y quedó pendiente decidir si se bloquean con `expo-screen-orientation`. |
| **Textos que no se pisan** | Todo texto que va con `flex: 1` al lado de un badge, un chevron o un botón lleva `minWidth: 0` + `numberOfLines`, porque sin eso un nombre de tienda o un email largo **empuja el control vecino fuera de la fila** (y en horizontal era fácil: los paneles angostos lo disparaban siempre). Afectó a la barra de tienda, la fila de candidatos, el resultado del marcaje, los datos de la tarjeta, la nota, el `Header` (compartido) y el `TiendaSelector`. Además el óvalo de la guía de `FaceCamera` pasó de `220×280` fijos a medirse contra la caja real: en horizontal tapaba el encuadre. |
| **Rostro desde la lista** | Registrar el rostro a mano (`nombre` + `apellido`) obligaba a escribir bien un nombre y a elegir entre 404 y 409 con homónimos. Ahora `FaceRegisterScreen` **lista primero** al personal con `GET /users` (rol admin, sin `password` ni `embedding`) y filtra en el cliente con `usuariosSinRostro()` (`activo && !facePhoto && !faceRegisteredAt`, porque el registro siempre escribe los dos campos): tocar una fila marca `usuarioId` y manda ese id en `POST /users/face/register`, que **gana sobre nombre/apellido** y no puede fallar por homónimos (404 solo si el id no existe). El formulario de nombre queda como alternativa colapsada ("No está en la lista") para seguir cubriendo a alguien dado de baja o no listado. Backend: `usuarioId` en el controller (valida formato antes de buscar) y en `users.service.ts`; mobile: `listarUsuarios` + `usuariosSinRostro` en `api/users.ts`. E2E nuevo `test/face-register.e2e-spec.ts` (7 casos, con `FaceService` dobleado: 201 por id, id gana sobre nombre, 404/400 por id, 400 sin fotos, 404 por nombre, 403 sin rol admin). |
| **Verificación** | `npx tsc --noEmit` + `npx expo export` verdes, detector de Impeccable sin hallazgos; backend `lint` 0 errores + `build` + `npm test` 27 + `test:e2e` **136/136**. Falta la prueba en tablet **física en ambas orientaciones** (entrar/salir, reiniciar y confirmar que vuelve al tiqueador, y que nada se corte) y un registro facial real (necesita el bucket `faces`). |

---

## Tarea pendiente — escanear desde el POS (no agendada en este hito)

> **Estado: PENDIENTE, sin día asignado.** Quedó fuera de los 8 días a pedido del equipo
> (02/10/2026). **No es parte de la entrega del 06/10.** La decisión de diseño ya está tomada
> abajo, así que cuando se asigne solo hay que implementar. Anotada acá para no perderla:
> el Flujo A (R1/B1) es **solo consulta** y funciona por sí solo.

**Objetivo:** que el vendedor escanee una etiqueta desde la pantalla de venta y la pieza entre
al carrito, sin cambiar de pantalla.

**Decisión tomada (opción C):** botón **"Escanear" dentro de `SalesScreen`**, que abre la cámara
como **modal encima** del POS.

### Por qué esta y no las otras

| Opción | Por qué se descartó |
| :--- | :--- |
| `CartContext` (carrito compartido) | Obliga a refactorizar `SalesScreen` (1257 líneas) con `cart` como estado central. Riesgo de regresión en el POS a cambio de una capacidad que no se pidió |
| `Sales` acepta el producto como parámetro | Manda al POS a la pantalla hermana del drawer por cada pieza escaneada: N rebotes para N piezas, más lento que escribir el código a mano |
| **C — botón + modal** ✅ | El carrito no se mueve ni se toca. Gana en esfuerzo **y** en velocidad de uso |

### Cómo queda

```
┌─ PUNTO DE VENTA ──────────────────────┐
│ Buscar producto…        [ 📷 Escanear ] │  ← botón nuevo
├───────────────────────────────────────┤
│ 🛒 Carrito                             │
│   Pastilla freno   x2      Bs 40.00    │
│   Bujía            x1      Bs 15.00    │
└───────────────────────────────────────┘
        ↓ tocás [Escanear]
   ┌─────────────────────────┐
   │  ( cámara )         [X]  │  ← modal encima, no navega
   └─────────────────────────┘
        ↓ detectá la etiqueta
   → agrega al carrito, se cierra, seguís en la venta
```

1. El carrito **no se mueve**: `addToCart` ya está en `SalesScreen` (`:247-270`) y se la llama directo.
2. La cámara abre como **modal**, no navegando. `Sales` y `Scanner` son pantallas **hermanas** del
   drawer (`App.tsx:54` y `:60`), no una pila: no se puede apilar el escáner encima de la venta.
3. En el POS el escaneo **agrega directo**, sin mostrar la ficha (la ficha es para consultar).
4. **`ScannerScreen` no se borra**: sigue siendo la herramienta de consulta y la que usa el rol
   `inventario`, que no tiene POS.

### Para implementarla (todo verificado en el código)

- **Extraer la cámara a un componente compartido** `mobile/src/components/BarcodeScanModal.tsx`
  (cámara + linterna + permisos + dedup de 2500 ms, ya resuelto en `ScannerScreen`). Lo usan
  `SalesScreen` (modo POS) y `ScannerScreen` (modo consulta) → no duplicar la lógica de cámara.
- **Trampa — el stock que valida el POS no es `stockTotal`:** `SalesScreen.tsx:110` usa
  `p.stockByLocation[user.tiendaId] ?? p.stockTotal`. `stockTotal` suma las 7 importadoras;
  usarlo dejaría vender más de lo que hay en la tienda donde se cobra.
- **Trampa — el rol `inventario` no tiene POS:** el botón vive en `SalesScreen`, que solo está
  en los drawers de `admin` y `tienda` (`AppDrawer.tsx:27,40` vs `:46,55`). Ese rol no lo ve.
- **Trampa — no colgarlo de `onBarcodeScanned`:** el escáner es multiscan; si el alta al carrito
  fuera automática, un solo disparo agregaría N veces. Va en un botón explícito.
- **Backend: no se toca.** `POST /sales` ya acepta `items: [{productId, cantidad, precio}]`, y
  `GET /products/by-barcode/:codigo` ya devuelve `stockByLocation` (`products.service.ts:191`),
  así que no hace falta ninguna request extra.
- **Sin decisión pendiente de diseño.** Queda una de UX menor: si el modal se cierra tras cada
  escaneo (recomendado: se ve el carrito y se detectan errores de apunte) o si se mantiene
  abierto para escanear varias seguidas.

### Otra tarea pendiente — conteo de recepción

`POST /movimientos/entrada/count` (ver `docs/api.md`): **fuera del Hito 3**, sin implementar, y
con un bloqueo técnico sin resolver — `origenId` es NOT NULL y una entrada de proveedor no tiene
ubicación de origen. El conteo por **IA/YOLO quedó descartado** y no vuelve a plantearse.

---

## Ruta crítica

- **Flujo A (entrega 29/09):** `B1 → R1` (endpoint en Render + escáner) · `M1` en paralelo, cierra la parte web.
- **Flujo B:** `B2 (spike) → B3 → B4 → R4 → B7` — el spike del día 2 bloquea toda la cadena. **Resuelto el 30/09: el ArcFace int8 entra en 512 MB (125.9 MB de overhead), así que el fallback a MobileFaceNet queda descartado.** La restricción real que dejó el spike es de **latencia** (246.8 ms por embedding), no de memoria.
- **Integración web:** `B3 → M3` (personal) y `B4 → M4` (historial).
- **Demo:** `B6` (cold start medido) y `R6` (móvil contra Render) son la última chance de aplicar el plan B local WiFi.
  - **B6 cerrado (04/10):** el cold start del plan free de Render es de **52.7 s**, así que R6 tiene que ver el backend con tráfico reciente y la app debe avisar "despertando el servidor…". Para la demo del 06/10 hay que despertar Render un par de minutos antes (tarea B8).

## Independencia entre las 3 personas

**Marco nunca bloquea a Brian ni a Raul.** Ninguna tarea `B*` o `R*` depende de una `M*` en los 8 días. Lo único que Marco necesita de los demás son endpoints que Brian ya tiene listos (`M3 ← B3`, `M4 ← B4`); si se retrasan, Marco puede construir la UI igual e integra al final del día.

Lo mismo aplica en la práctica porque cada persona trabaja en un módulo y directorio distintos (`backend/`, `mobile/`, `frontend/`) con sus propios `package.json`, sin dependencias compartidas.

| Persona | Puede retrasarse sin afectar | Único punto donde puede bloquear |
| --- | --- | --- |
| Marco | A nadie | A nadie (solo depende de endpoints de Brian, ya previstos) |
| Brian | Nada en móvil/web (el web puede construirse con el contrato congelado) | **A Raul**, en `B3` → `R3` y `B4` → `R4` |
| Raul | Nada (el spike de `B2` es suyo y no espera a nadie) | A nadie |

> **El único acoplamiento real del plan es Brian → Raul**, no Marco. Si Brian se atrasa, Raul queda esperando; por eso `B1` sube `by-barcode` primero y `B3` cierra `face/register` temprano.

**Reparto de archivos para evitar conflictos de merge** (todo se mergea a `main` a diario):

| Persona | Escribe en |
| --- | --- |
| Brian | `backend/`, `docs/api.md`, `docs/arquitectura.md`, `docs/entornos.md` |
| Raul | `mobile/`, Supabase (BD + buckets) |
| Marco | `frontend/`, **README raíz** |

> ⚠️ El día 7 ambos tocaban `docs/` → se repartió: Brian escribe las 3 fichas técnicas y Marco solo el README raíz.

## Contrato de endpoints (congelado el día 1)

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/api/products/by-barcode/:codigo` | Identifica el producto por código de barras. **Antes de `:id`** |
| GET | `/api/products/:id/barcode` | Genera la etiqueta PNG Code128; persiste `codigo` si era NULL |
| POST | `/api/products/barcode/generate-all` | Genera los códigos de todo el catálogo sin etiquetar (**solo admin**) |
| POST | `/api/users/face/register` | `multipart`: `usuarioId` (elegido de la lista, gana) **o** `nombre` + `apellido`, más `fotos[]`. Asocia el rostro a un `users` existente |
| POST | `/api/attendance/check` | `multipart`: `foto`, `tipo?`, `locationId?`. Reconoce y registra el marcaje |
| POST | `/api/attendance/:id/confirm` | Confirmación manual cuando la confianza es baja |
| GET | `/api/attendance` | Historial paginado (`fecha`, `usuarioId`, `locationId`) |
| GET | `/api/attendance/dashboard` | Presentes / ausentes por tienda para una fecha |
| PATCH | `/api/attendance/:id` | Corrección manual de un marcaje |

## Verificación diaria

| Módulo | Comandos |
| --- | --- |
| Backend | `npm run lint` · `npm run build` · `npm test` · `npm run test:e2e` |
| Web | `npm run lint` (oxlint) · `npm run build` |
| Móvil | `npx tsc --noEmit` · `npx expo export` |

## Riesgos y contingencias

- **`tsc --noEmit` roto en móvil (bloqueo 1):** si `npm install` no resuelve, el hito se queda sin red de seguridad en móvil → avisar el día 1, no arrastrarlo.
- **Cold start de Render:** el índice de rostros vive en RAM y se pierde en cada spin-down de 15 min; la rehidratación es obligatoria y la 1ª marcaje tras dormir será lenta. Si el cold start con ArcFace supera lo aceptable, la **demo se hace contra backend local por WiFi** (decisión el día 6, no el día 8).
- **Supabase free tier** pausa el proyecto a los 7 días sin actividad → ping diario por GitHub Actions (tarea R1). ⚠️ **Aprendido el 03/10:** el workflow del ping original fallaba porque **`service_role` no tiene `GRANT` sobre las tablas de `public`** (PostgREST responde 403), no por los secrets. El liveness ya no consulta `products` (usa `GET /rest/v1/`) y el chequeo de productos sin `codigo` quedó como *warning* no bloqueante. Para que ese conteo funcione había que correr una vez en el SQL Editor `grant usage on schema public to service_role; grant select on all tables in schema public to service_role;` — **aplicado el 04/10**.
- **Calidad de impresión:** al ser una etiqueta **solo de barras**, la barra es la única lectura → `scale: 3`, `height: 12` mm, zona de silencio de 10 módulos, papel mate y buena luz. Si aun así el celular no la lee, el plan B es cambiar `bcid` a `'qrcode'` (QR se lee mucho mejor en tamaños pequeños) (tarea M2).
- **Iluminación y ángulo en el rostro:** es el mayor riesgo del hito. Mitigación: N fotos por registro, guía oval en la captura, y confirmación humana cuando la confianza es baja (nunca un error seco).
- **Solapamiento de nombres:** dos personas con el mismo nombre completo no se pueden distinguir en el formulario → mostrar siempre `email`/`rol` en la pantalla de confirmación para que el operador elija bien.
- **Privacidad (Ley 26935 Bolivia):** datos biométricos son sensibles. Mínimo obligatorio: consentimiento explícito, bucket `faces` privado con URLs firmadas, derecho de baja (`activo=false` + eliminar `embedding`) y **cero logs de imágenes**.
- **Depende del registro previo:** la asistencia solo reconoce personal ya registrado; hay que registrar los rostros de prueba antes de la demo.

## Fuera de alcance en este hito

Detección/alineación de rostros con modelo detector · FastAPI como servicio aparte · sincronización de foto de perfil · re-entrenamiento o dataset propio · RLS en Supabase (el backend usa `service_role`) · app web de cámara en vivo (el registro facial es móvil) · **conteo de piezas con IA/YOLO (descartado, no es parte de este proyecto)** · **escanear desde el POS** (decisión tomada en "Tarea pendiente", sin día asignado) · **conteo de recepción con `POST /movimientos/entrada/count`** (propuesta en `docs/api.md`, sin implementar).

> El escáner del Hito 3 es **solo de consulta** (R1/B1): lee un código y muestra la ficha del
> producto. Que además arme el carrito del POS quedó **anotado y sin agendar** — con el diseño
> ya decidido — en la sección "Tarea pendiente". La entrega del 06/10 no lo incluye.
