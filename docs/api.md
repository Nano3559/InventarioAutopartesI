# API Reference

Backend NestJS expuesto bajo el prefijo global **`/api`** (puerto 3000 en local).
Todos los endpoints requieren `Authorization: Bearer <JWT>` salvo los marcados con `+ público`.
La autorización por rol (`admin` / `tienda` / `inventario`) se aplica vía `@Roles` + `RolesGuard`.

Base local: `http://localhost:3000/api` — Producción: `https://inventarioautopartesi.onrender.com/api`

> Mantener este documento al día: si cambia una ruta, actualízalo en el mismo commit.
> Descripción de flujos y entidades en [arquitectura.md](arquitectura.md).

## Auth

| Método | Ruta | Descripción | Acceso |
| :--- | :--- | :--- | :--- |
| POST | `/auth/login` | Login, devuelve JWT | + público |
| GET | `/auth/me` | Restaura la sesión del token actual | Autenticado |

## Users

Solo rol `admin` (el `@Roles('admin')` es de clase, así que también cubre las rutas
de rostro).

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| GET | `/users` | Listar usuarios (sin `password` ni `embedding`) |
| GET | `/users/rostros` | Personal con rostro registrado, con **URL firmada** de la foto |
| POST | `/users/face/register` | **Registro facial** (multipart `usuarioId` **o** `nombre` + `apellido`, más `fotos`) |
| POST | `/users` | Crear usuario |
| PATCH | `/users/:id` | Actualizar usuario |
| DELETE | `/users/:id` | Eliminar usuario |

**`POST /users/face/register`** —asocia un rostro a un `users` **que ya existe**: no crea
personal (el requerimiento dice "conforme a la base de datos").

Hay dos formas de apuntar al usuario, y **`usuarioId` gana** si vienen las dos:

| Campo | Notas |
| :--- | :--- |
| `usuarioId` | El id del usuario elegido de la lista de personal. **Recomendado**: un id no tiene homónimos ni se puede escribir mal, e ignora `nombre`/`apellido` |
| `nombre` | Formulario a mano. Texto, mínimo 2 caracteres. Se busca sin distinguir mayúsculas |
| `apellido` | Formulario a mano. Texto, mínimo 2 caracteres |
| `fotos` | 1 a 10 imágenes (`image/*`, 10 MB c/u), repitiendo el campo `fotos` por cada archivo: el nombre del campo es **`fotos`**, no `fotos[]` (multer rechaza cualquier otro). Se recomiendan 5 |

| Situación | Respuesta |
| :--- | :--- |
| `usuarioId` inexistente | **404** con ese id (el id no se busca por nombre: no intenta resolver nada) |
| `usuarioId` que no es un número | **400** |
| Sin `usuarioId` y nadie con ese nombre + apellido | **404** con el nombre buscado |
| Sin `usuarioId` y más de un usuario con ese nombre | **409** con `candidatos` (`id`, `nombreCompleto`, `email`, `rol`, `tieneRostro`, `activo`) para que el operador elija |
| Usuario con `activo = false` | **409**: está dado de baja |
| Sin fotos / más de 10 / nombre muy corto | **400** (se valida antes de resolver al usuario) |
| Bucket `faces` inexistente o sin `SUPABASE_*` | **400** con el motivo (no se guarda el embedding) |

Devuelve `{ id, nombre, apellido, nombreCompleto, email, rol, faceRegisteredAt,
facePhoto, fotoUrl, fotosRegistradas, embeddingDimension: 512, reconoce, avisos[] }`.
`facePhoto` es la **ruta** del objeto en el bucket, no una URL: `fotoUrl` es la URL firmada
que expira en 1 h. `avisos` avisa si se registraron menos de 5 fotos, si el nombre
coincidió solo parcialmente o si se reemplazó un rostro anterior.

