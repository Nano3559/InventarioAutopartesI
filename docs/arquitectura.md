# Arquitectura

Vista de alto nivel del sistema: componentes, modelo de datos, módulos del backend,
autenticación/RBAC y los flujos de negocio críticos.

## 1. Diagrama de componentes

```
                         ┌──────────────────────────────┐
                         │       PostgreSQL (Render)    │
                         │      base: AutopartesDB       │
                         └──────────────▲────────────────┘
                                        │ TypeORM (autoLoadEntities)
   ┌──────────────┐       ┌─────────────┴───────────────┐
   │  Frontend    │  HTTP │          Backend NestJS     │   ┌────────────────────┐
   │  React+Vite  │──────►│  /api/* · JWT · RBAC · CORS │──►│ Supabase (imágenes)│
   │  (Vercel)    │       │  módulos por dominio         │   └────────────────────┘
   └──────────────┘       └─────────────▲────────────────┘
   ┌──────────────┐                     │ Bearer JWT
   │     Mobile   │─────────────────────┘
   │  Expo / RN   │
   └──────────────┘
```

- **Backend** expone REST bajo `/api` en el puerto 3000.
- **Frontend** y **Mobile** consumen la misma API; el rol define qué pantallas y
  endpoints se usan.
- **Imágenes** de producto: se guardan en el FS (`/uploads`, servidas estáticamente)
  y se suben a **Supabase** vía `sharp` (hash) en `backend/src/common/image-hash.ts`.
- **IA (Hito 3):** el reconocimiento facial corre **dentro del mismo proceso Node**
  (`onnxruntime-node`, §3.2) — no hay un servicio de inferencia aparte. Las fotos de
  rostro van a un bucket **privado** de Supabase y solo se muestran con URL firmada.

## 2. Modelo de datos (15 entidades TypeORM)

| Entidad | Tabla | Propósito |
| :--- | :--- | :--- |
| `User` | `users` | Usuarios con `rol` (admin/tienda/inventario) + FK `tienda` + Hito 3: `embedding`, `facePhoto`, `faceRegisteredAt`, `activo` (registro facial) |
| `Location` | `locations` | 7 ubicaciones: 4 almacenes + 3 tiendas (`tipo`, `codigo`) |
| `Product` | `products` | Catálogo: fabricante, marca, modelo, años, OEM, fábrica, código de barras (`codigo`, Hito 3), precios, costo, stock mínimo |
| `Inventory` | `inventory` | Stock por producto + ubicación (UNIQUE product+location) |
| `Cliente` | `clientes` | Datos de factura (ciNit, nombre, celular) |
| `Sale` / `SaleItem` | `sales` / `sale_items` | Cabecera + líneas de venta (tipo menor/mayor) |
| `Payment` | `payments` | Pagos multi-método: efectivo, transferencia, qr, crédito |
| `Movimiento` | `movimientos` | Traslados entre ubicaciones (origen, destino, usuario, observación) + Hito 3: `cantidadDeclarada` y `tipo` (`traslado`\|`entrada`) |
| `Solicitud` | `solicitudes` | Pedidos tienda→almacén con estados + flag `auto` (reposición) |
| `Proveedor` | `proveedores` | Proveedor Bolivia (para costos) |
| `Factura` / `FacturaItem` | `facturas` / `factura_items` | Facturas de compra: tipo cambio, %, monto, archivo e ítems |
| `Devolucion` | `devoluciones` | Devoluciones (motivo, cantidad, monto, método) |
| `Asistencia` | `asistencia` | Hito 3: marcaje de asistencia por reconocimiento facial (usuario, fecha, tipo `entrada`\|`salida`, `confianza`, `metodo`, tienda, quién confirmó) |

