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

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| GET | `/users` | Listar usuarios |
| POST | `/users` | Crear usuario |
| PATCH | `/users/:id` | Actualizar usuario |
| DELETE | `/users/:id` | Eliminar usuario |

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
| POST | `/products/search-by-image` | Búsqueda de producto por imagen |
| POST | `/products/:id/image` | Subir imagen de producto (multer + sharp + Supabase) |
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

Solo rol `admin` (datos de personal). Es el módulo que B2 del `Plan Hito 3.md` abriu rutas; el
marcaje en sí (`POST /attendance/check`) llega en B4.

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| GET | `/attendance` | Historial paginado con filtros (ver abajo) |
| PATCH | `/attendance/:id` | Corregir un marcaje: `usuarioId`, `locationId`, `fecha`, `tipo`, `metodo`, `confianza`, `confirmadoPorId` |

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

**`PATCH /attendance/:id`** — al dejar `metodo: 'manual'` el servicio anula `confianza` (un
marcaje manual no viene de `/face/match`) y, si no se pasó `confirmadoPorId`, sella al admin que
editó. Los ids se validan antes de tocar la BD: tipo inválido → `400`, id inexistente → `404`.

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