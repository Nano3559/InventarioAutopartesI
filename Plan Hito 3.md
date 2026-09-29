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
| Escaneo | `expo-camera` (`onBarcodeScanned`, `barcodeTypes: ['code128']`) + multiscan | Sin dependencia nueva de render en móvil para leer |
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
| 6 | Bucket `faces` **no existe** en Supabase Storage (hoy solo `products`, público) | Supabase | Raul (día 2) |
| 7 | `attendance.module.ts` tiene 8 líneas: **sin controller ni service**, no expone ninguna ruta | `backend/src/attendance/` | Brian (día 2) |
| 8 | `SUPABASE_URL` / `SUPABASE_KEY` / `SUPABASE_BUCKET` se leen del código pero **no están en `docs/entornos.md`** | `docs/entornos.md` | Brian (día 6) |
| 9 | Los 39 productos del seed quedan con `codigo = NULL` y `ProductSeed` **no incluye** `codigo` → hay que **generarlos todos hoy** (formato `AP-<id>-<codigoFabrica>`) | `backend/src/seed.ts:35` | Brian (día 1) |
| 10 | `clearAll()` del seed hace `TRUNCATE` **sin `asistencia`** → filas huérfanas | `backend/src/seed.ts` | Brian (día 5) |
| 11 | Frontend **no tiene ninguna pantalla de personal** (`routes/index.tsx` no lista usuarios, no hay `users.service.ts`) | `frontend/src/` | Marco (día 3) |

---

## Objetivo del día 1 (29/09) — lo que hay que lograr

Solo dos cosas, y ninguna puede quedar a medias:

1. **Una etiqueta para cada producto.** Los 39 productos de la BD quedan con `codigo` asignado (`AP-<id>-<codigoFabrica>`) y su PNG Code128 generado. Ningún producto se queda sin código para "generarlo después".
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
| **1** Mar 29/09<br>**Flujo A completo** | **B1** Instalar `@bwip-js/node`. **Generar el código de LOS 39 productos** con formato `AP-<id>-<codigoFabrica>` → script/bulk + campo `codigo` en `ProductSeed`. `GET /products/:id/barcode` → PNG Code128 **solo barras** (`includetext: false`, `scale: 3`, `height: 12`). `GET /products/by-barcode/:codigo` → producto + precio + stock + imagen, **filtrando `activo = true`** (**antes** de `@Get(':id')`). Filtro `codigo` + `p.codigo` en `search`. **Primer deploy en Render** apuntando a Supabase (`DB_SSL=true`). `lint`+`build` verdes · *Necesita: —* | **R1** **Paso 0:** `npm install` (desbloquea `tsc`). `expo install expo-camera` + permiso y plugin en `app.json`. `ScannerScreen` con `onBarcodeScanned` (`code128`) + multiscan → **mensaje visible con la información del producto** (nombre, código, precio, stock total y por tienda, imagen) y mensajes claros para **código no registrado** y **sin stock**. Registrar en los 3 puntos de navegación (drawer, `App.tsx`, `RootStackParamList`). Supabase: verificar índice único de `codigo` + ping diario (evita pausa a los 7 días). `tsc --noEmit` verde · *Necesita: —* | **M1** Instalar `@bwip-js/browser`. Columna "Código de barras" en `ProductTable.tsx` (chip `p.codigo`) + botón "Generar etiqueta". `products.service.ts`: `getBarcode(id)` (blob) + `getProductByBarcode()`. **Impresión masiva** de las etiquetas de todo el catálogo (hoja A4, `toCanvas` + `@media print`, **solo barras sin texto**) para escanear con el celular. `lint`+`build` verdes · *Necesita: —* |
| **2** Mié 30/09<br>Decisión IA + esqueleto | **B2** 🚧 **Spike bloqueante (1h30):** `onnxruntime-node` + ArcFace int8 → medir RAM y latencia por inferencia con 1 y 5 embeddings en memoria. *Anotar el número en este plan al terminar.* Luego `attendance.controller.ts` + `attendance.service.ts` (hoy el módulo no expone rutas), `GET /attendance` (paginado + filtros) y `PATCH /attendance/:id` · *Necesita: B1* | **R2** Crear bucket `faces` en Supabase (privado, policies solo `service_role`). `FaceRegisterScreen`: formulario nombre + apellido + N fotos (guía oval, contador, feedback). Envío multipart a `face/register`. Extraer `requestForm()`/`appendFile()` en `api/client.ts` (hoy duplicado ~130 líneas) · *Necesita: —* | **M2** Etiqueta imprimible: `includetext: false` (**solo barras, sin texto legible**), `scale: 3`, `height: 12` mm, zona de silencio de 10 módulos a cada lado y `@page { size: A4 }` para la hoja masiva. Verificar tamaño: al no haber texto, la barra es la única lectura → la escala y la altura importan más, papel mate sin brillo. QA del flujo A contra Render · *Necesita: M1* |
| **3** Jue 01/10<br>Registro facial | **B3** `POST /users/face/register` (multipart `nombre`, `apellido`, `fotos[]`): resuelve el usuario en la BD → **404 si no existe**; preprocesa 112×112 `(x-127.5)/128`, corre ArcFace, **promedia y normaliza** los N embeddings → `users.embedding`; sube 1 foto a `faces` → `facePhoto` + `faceRegisteredAt`; rehidrata el índice. Extender `users.service.ts` (`apellido`, `activo`) y `auth.service.ts` (rechazar `activo=false`) · *Necesita: B2* | **R3** Conectar `FaceRegisterScreen`: error "usuario no encontrado" con sugerencia, progreso por foto, resultado con nombre completo. **Completar `apellido` de los usuarios reales de prueba en Supabase** (los 5 del seed lo tienen NULL) antes de registrar rostros · *Necesita: R2, B3* | **M3** Pantalla web **Personal** (no existe): listado con nombre completo, foto vía signed URL, fecha de registro y estado. Nuevo item en `Sidebar.tsx` + `users.service.ts` + ruta `/personal` · *Necesita: B3* |
| **4** Vie 02/10<br>Marcaje | **B4** `POST /attendance/check` (multipart `foto`, `tipo?`, `locationId?`): embedding → índice en memoria → **similitud coseno** → top-5 candidatos. `≥ umbral` registra automático; `< umbral` devuelve candidato + `requiereConfirmacion` sin insertar. **`tipo` automático** (1ª del día `entrada`, 2ª `salida`). **Rehidratación en `onModuleInit`:** `SELECT id, embedding FROM users WHERE embedding IS NOT NULL AND activo = true`. **Calibrar `UMBRAL_CONFIANZA_FACIAL`** (ver nota ⚠️). Ruta de confirmación manual (`metodo='manual'`, `confirmadoPorId`) · *Necesita: B3* | **R4** `AttendanceScreen`: foto en vivo → match → **nombre completo + hora exacta + tienda** → confirmar. UX "no reconocido": mostrar candidatos y elegir el nombre a mano. `AttendanceHistoryScreen` (quién entró, a qué hora, confianza) · *Necesita: B4* | **M4** Web: historial de asistencia con filtros (fecha / usuario / tienda) sobre `GET /attendance`, con estados de carga y vacío, siguiendo `styles/inventory.css` · *Necesita: B4* |
| **5** Sáb 03/10 *(medio día)*<br>E2E + dashboard | **B5** `GET /attendance/dashboard?fecha=` (presentes/ausentes por tienda). Tests e2e nuevos: `by-barcode` (existente, código inexistente 404, `codigo` NULL), `attendance/check` (automático / bajo umbral / manual). Arreglar `clearAll()` del seed para truncar `asistencia` · *Necesita: B4* | **R5** E2E en dispositivo físico con usuarios reales: registrar 2-3 rostros (una sola vez) → escanear etiquetas → marcar asistencia. **Anotar scores reales y falsos positivos/negativos** (alimenta la calibración de B4) · *Necesita: R4* | **M5** Dashboard del día (presentes/ausentes por tienda) + tarjeta de últimos marcajes · *Necesita: M4* |
| **6** Dom 04/10 *(medio día)*<br>Deploy + privacidad | **B6** Deploy final en Render con env completo (DB_* Supabase, `JWT_SECRET`, `SUPABASE_*`, `FACE_BUCKET=faces`). **Verificar rehidratación tras cold start** (esperar spin-down → la primera marcaje debe funcionar) y medir el cold start con el modelo cargado. Documentar `SUPABASE_*` y `FACE_BUCKET` en `docs/entornos.md` · *Necesita: B5* | **R6** Apuntar el móvil a Render (`EXPO_PUBLIC_API_URL`) + `npx expo export` verde. Cámara en dispositivo real: permisos, flash, errores claros. **Consentimiento:** texto breve + checkbox obligatorio antes de capturar ("autorizas el uso de tu imagen para control de asistencia", Ley 26935 Bolivia) · *Necesita: R5* | **M6** QA web en producción (Vercel) + responsive. Verificar que ninguna pantalla exponga `facePhoto` como URL pública (bucket `faces` es privado → solo signed URLs) · *Necesita: M5* |
| **7** Lun 05/10<br>Endurecer + documentar | **B7** `docs/api.md` (5 rutas nuevas) y `docs/arquitectura.md` (módulo `attendance` completo + modelo de reconocimiento sin detector). Tests verdes, `lint`+`build` · *Necesita: B6* | **R7** UX: pulido de las 3 pantallas nuevas, estados de carga/error, permitir repetir la captura. **Sincronizar `RootStackParamList`** con las rutas reales del drawer (hoy faltan `SalesHistory`, `SearchByImage`, `Inventario`). `tsc --noEmit` + `expo export` verdes · *Necesita: R6* | **M7** **README raíz** al día. `lint`+`build` · *Necesita: M6* |
| **8** Mar 06/10<br>Demo y cierre | **B8** Bugfixes acumulados, dejar Render desplegado y despierto, tag de release · *Necesita: B7* | **R8** Guión + video demo móvil: etiqueta → scan → producto; registro → marcaje → **nombre + hora** · *Necesita: R7* | **M8** Demo web (etiquetas, personal, asistencia, dashboard) · Definición de Terminado (build + lint en los 3 módulos) · merge a `main` · *Necesita: B8, R8* |