> `schema.sql` es el esquema PostgreSQL de referencia. **Nota:** no define
> `factura_items` aunque la entidad `FacturaItem` sí existe.
>
> `sql/hito3.sql` es el DDL ejecutable e idempotente del Hito 3 (tabla `asistencia`
> + campos faciales en `users` + `products.codigo`). Aplícalo con el SQL Editor de
> Supabase o con `psql`; en dev `DB_SYNC=true` ya lo replica desde las entidades.

## 3. Módulos NestJS

`auth` · `users` · `products` · `locations` · `sales` · `movimientos` ·
`solicitudes` · `proveedores` · `costos` · `devoluciones` · `precios` · `reportes` ·
`attendance` · `face` (los dos últimos son del Hito 3).

### 3.1 Módulos del Hito 3

| Módulo | Entidades | Rutas | Acceso |
| :--- | :--- | :--- | :--- |
| `attendance` | `Asistencia`, `User`, `Location` | `GET /attendance`, `GET /attendance/dashboard`, `POST /attendance/check`, `POST /attendance/:id/confirm`, `PATCH /attendance/:id` | `admin` (`@Roles` de clase) |
| `face` | `User` | `GET /face/status`, `POST /face/warmup` | `admin` (`@Roles` de clase) |
| `users` (parcial) | `User` | `POST /users/face/register`, `GET /users/rostros`, y `PATCH /users/:id` con `eliminarEmbedding` | `admin` (`@Roles` de clase) |
| `products` (parcial) | `Product` | `GET /products/by-barcode/:codigo`, `GET /products/:id/barcode`, `POST /products/barcode/generate-all` | lectura: los 3 roles · `generate-all`: `admin` |

| Archivo | Responsabilidad |
| :--- | :--- |
| `src/face/face.service.ts` | ArcFace int8 **in-process**: sesión perezosa, preprocesado 112×112, índice de rostros en RAM, fotos al bucket privado, diagnóstico |
| `src/face/face-embedding.ts` | Aritmética **pura** (`normalizar`, `promediarYNormalizar`, `similitudCoseno`, `aTensorNchw`): se testea en Jest sin descargar los 63 MB del modelo |
| `src/face/face.controller.ts` | Las 2 rutas de diagnóstico (`status`, `warmup`) |
| `src/attendance/attendance.service.ts` | Historial, dashboard, marcaje (automático y manual), corrección |
| `src/entities/asistencia.entity.ts` | Tabla `asistencia` + sus 2 índices |

`FaceModule` exporta `FaceService` y `AttendanceModule` lo importa: **el módulo de asistencia
nunca habla con ONNX**, solo pide *embeddings* y *candidatos*. Así el modelo se puede cambiar
sin tocar las reglas de negocio. Los dos módulos están declarados en `app.module.ts`.

Infraestructura compartida:

| Archivo | Responsabilidad |
| :--- | :--- |
| `src/common/constants.ts` | `UserRole`, `METODOS_PAGO`, `ESTADOS_SOLICITUD`, `PORCENTAJES` + Hito 3: `TIPOS_ASISTENCIA`, `METODOS_ASISTENCIA`, `UMBRAL_CONFIANZA_FACIAL`, `FOTOS_*_REGISTRO` |
| `src/common/image-hash.ts` | `computeHash` + `generatePlaceholderImage` (sharp + Supabase) |
| `src/common/image-upload.ts` | `multerImagenes()` + `imageFileFilter`: `FileInterceptor` con `memoryStorage`, filtro `image/*` y tope de 10 MB (producto, rostro) |
| `src/auth/jwt-auth.guard.ts` + `roles.guard.ts` | Guard global de JWT + RBAC |

### 3.2 Reconocimiento facial: ArcFace in-process, **sin modelo detector**

Un solo proceso de Node hace **todo**: no hay microservicio Python/FastAPI, ni cliente HTTP,
ni `FACE_SERVICE_URL` / `FACE_API_KEY`. Motivo práctico: en Render Free (512 MB, 750 h/mes)
un 2º servicio no cabe cómodo y agrega un 2º cold start.