Flujo: recorta cada foto a 112×112 `(x-127.5)/128`, corre ArcFace int8
(`onnxruntime-node`, in-process), **promedia y normaliza** los N embeddings a
`users.embedding`, sube **1** foto a `faces` y actualiza el índice en memoria.

**`PATCH /users/:id`** acepta además `apellido`, `activo` y `eliminarEmbedding: true`
(derecho de baja biométrico: borra `embedding`, `facePhoto`, la foto del bucket y saca al
usuario del índice). Un `activo: false` **impide el login** (`401`).

> ⚠️ El bucket **`faces`** tiene que existir en Supabase Storage (privado, policies solo
> `service_role`). Sin él el registro responde 400 y no guarda nada.

## Products

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| GET | `/products` | Listar/filtrar catálogo (admite `?codigo=` y `?search=`) |
| GET | `/products/by-barcode/:codigo` | Buscar producto por código de barras (solo `activo = true`). **Declarada antes de `:id`** |
| GET | `/products/:id` | Detalle de producto |
| GET | `/products/:id/stock` | Stock del producto por ubicación |
| GET | `/products/:id/barcode` | Etiqueta PNG Code128 (`AP-<id>-<codigoFabrica>`); persiste `codigo` si era NULL |
| POST | `/products/barcode/generate-all` | Generar los códigos de barras de todo el catálogo sin etiquetar (**solo admin**) |
| POST | `/products` | Crear producto |
| PATCH | `/products/:id` | Actualizar producto |
| DELETE | `/products/:id` | Eliminar producto |
| POST | `/products/search-by-image` | Búsqueda de producto por imagen (multipart, campo `file`, `image/*` ≤ 10 MB) |
| POST | `/products/:id/image` | Subir imagen de producto (multipart, campo `file`, multer + sharp + Supabase) |
| PATCH | `/products/:id/stock` | Ajustar stock |
| PATCH | `/products/:id/toggle-active` | Activar/desactivar producto |

## Locations

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| GET | `/locations` | Listar ubicaciones (4 almacenes + 3 tiendas) |

## Sales

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| GET | `/sales` | Listar ventas (con filtros/paginado) |
| GET | `/sales/:id` | Detalle de venta |
| GET | `/sales/:id/nota` | Nota de venta (texto/HTML) |
| POST | `/sales` | Registrar venta (ítems + pagos + factura) |
| PATCH | `/sales/:id` | Editar venta |
| POST | `/sales/import-mayor/preview` | Venta mayor: validar/importar Excel (preview) |
| POST | `/sales/import-mayor` | Venta mayor: confirmar importación Excel |

## Movimientos

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| GET | `/movimientos` | Historial de movimientos entre ubicaciones |
| POST | `/movimientos` | Registrar traslado (origen → destino, cantidad, responsable) |