> ⚠️ **Calibración del umbral (tarea de B4).** `UMBRAL_CONFIANZA_FACIAL = 0.55` quedó definido para el scoring de InsightFace. Con **similitud coseno sobre embeddings ArcFace normalizados** el rango típico de "misma persona" es **0.28–0.45**. Con 0.55 fijo el sistema daría falsos negativos. Medir con los rostros de R5 y ajustar la constante en `common/constants.ts` antes de la demo.

---

## Ruta crítica

- **Flujo A (entrega 29/09):** `B1 → R1` (endpoint en Render + escáner) · `M1` en paralelo, cierra la parte web.
- **Flujo B:** `B2 (spike) → B3 → B4 → R4 → B7` — el spike del día 2 bloquea toda la cadena; si el ArcFace no entra en 512 MB, el fallback es MobileFaceNet (~13 MB) sin cambiar el resto del código.
- **Integración web:** `B3 → M3` (personal) y `B4 → M4` (historial).
- **Demo:** `B6` (cold start medido) y `R6` (móvil contra Render) son la última chance de aplicar el plan B local WiFi.

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
| POST | `/api/users/face/register` | `multipart`: `nombre`, `apellido`, `fotos[]`. Asocia el rostro a un `users` existente |
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
- **Supabase free tier** pausa el proyecto a los 7 días sin actividad → ping diario por GitHub Actions (tarea R1).
- **Calidad de impresión:** al ser una etiqueta **solo de barras**, la barra es la única lectura → `scale: 3`, `height: 12` mm, zona de silencio de 10 módulos, papel mate y buena luz. Si aun así el celular no la lee, el plan B es cambiar `bcid` a `'qrcode'` (QR se lee mucho mejor en tamaños pequeños) (tarea M2).
- **Iluminación y ángulo en el rostro:** es el mayor riesgo del hito. Mitigación: N fotos por registro, guía oval en la captura, y confirmación humana cuando la confianza es baja (nunca un error seco).
- **Solapamiento de nombres:** dos personas con el mismo nombre completo no se pueden distinguir en el formulario → mostrar siempre `email`/`rol` en la pantalla de confirmación para que el operador elija bien.
- **Privacidad (Ley 26935 Bolivia):** datos biométricos son sensibles. Mínimo obligatorio: consentimiento explícito, bucket `faces` privado con URLs firmadas, derecho de baja (`activo=false` + eliminar `embedding`) y **cero logs de imágenes**.
- **Depende del registro previo:** la asistencia solo reconoce personal ya registrado; hay que registrar los rostros de prueba antes de la demo.

## Fuera de alcance en este hito

Detección/alineación de rostros con modelo detector · FastAPI como servicio aparte · sincronización de foto de perfil · re-entrenamiento o dataset propio · RLS en Supabase (el backend usa `service_role`) · app web de cámara en vivo (el registro facial es móvil).