```
  📱 App móvil                        🧠 NestJS (un solo proceso)                  🗄️ Postgres
  ─────────────                       ───────────────────────────                  ─────────
  FaceRegisterScreen                  POST /users/face/register
  N fotos, guía oval  ──multipart───► FaceService.preprocesar (sharp: EXIF, 112×112,
                                         (x-127.5)/128 → tensor [1,3,112,112])
                                       └─ onnxruntime-node · EP cpu · sesión perezosa
                                          ArcFace int8 (63 MB) → fc1 [1,512]
                                          ─► promedio de las N ─► normalización L2
                                                                     │
                                       └─ sube 1 foto ─────────────►│ users.embedding (jsonb, 2 KB)
                                         bucket PRIVADO `faces`     │ users.facePhoto = "user-3.jpg"
                                         (upsert, nombre estable)   │ users.faceRegisteredAt
                                                                     │
                                       └─ upsertEnIndice() → índice en RAM ◄┘

  AttendanceScreen
  1 foto en vivo      ──multipart───► POST /attendance/check
                                         └─ embedding de la foto
                                         └─ FaceService.buscar() → top-5 por coseno
≥ 0.8 → INSERT asistencia (metodo 'automatico')
                                              < 0.8 → 200 "usuario desconocido", SIN insertar
                                                     (sin candidatos: privacidad, Ley 26935)
```

| Decisión | Por qué |
| :--- | :--- |
| **ArcFace ONNX int8** (`onnxmodelzoo/arcfaceresnet100-11-int8`, Apache-2.0) | Apache-2.0 evita el problema legal de InsightFace ("solo investigación"); int8 (63 MB) entra en la RAM de Render; 99.8% en LFW. Backup MobileFaceNet (~13 MB) **descartado**: entra de sobra |
| **Ninguna sesión en `onModuleInit` para el modelo** | La `InferenceSession` se crea en la primera inferencia: son 92 MB y ~0.5 s que no se pagan en cada arranque (incluidos los spin-down de Render) si nadie marca asistencia. El **índice sí** se rehidrata al arrancar (ver abajo) |
| **Índice de rostros en RAM** (`usuarioId → embedding` normalizado) | Los embeddings se guardan normalizados (L2), así que la similitud coseno es un simple producto punto de 512 floats por usuario: sin RAM, cada marcaje sería una consulta con `jsonb` a Postgres. Coste: ~2 KB por rostro |
| **Rehidratación en `onModuleInit`** (`embedding IS NOT NULL AND activo = true`) | **Obligatoria**: Render borra la RAM en cada spin-down de 15 min. Sin esto, el primer marcaje después de dormir no reconocería a nadie. Verificable con `GET /face/status` (`indiceEnMemoria === rostrosEnBase`) |
| **Umbral por similitud coseno = 0.8 (estricto)** | El 0.55 venía del scoring de InsightFace; con coseno sobre embeddings ArcFace normalizados el rango típico de "misma persona" es **0.28-0.45**. El negocio exige no registrar a nadie que no esté seguro: 0.8 por defecto y **configurable** con la env `UMBRAL_CONFIANZA_FACIAL` (0<v≤1). Quien no llega → "usuario desconocido" sin candidatos |
| **Alineación con SCRFD antes de ArcFace** (pendiente en backend) | ArcFace se entrenó con caras **alineadas**; el `resize(112,112,fit:'cover')` actual no alinea y por eso no distinguía quién es quién (coseno "misma persona" 0.28–0.45 → umbral 0.8 inalcanzable). SCRFD (detector de una etapa, como YOLO, Apache-2.0) entrega caja + **5 landmarks**; el warp a la plantilla ArcFace 112×112 sube el coseno del mismo rostro a ~0.5–0.85. Verificado en el spike Python; **portar a `FaceService` y re-registrar** |
| **1 embedding por marcaje, N por registro** | Con EP de CPU no hay paralelismo real y el error de una foto no se pierde en un `Promise.all`. Medido: 246.8 ms por embedding (spike B2), ~1.2 s una tanda de 5 |
| **Bucket `faces` privado + URL firmada** | Dato biométrico sensible (Ley 26935 Bolivia). `users.facePhoto` guarda la **ruta**, no una URL: las firmadas expiran y se piden al momento (`GET /users/rostros`). Cero logs de imágenes |