> Ver también la sección [Hito 3 — códigos de barras y conteo por lotes](#hito-3--códigos-de-barras-y-conteo-por-lotes)
> para el futuro `POST /movimientos/entrada/count` (aún sin implementar).

## Solicitudes

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| GET | `/solicitudes` | Listar solicitudes de reposición |
| POST | `/solicitudes` | Crear solicitud (tienda sin stock) |
| PATCH | `/solicitudes/:id/estado` | Cambiar estado (Pendiente/En preparación/Enviado/Recibido/Cancelado) |

## Proveedores

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| GET | `/proveedores` | Listar proveedores |
| GET | `/proveedores/:id` | Detalle de proveedor |
| POST | `/proveedores` | Crear proveedor |
| PATCH | `/proveedores/:id` | Actualizar proveedor |
| DELETE | `/proveedores/:id` | Eliminar proveedor |

## Costos

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| GET | `/costos/facturas` | Listar facturas de compra |
| GET | `/costos/facturas/:id` | Detalle de factura |
| POST | `/costos/facturas` | Subir factura (multipart: archivo + ítems) |
| DELETE | `/costos/facturas/:id` | Eliminar factura |

## Devoluciones

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| GET | `/devoluciones` | Listar devoluciones |
| GET | `/devoluciones/sales` | Ventas elegibles para devolución |
| POST | `/devoluciones` | Registrar devolución (motivo, cantidad, monto, método) |

## Precios

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| GET | `/precios` | Lista de precios (costo + % 20..80 + mayor) con filtros |
| GET | `/precios/export` | Exportar lista de precios a Excel |
| PATCH | `/precios/:id` | Actualizar precio (incluye precio mayor manual) |

## Reportes

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| GET | `/reportes/dashboard` | KPIs resumen (inventario, ventas, solicitudes) |
| GET | `/reportes/ventas` | Ventas con filtros (marca, modelo, mes, tienda, proveedor, producto) |
| GET | `/reportes/mensual` | Reporte mensual por tienda (con costo) |
| GET | `/reportes/proveedores` | Compras por proveedor |

## Attendance

Las 5 rutas del Hito 3 que escriben o leen la tabla `asistencia`. Todas exigen **`admin`**
(el `@Roles('admin')` es de clase) y `JwtAuthGuard` + `RolesGuard`. El reconocimiento por
rostro ocurre **dentro de este mismo proceso** (ArcFace in-process, ver
[arquitectura.md](arquitectura.md) §3.2); `/face` solo expone diagnóstico y la foto de
registro se sube por `POST /users/face/register` ([Users](#users)).

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| GET | `/attendance` | Historial paginado con filtros (ver abajo) |
| GET | `/attendance/dashboard` | Presentes/ausentes por tienda para un día (ver abajo) |
| POST | `/attendance/check` | Marcaje por rostro (multipart `foto`) |
| POST | `/attendance/:id/confirm` | Pasa un marcaje existente a `metodo: 'manual'` |
| PATCH | `/attendance/:id` | Corregir un marcaje: `usuarioId`, `locationId`, `fecha`, `tipo`, `metodo`, `confianza`, `confirmadoPorId` |

> ℹ️ **Aquí no hay la trampa de orden de rutas** que sí existe en [Products](#products)
> (`by-barcode/:codigo` antes de `:id`): el controller no expone un `@Get(':id')`, y
> `@Post('check')` (1 segmento) nunca puede chocar con `@Post(':id/confirm')` (2 segmentos).
> Aun así el orden es fijo (`check` primero) para no romperlo si mañana se agrega un `:id` suelto.

**`GET /attendance`** — query params:

| Param | Default | Notas |
| :--- | :--- | :--- |
| `page` | `1` | Entero positivo |
| `limit` | `25` | Entero positivo, tope 200 |
| `usuarioId` | — | Filtra por persona |
| `locationId` | — | Filtra por tienda |
| `tipo` | — | `entrada` \| `salida` |
| `metodo` | — | `automatico` \| `manual` |
| `desde` / `hasta` | — | `YYYY-MM-DD` (se toma el día entero) o ISO completo. `hasta` incluye las 23:59:59 |
| `search` | — | `nombre`, `apellido` o `email` del usuario |

Responde `{ data, total, page, limit, pages }`, ordenado por `fecha` descendente. Cada fila trae
`nombreCompleto` ya armado. Los datos del usuario se seleccionan **columna por columna**: la
respuesta nunca incluye `users.password` ni `users.embedding`.

**`PATCH /attendance/:id`** — corrige un marcaje. Body `application/json`, todos los campos
opcionales (lo que no se manda no se toca):

| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `usuarioId` | number | Reasigna a otra persona. Debe existir → si no, `404` |
| `locationId` | number \| null | Reasigna la tienda. `null` la borra; debe existir si no es `null` |
| `fecha` | ISO | Corrige la hora del marcaje. Formato inválido → `400` |
| `tipo` | `entrada` \| `salida` | Valor fuera del catálogo → `400` |
| `metodo` | `automatico` \| `manual` | Valor fuera del catálogo → `400` |
| `confianza` | number (0-1) \| null | Fuera de rango o `NaN` → `400` |
| `confirmadoPorId` | number \| null | Quién confirmó. Debe existir si no es `null` |

Al dejar `metodo: 'manual'` el servicio anula `confianza` (un marcaje manual no viene del
reconocimiento de `POST /attendance/check`, no hay similitud que reportar) y, si no se pasó
`confirmadoPorId`, sella al admin que editó. Los ids y los catálogos se validan **antes** de
tocar la BD: así un tipo inválido con un id inexistente devuelve `400` y no el `500` de un
`existsBy()` sobre datos ya modificados en memoria. Marcaje inexistente → `404`.
Devuelve la fila ya presentada (igual shape que `GET /attendance`).

### `POST /attendance/:id/confirm`

Sin body. Es el camino corto de "el modelo no reconoce a nadie, pero el operador ya sabe de
quién es la foto" **cuando el marcaje ya existe**: pasa la fila a `metodo: 'manual'`, anula
`confianza` y sella `confirmadoPorId` con el admin que llama.

Devuelve la fila actualizada (mismo shape que `GET /attendance`). Marcaje inexistente → `404`.
No reescribe `usuarioId`, `tipo` ni `locationId`: para eso está `PATCH /attendance/:id`.

> Cuando el marcaje **todavía no existe** (el caso normal de la UX de R4: se presidente en
> vivo y sale `requiereConfirmacion`), se vuelve a llamar a `POST /attendance/check` con
> `usuarioId`: ahí se crea la fila ya como manual y se salta ArcFace por completo.

### `GET /attendance/dashboard` (B5)

Query: `fecha=YYYY-MM-DD` (opcional; sin valor, el **día local del servidor**). Se parsesa como
día local a propósito: `new Date('2026-10-03')` es medianoche **UTC** y en Bolivia (UTC-4)
caería en el día anterior. Un `fecha` con formato o fecha imposible (`2026-13-01`, `2026-02-31`)
→ `400`.

Respuesta:

```jsonc
{
  "fecha": "2026-10-03",          // día local del servidor
  "desde": "2026-10-03T03:00:00.000Z",
  "hasta": "2026-10-04T02:59:59.999Z",
  "totales": {
    "personal": 7, "presentes": 4, "ausentes": 3, "dentro": 2, "fuera": 2,
    "marcajes": 9, "entradas": 5, "salidas": 4, "rostrosRegistrados": 4
  },
  "porTienda": [
    {
      "locationId": 5, "codigo": "TDA-CEN", "nombre": "Tienda Centro", "tipo": "tienda",
      "totalPersonal": 4, "totalMarcajes": 6,
      "presentes": [
        {
          "usuarioId": 3, "nombre": "Ana", "apellido": "Paz", "nombreCompleto": "Ana Paz",
          "email": "ana@…", "rol": "tienda", "presencia": "presente", "dentro": true,
          "horaEntrada": "2026-10-03T13:02:00.000Z",  // primer `entrada` del día
          "horaSalida": "2026-10-03T17:10:00.000Z",   // última `salida` si vino después
          "ultimaMarca": { "asistenciaId": 42, "tipo": "entrada", "fecha": "…", "metodo": "automatico", "confianza": 0.81 },
          "marcajes": 3, "rostroRegistrado": true
        }
      ],
      "ausentes": [
        { "usuarioId": 7, "nombre": "Luis", "apellido": "Sosa", "nombreCompleto": "Luis Sosa",
          "email": "luis@…", "rol": "tienda", "rostroRegistrado": false }
      ]
    }
  ],
  "sinTienda": { /* mismo shape, personal sin `users.tiendaId` */ },
  "ultimosMarcajes": [ /* los 10 últimos del día, con `nombreCompleto` */ ]
}
```

Criterios: **presente** = tiene al menos un marcaje ese día; **dentro** = el último marcaje del
día fue `entrada`. La tienda del presente es la del **último marcaje**, y si ese marcaje no trae
tienda se usa la asignada en `users.tiendaId` (si tampoco tiene, va a `sinTienda`); los
**ausentes** se cuentan sobre el personal activo de cada tienda, para que ambos grupos sean
comparables. `porTienda` viene ordenado por `codigo`. Los datos de usuario entran por columnas
explícitas: nunca `password` ni `embedding`.

### `POST /attendance/check` (B4 + B5)

`multipart/form-data` con `foto` (obligatoria, `image/*` ≤ 10 MB, cualquier formato que
`sharp` sepa abrir), más:

| Campo | Notas |
| :--- | :--- |
| `tipo` | `entrada` \| `salida`. Opcional: si falta, se alterna según el último marcaje del día |
| `locationId` | Tienda del marcaje. Se valida: debe existir → si no, `404` |
| `usuarioId` | **B5.** Fuerza el marcaje manual: el operador ya eligió a quién pertenece la foto |

Sin `usuarioId` el servicio normaliza la foto (`sharp`: EXIF, `112×112` con `fit: 'cover'`),
corre ArcFace int8 y compara por similitud coseno contra el índice en memoria
(umbral `UMBRAL_CONFIANZA_FACIAL` = 0.35). **La guía oval es de la app móvil**, no del
backend: aquí solo llega el recorte cuadrado que la cámara ya encuadró.

```jsonc
// índice vacío (nadie tiene rostro): no se crea nada
{ "reconocido": false, "requiereConfirmacion": false, "umbral": 0.35, "candidatos": [] }

// coincidencias por debajo del umbral: el admin elige a mano (o descarta)
{ "reconocido": false, "requiereConfirmacion": true, "umbral": 0.35, "similitud": 0.21,
  "candidatos": [ /* top 5: `{ usuarioId, similitud }`, de más a menos similar */ ] }

// por encima del umbral: se registra el marcaje
{ "reconocido": true, "manual": false, "requiereConfirmacion": false, "umbral": 0.35,
  "candidato": { "usuarioId": 3, "nombreCompleto": "Ana Paz", "similitud": 0.82 },
  "asistencia": { /* la fila de GET /attendance */ } }

// con usuarioId (manual): sin ArcFace, metodo "manual", confianza null y confirmada por el admin
{ "reconocido": true, "manual": true, "requiereConfirmacion": false, "umbral": 0.35,
  "candidato": { "usuarioId": 3, "nombreCompleto": "Ana Paz", "similitud": null },
  "asistencia": { "metodo": "manual", "confirmadoPorId": 1, "confianza": null, … } }
```

Errores: sin `foto` → `400`; `tipo` inválido → `400`; `locationId` inexistente → `404`;
`usuarioId` inexistente o **dado de baja** (`activo = false`) → `404`; foto que `sharp` no
puede abrir → `400`; modelo ArcFace ausente en el servidor → `503`.

> En el camino automático (sin `usuarioId`) un `locationId` válido pero de **almacén** en
> lugar de tienda se acepta: el marcaje guarda la ubicación tal cual. Lo refleja la fila, y
> el dashboard agrupa por `codigo`.

### Diagnóstico del reconocimiento (B6, solo `admin`)

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| GET | `/face/status` | Estado del reconocimiento: umbral, rostros en BD, índice en memoria, bucket y disponibilidad del modelo |
| POST | `/face/warmup` | Carga la `InferenceSession` de ArcFace a pedido y devuelve los ms |

No aceptan foto ni registran nada: sirven para verificar un despliegue y medir el cold start de
Render (ver `docs/despliegue.md`). `indiceEnMemoria === rostrosEnBase` prueba que el
`onModuleInit` rehidrató el índice tras un spin-down; `modelo.cargada` es `false` hasta el
primer `warmup` o inferencia porque la sesión es perezosa.

## Hito 3 — Códigos de barras, asistencia facial y conteo por lotes

> **Implementado (29/09/2026, tarea B1 del `Plan Hito 3.md`):** el flujo de códigos de barras
> completo — `products.codigo`, `GET /products/by-barcode/:codigo`,
> `GET /products/:id/barcode` y `POST /products/barcode/generate-all`, ya documentados en
> [Products](#products). El escáner del móvil (`mobile/src/screens/ScannerScreen.tsx`) es
> **solo de consulta**: lee un código y muestra la ficha del producto.
>
> **Implementado (30/09/2026, tarea B2 del `Plan Hito 3.md`):** el spike de reconocimiento
> facial **medido y cerrado** — ArcFace int8 (`onnxmodelzoo/arcfaceresnet100-11-int8`,
> Apache-2.0) corre **in-process en NestJS con `onnxruntime-node`**: **no hay microservicio
> Python/FastAPI**, ni `FACE_SERVICE_URL`, ni `FACE_API_KEY`. Overhead **125.9 MB** (entra en los
> 512 MB de Render) a **246.8 ms** por embedding; el límite real es la latencia, no la memoria.
> Se descartó el fallback a MobileFaceNet. Script reproducible en `backend/spike/`
> (`npm run spike:arcface`). Las rutas de historial, en [Attendance](#attendance).
>
> **Implementado (01/10/2026, tarea B3 del `Plan Hito 3.md`):** el **registro facial** —
> `POST /users/face/register` y `GET /users/rostros`, documentados en [Users](#users). El
> reconocimiento corre **in-process**: `backend/src/face/` carga ArcFace int8 con
> `onnxruntime-node` (perezoso, en la primera inferencia), promedia y normaliza los N
> embeddings, sube 1 foto al bucket privado `faces` y rehidrata el índice en memoria
> (`SELECT id, embedding FROM users WHERE embedding IS NOT NULL AND activo = true`).
> `PATCH /users/:id` acepta `apellido`, `activo` y `eliminarEmbedding`; el login rechaza
> `activo = false`; ni el `embedding` ni una URL pública de la foto salen nunca al cliente.
> El contrato del modelo se verifica con `npm run face:check` (fuera de Jest: el binding
> nativo de `onnxruntime-node` no funciona dentro del sandbox de Jest).
>
> **Implementado (03/10/2026, tareas B4 y B5 del `Plan Hito 3.md`):** el **marcaje en vivo** —
> `POST /attendance/check` (reconocimiento por ArcFace, tipo alternado automático, validación
> de `tipo`/`locationId` y marcaje manual con `usuarioId` cuando el rostro no pasa el umbral) y
> `GET /attendance/dashboard?fecha=`, ambos en [Attendance](#attendance).
>
> **Implementado (04/10/2026, tarea B6 del `Plan Hito 3.md`):** despliegue en Render con el
> modelo ArcFace disponible en el servidor — `prestart:prod` →
> `scripts/ensure-arcface-model.mjs` lo baja si falta (63 MB, Apache-2.0) — más
> `GET /face/status` y `POST /face/warmup` para verificar la rehidratación del índice y medir
> el cold start del plan free. Ver `docs/despliegue.md` §1.1.
>
> **Documentado (05/10/2026, tarea B7):** contrato completo de las **5 rutas** de
> [Attendance](#attendance) (`GET /attendance`, `GET /attendance/dashboard`,
> `POST /attendance/check`, `POST /attendance/:id/confirm`, `PATCH /attendance/:id`) con sus
> parámetros, respuestas y errores, más la tabla `asistencia` y las columnas faciales de
> `users`. La arquitectura del reconocimiento (ArcFace in-process, **sin modelo detector**)
> está en [arquitectura.md](arquitectura.md) §3.2.
>
> **Descartado: conteo de piezas con IA/YOLO.** No hay modelo detector, ni dataset, ni
> microservicio de inferencia, ni `POST /inference/detect` en este proyecto. Si algún día se
> implementa el conteo de recepción, es **solo por códigos de barras**.
>
> **Flujos sobre el mismo escáner:** (a) **escanear desde el POS** → **tarea pendiente, sin
> agendar** (diseño ya decidido: botón en `SalesScreen` + cámara en modal; ver "Tarea
> pendiente" en `Plan Hito 3.md`); (b) **contar piezas en recepción** → fuera del hito,
> propuesta tentativa abajo.
>
> Ninguno de los dos necesita un endpoint nuevo: `POST /sales` y `GET /products/by-barcode/:codigo`
> ya cubren (a), y (b) sí necesitaría el endpoint de la sección siguiente.

### `POST /api/movimientos/entrada/count` — conteo de recepción (fuera del hito)

| | |
| :--- | :--- |
| Estado | **Propuesta — no implementada, fuera del Hito 3** |
| Acceso | `JwtAuthGuard` + `RolesGuard`, `@Roles('admin', 'inventario')` |
| Content-Type | `application/json` |

> No está implementado: hoy `movimientos.controller.ts` solo expone `GET /movimientos` y
> `POST /movimientos` (traslados). Los campos `cantidadDeclarada` y `tipo='entrada'` ya
> existen en la entidad, pero ningún flujo los escribe todavía. Antes de implementarlo hay que
> resolver la nota sobre `origenId` más abajo.

**Request**

```json
{
  "locationId": 1,
  "items": [{ "codigo": "AP-0001-FRLTOYHLX001", "cantidad": 12 }]
}
```

- `locationId` (number): ubicación donde se realiza el conteo (recepción de mercadería).
- `items` (array): conteo agrupado por código de barras, `{codigo → cantidad}`.
- `codigo` (string): código de barras leído (columna `products.codigo`, formato `AP-<id>-<codigoFabrica>`).
- `cantidad` (number): piezas contadas para ese código.

**Response `200`**

```json
{
  "ok": false,
  "total": 14,
  "faltantes": [
    { "codigo": "AP-0001-FRLTOYHLX001", "cantidadContada": 10, "cantidadDeclarada": 12 }
  ],
  "sobra": [
    { "codigo": "AP-0007-BUJ440XXX", "cantidadContada": 4, "cantidadDeclarada": 2 }
  ]
}
```

- `ok` (boolean): `true` si el conteo coincide con lo declarado (`faltantes` y `sobra` vacíos).
- `total` (number): suma de `items.cantidad` (total de piezas contadas).
- `faltantes[]` / `sobra[]`: diferencias por código contra `movimientos.cantidadDeclarada`;
  `cantidadContada` = lo contado, `cantidadDeclarada` = lo que declara el movimiento.

### ~~`POST /api/inference/detect` — modo IA (Ruta B)~~ — DESCARTADO

> **Ruta B eliminada del alcance el 29/09/2026.** Era el conteo de piezas con un modelo
> detector (YOLO) servido por un microservicio **Python FastAPI** aparte. Se descartó por
> costo (2º servicio en Render Free: 512 MB, 750 h/mes, 2º cold start) y por complejidad
> (dataset + entrenamiento, que el proyecto no tiene). El `Plan Hito 3.md` lo registra en
> "Descartado" y `AGENTS.md` lo reiterate.
>
> **No existe** ningún endpoint `inference/detect`, ni cliente HTTP a FastAPI, ni
> `FACE_SERVICE_URL` / `FACE_API_KEY`. La única IA del proyecto es el reconocimiento facial
> ArcFace, que corre **dentro de NestJS con `onnxruntime-node`** (módulo `attendance`).
> Si alguien busca este endpoint, la referencia es `Plan Hito 3.md` línea 15, no este doc.

### Tabla `asistencia` (nueva en el Hito 3)

`asistencia.entity.ts` · DDL idempotente en `backend/sql/hito3.sql`. Una fila = un marcaje.

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `id` | serial PK | |
| `usuarioId` | int NOT NULL → `users.id` | Persona a la que pertenece el marcaje |
| `locationId` | int **nullable** → `locations.id` | Tienda del marcaje; `ON DELETE SET NULL` |
| `fecha` | `timestamp` | Default `CURRENT_TIMESTAMP`. **Es el reloj del servidor**: el móvil no manda la hora |
| `tipo` | `varchar` NOT NULL | `entrada` \| `salida` |
| `metodo` | `varchar` DEFAULT `automatico` | `automatico` \| `manual` |
| `confianza` | `double precision` nullable | Similitud coseno (0-1) que dio el reconocimiento; `null` en marcajes manuales |
| `confirmadoPorId` | int nullable → `users.id` | Admin que confirmó; `ON DELETE SET NULL` |

Índices: `IX_asistencia_fecha` (fecha) e `IX_asistencia_usuario_fecha` (usuarioId, fecha) —
el segundo es el que usa `determinarTipoAutomatico` y el filtrado por persona.

Relaciones (`usuario`, `location`, `confirmadoPor`) salen en la respuesta de la API, pero
siempre con **columnas explícitas** (`id`, `nombre`, `apellido`, `email`, `rol`): un
`leftJoinAndSelect` arrastraría `users.password` y el `embedding` (512 floats de dato
biométrico) a la respuesta y a la memoria del proceso.

### Columnas faciales en `users`

| Columna | Tipo | Notas |
| :--- | :--- | :--- |
| `apellido` | `varchar` nullable | Antes el nombre completo era solo `nombre`; el registro facial busca `nombre` + `apellido` |
| `embedding` | `jsonb` nullable | Vector de **512 floats** normalizado (L2) de ArcFace. `NULL` = sin rostro registrado. **Nunca sale al cliente** |
| `facePhoto` | `text` nullable | **Ruta** del objeto en el bucket privado `faces` (`user-<id>.jpg`), no una URL |
| `faceRegisteredAt` | `timestamp` nullable | Cuándo se hizo el registro; lo muestra la web |
| `activo` | `boolean` DEFAULT `true` | `false` = dado de baja: no entra al índice de rostros y el login responde `401` |

### Entidades del Hito 3 (columnas nuevas)

| Entidad | Columna | Tipo | Observación |
| :--- | :--- | :--- | :--- |
| `products` | `codigo` | `varchar` UNIQUE, nullable | Código de barras Code128 del producto, formato `AP-<id>-<codigoFabrica>`. **Nullable** solo para compatibilidad: el seed y `POST /products/barcode/generate-all` lo generan para todo el catálogo |
| `movimientos` | `cantidadDeclarada` | `integer`, nullable | Cantidad que la recepción declara, contra la que se compara el conteo. **Ningún flujo la escribe todavía** |
| `movimientos` | `tipo` | `varchar`, nullable | `'traslado'` \| `'entrada'`; `null` en los traslados existentes. Solo escribe `'entrada'` el futuro flujo de conteo de recepción |
| `locations` | `codigo` | `varchar` UNIQUE | Ya existente; sin cambios |

> `origenId` en `movimientos` sigue siendo **NOT NULL** (`movimiento.entity.ts:36`), y ese es
> el bloqueo real del conteo de recepción: una entrada de proveedor no tiene ubicación de
> origen. Cuando se implemente hay que decidir si `origenId` pasa a nullable (recibe sin
> origen) o si se usa el almacén de recepción como origen. **Decisión pendiente.**

## Notas

- Subida de archivos: facturas e imágenes usan `multipart/form-data` con `multer`.
- La exportación de `xlsx` devuelve el archivo binario con headers de descarga.
- Errores: la API responde con estructura estándar de NestJS (`{ statusCode, message, error }`).
- Mobile agrega `/api` a su base por sí solo (`src/config.ts`); web lo incluye en `VITE_API_URL`.