Medidas del spike B2 (`npm run spike:arcface`, i7-5500U 2.4 GHz, CPU EP) y de Render (B6):

| Métrica | Local | Render (Free) |
| :--- | :--- | :--- |
| Overhead del proceso Node con ORT | **125.9 MB** (73.4 base → 92.5 modelo → 27 arenas) | Cabe en los 512 MB del plan free |
| Latencia por embedding | 246.8 ms (p50 233.2 · p95 367.6) → 4.1/s | — |
| Carga de la `InferenceSession` | 561 ms | 2.2 s en frío |
| Cold start del plan free (1ª request tras apagado) | — | **52.7 s** (hay que despertar Render antes de la demo) |
| Tamaño por embedding guardado | 2 KB (512 floats en `jsonb`) | idem |

Trampas del módulo (ver también la tabla de `Plan Hito 3.md`):

- **`onnxruntime-node` no corre dentro de Jest**: su binding valida los typed arrays con
  `instanceof Float32Array` de su propio realm y el sandbox usa otro → *toda* inferencia muere
  con `A float32 tensor's data must be type of function Float32Array()`. El contrato real del
  modelo se verifica con `npm run face:check`, y los e2e usan un doble de `FaceService`.
- Por lo mismo, `preprocesar()` pasa `Array.from(tensor)` (un `number[]`) al `ort.Tensor` en
  vez del `Float32Array`: son 37 632 números, despreciable frente a los ~350 ms de inferencia.
- `leftJoinAndSelect('a.usuario', 'u')` filtra **todas** las columnas de `users`, incluido
  `password` y `embedding`. Para joins de solo lectura: `leftJoin(...)` + `addSelect([...])`
  con las columnas explícitas.
- El modelo (63 MB) **no se versiona**; `prestart:prod` → `scripts/ensure-arcface-model.mjs`
  lo baja en el arranque (idempotente, valida tamaño, y si falla la red avisa sin tumbar la API).
- Los **filtros de `users` en el índice** son `embedding IS NOT NULL AND activo = true`: un
  embedding corrupto (otra dimensión o `NaN`) se salta con warning en vez de romper la búsqueda.

## 4. Autenticación y RBAC

1. `POST /api/auth/login` valida credenciales (bcrypt) y devuelve un **JWT** (8h).
2. Cada request web/móvil envía `Authorization: Bearer <token>`.
3. `GET /api/auth/me` restaura la sesión al reabrir la app/sitio.
4. `@Roles('admin', ...)` + `RolesGuard` restringen endpoints; `ProtectedRoute`
   (web) y drawer por rol (móvil) restringen la UI.

Roles:

| Rol | Alcance |
| :--- | :--- |
| `admin` | Todo: inventario, precios, costos, venta mayor, reportes, movimientos, asistencia |
| `tienda` | Vender, devolver, solicitar a almacén, consultar stock/reportes de su tienda |
| `inventario` | Solicitudes, movimientos/traslados, control físico de stock |

La asistencia (`attendance`), el reconocimiento facial (`face`) y la gestión de personal
(`users`) son **exclusivos de `admin`**: son datos de personal y de biometría (Ley 26935
Bolivia). El escáner de códigos de barras sí está en los tres roles, porque el rol
`inventario` no tiene POS y lo necesita para consultar stock.

## 5. Flujos de negocio críticos

### Venta (tienda)
`Buscar producto → agregar al carrito (cantidad/precio) → resumen (subtotal= c×p) → pagos multi-método → ¿factura? (CI/NIT, nombre, celular) → POST /sales → si stock llega a 0 → solicitud automática al almacén`

Se usa `solicitudes` con flag `auto: true` para la reposición automática
(regla: stock mínimo = 1).

### Movimiento (almacén ↔ tienda)
`Origen → cantidad → destino → responsable → observación → POST /movimientos` y la
tabla `inventory` se actualiza en ambas ubicaciones.

### Solicitud de reposición
`Tienda sin stock → POST /solicitudes (Pendiente) → inventario la procesa:
En preparación → Enviado → Recibido`.

### Venta por mayor
`Opción A (manual) u Opción B (import Excel → preview → confirmar)` validando stock
disponible antes de confirmar. Genera nota de venta imprimible.

### Código de barras → producto (Hito 3, Flujo A)

```
seed / POST /products/barcode/generate-all
   → products.codigo = "AP-<id>-<codigoFabrica>"   (Code128, 100% ASCII, único por id)
GET /products/:id/barcode → PNG Code128 SOLO barras (includetext: false, scale 3, height 12)
   → se imprime la etiqueta
ScannerScreen (cámara del celular, multiscan) → GET /products/by-barcode/:codigo
   → ficha: nombre, código, precio, stock total + por tienda, imagen   (activo = true)
```

El `id` garantiza unicidad aunque dos productos compartan código de fábrica, y el contenido
se puede consultar en la BD (columna `codigo`, columna "Código de barras" en la web). El
escáner es **solo de consulta**: armar el carrito del POS quedó como tarea pendiente con el
diseño ya decidido (botón + cámara en modal). Ver §3.2 para el lado de IA del hito y
`docs/api.md` §Products para el contrato de las 3 rutas.

### Registro facial → marcaje (Hito 3, Flujo B)

```
UNA VEZ POR PERSONA
FaceRegisterScreen (consentimiento + lista de personal sin rostro → `usuarioId`,
                    o nombre + apellido a mano, + N fotos, guía oval)
  → POST /users/face/register
  → con `usuarioId` resuelve el id directo (gana sobre nombre; 404 si no existe)
     sin `usuarioId`, busca el users por nombre + apellido   404 si no existe · 409 si hay homónimos o baja
  → N embeddings ArcFace → promedio + L2 → users.embedding
  → 1 foto al bucket privado `faces` → users.facePhoto (ruta) · índice en RAM

CADA DÍA
AttendanceScreen (1 foto en vivo)
  → POST /attendance/check
  → embedding → similitud coseno contra el índice en RAM
      ≥ 0.8 → INSERT asistencia: metodo 'automatico', confianza = similitud,
               tipo alternado (1ª del día entrada, 2ª salida)
      < 0.8 → 200 "usuario desconocido" SIN insertar, candidatos: [] (nunca un error seco)
  → el operador registra a mano solo si conoce a la persona → POST /attendance/check con
     usuarioId (metodo 'manual'), o POST /attendance/:id/confirm sobre un marcaje existente
AttendanceHistoryScreen / dashboard web → GET /attendance y GET /attendance/dashboard
```

El registro **asocia un rostro a un `users` que ya existe**: no crea personal (el
requerimiento dice "conforme a la base de datos"). La baja de un empleado es
`activo = false` (bloquea el login con `401`) o `eliminarEmbedding` (además borra embedding,
foto e índice). Detalle de campos, respuestas y errores en `docs/api.md` §Attendance.

## 6. Frontend (estructura de capas)

```
src/
├── api/         cliente fetch genérico (client.ts) + wrappers por dominio
├── services/    lógica de dominio sobre la API (products, sales, reportes, ...)
├── context/     AuthContext (JWT+localStorage), NotificationContext
├── routes/      ProtectedRoute + tabla de rutas por rol
├── layouts/     MainLayout, Sidebar (por rol), Navbar
├── pages/       vistas por área (inventory, ventas, costos, precios, reportes...)
├── components/  micro-componentes por dominio (modales, tablas, tarjetas)
└── styles/      CSS plano por pantalla (sin framework)
```

## 7. Móvil (estructura)

```
src/
├── api/          el mismo modelo que web: client.ts + moles por dominio
├── context/      AuthContext (restaura sesión vía /auth/me)
├── storage/      SecureStore (nativo) / localStorage (web)
├── screens/      Login, dashboards por rol, Venta (POS), Venta Mayor, Inventario,
│                 Producto, Historial, Ventas, Devoluciones, Solicitudes, Reportes,
│                 Búsqueda por imagen, Escáner, Registro facial, Marcaje, Historial asistencia
├── components/   AppDrawer (menu por rol), StatCard, Badge, Header, FaceCamera...
└── theme.ts      design tokens (paletas light/dark, tipografía, espaciado)
```

Navegación: **native-stack** raíz (`Login` → `Main` + modales `SalesEdit`,
`ProductDetail`) y **drawer** interno según rol.

Pantallas del Hito 3 y quién las ve:

| Pantalla | Rol | Qué hace |
| :--- | :--- | :--- |
| `ScannerScreen` | `admin`, `tienda`, `inventario` | Lee un Code128 con la cámara (multiscan, dedup 2.5 s) y muestra la ficha del producto. **Solo consulta** |
| `FaceRegisterScreen` | `admin` | Consentimiento (Ley 26935) + nombre/apellido + N fotos del rostro |
| `AttendanceScreen` | `admin` | Foto en vivo → marcaje → nombre completo + hora + tienda; si no reconoce, aviso "usuario desconocido, debe registrarse" (no hay selección manual) |
| `AttendanceHistoryScreen` | `admin` | Historial con hora, método y confianza |
| `components/FaceCamera` | (compartida) | Cámara + linterna + permisos + guía oval 112×112; la usan registro y marcaje |

> `SalesScreen` y `ScannerScreen` son pantallas **hermanas** del drawer, no una pila: por eso
> el escaneo desde el POS (tarea pendiente) va a ser un **modal** sobre el POS, no navegación.

## 8. Decisiones relevantes

- El **stock total** de un producto = suma de `inventory` en las 7 ubicaciones; el admin
  consulta el detalle por ubicación.
- **Sin Swagger**: documentación de endpoints en `api.md`.
- `DB_SYNC=true` solo en dev; en producción migraciones controladas y `ssl.rejectUnauthorized=false`.
- Mobile y web comparten la URL del backend: base sin `/api` en móvil (se agrega en el cliente).
- **La hora del marcaje es la del servidor**, no la del celular: el móvil manda la foto y nada
  más, así que un reloj desincronizado no puede falsear la asistencia.
- **El día del dashboard es el día local**, no UTC: `new Date('2026-10-03')` es medianoche UTC
  y en Bolivia (UTC-4) caería en el día anterior. Se arma con `new Date(y, m-1, d)`.
- **Umbral facial 0.8 (estricto) por similitud coseno**, configurable con la env
  `UMBRAL_CONFIANZA_FACIAL` (0<v≤1). Por debajo → "usuario desconocido", sin candidatos (ver §3.2).
- **ArcFace necesita caras alineadas** (ver §3.2): el fix SCRFD + warp ya está probado en el
  spike `backend/spike/python/reconocer_rostro.py`; falta portarlo al backend para que la app
  reconozca de verdad y el 0.8 sea alcanzable.
- **El marcaje manual solo existe vía `usuarioId`**: por debajo del umbral el automático no
  inserta nada ni filtra candidatos (privacidad, Ley 26935); el operador solo puede registrar
  si conoce a la persona y la indica explícitamente. Un marcaje incorrecto se corrige con
  `PATCH /attendance/:id`, que deja rastro de quién lo confirmó.
- **Los datos del usuario salen por columnas explícitas** en toda respuesta con join: nunca
  `password` ni `embedding`.