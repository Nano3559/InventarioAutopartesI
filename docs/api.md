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
| GET | `/products` | Listar/filtrar catálogo |
| GET | `/products/:id` | Detalle de producto |
| GET | `/products/:id/stock` | Stock del producto por ubicación |
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

> Ver también la sección [Hito 3 — Conteo por lotes](#hito-3--conteo-por-lotes-contrato-congelado--b1)
> con el contrato congelado de `/movimientos/entrada/count` (aún sin implementar).

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

## Hito 3 — Conteo por lotes (contrato congelado · B1)

> **Contrato acordado el 22/09/2026 (tarea B1 del Plan Hito 3).** Los endpoints de esta
> sección **aún no están implementados** (implementación: `entrada/count` en B2,
> `inference/detect` en B4). No cambiar la forma request/response sin acordarlo antes con
> el equipo (móvil/web), para no rehacer consumidores.

### `POST /api/movimientos/entrada/count` — modo solo-códigos (Ruta A)

| | |
| :--- | :--- |
| Estado | **Congelado — por implementar (B2)** |
| Acceso | `JwtAuthGuard` + `RolesGuard`, `@Roles('admin', 'inventario')` |
| Content-Type | `application/json` |

**Request**

```json
{
  "locationId": 1,
  "items": [{ "codigo": "DAI309005", "cantidad": 12 }]
}
```

- `locationId` (number): ubicación donde se realiza el conteo (recepción de mercadería).
- `items` (array): conteo agrupado por código de barras, `{codigo → cantidad}`.
- `codigo` (string): código de barras leído (columna `products.codigo`).
- `cantidad` (number): piezas contadas para ese código.

**Response `200`**

```json
{
  "ok": false,
  "total": 14,
  "faltantes": [
    { "codigo": "DAI309005", "cantidadContada": 10, "cantidadDeclarada": 12 }
  ],
  "sobra": [
    { "codigo": "BUJ440-XXX", "cantidadContada": 4, "cantidadDeclarada": 2 }
  ]
}
```

- `ok` (boolean): `true` si el conteo coincide con lo declarado (`faltantes` y `sobra` vacíos).
- `total` (number): suma de `items.cantidad` (total de piezas contadas).
- `faltantes[]` / `sobra[]`: diferencias por código contra `movimientos.cantidadDeclarada`;
  `cantidadContada` = lo contado, `cantidadDeclarada` = lo que declara el movimiento.

### `POST /api/inference/detect` — modo IA (Ruta B)

| | |
| :--- | :--- |
| Estado | **Congelado — por implementar (B4)** |
| Servicio | Microservicio **Python FastAPI** (no NestJS), expuesto bajo el mismo prefijo `/api` |
| Content-Type | `multipart/form-data` |

**Request (multipart)**

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `image` | file | Frame capturado por la cámara del móvil |
| `barcodes` | string (JSON) | Códigos detectados en el mismo frame con su bbox: `[{"codigo":"DAI309005","x":0.12,"y":0.34,"w":0.2,"h":0.08}]` — `x,y,w,h` normalizados 0..1 (origen arriba-izquierda) respecto al frame |

**Response `200`**

```json
[
  {
    "codigo": "DAI309005",
    "clase": "pastillas_freno",
    "cantidad": 12,
    "confianza": 0.91,
    "necesita_confirmacion": false
  },
  {
    "clase": "bujia",
    "cantidad": 3,
    "confianza": 0.72,
    "necesita_confirmacion": true
  }
]
```

- `codigo?` (string, opcional): presente cuando el bbox del código cae **dentro** del bbox
  de la pieza → el código gana (identidad exacta). Ausente si la pieza no tiene etiqueta.
- `clase` (string): clase de la pieza detectada por la IA (tipo/genérico).
- `cantidad` (number): piezas detectadas para esa identidad/clase.
- `confianza` (number): confianza de la detección, 0..1.
- `necesita_confirmacion` (boolean): `true` si es candidato sin código que el encargado
  debe confirmar antes de sumarlo al conteo.

### Entidades del Hito 3 (columnas nuevas)

| Entidad | Columna | Tipo | Observación |
| :--- | :--- | :--- | :--- |
| `products` | `codigo` | `varchar` UNIQUE, nullable | Código de barras del producto; identifica el ítem en el conteo. Datos sembrados sin él (nullable) |
| `movimientos` | `cantidadDeclarada` | `integer`, nullable | Cantidad que la recepción declara, contra la que se compara el conteo |
| `movimientos` | `tipo` | `varchar`, nullable | `'traslado'` \| `'entrada'`; `null` en los traslados existentes. B3 creará movimientos `tipo='entrada'` |
| `locations` | `codigo` | `varchar` UNIQUE | Ya existente; sin cambios |

> `origenId` en `movimientos` sigue siendo **NOT NULL** hoy: la entrada de recepción de
> proveedor (B3) deberá decidir si lo deja nullable (recibe en una ubicación sin origen)
> o bien usa el almacén de recepción como origen. Pendiente de decisión en B3.

## Notas

- Subida de archivos: facturas e imágenes usan `multipart/form-data` con `multer`.
- La exportación de `xlsx` devuelve el archivo binario con headers de descarga.
- Errores: la API responde con estructura estándar de NestJS (`{ statusCode, message, error }`).
- Mobile agrega `/api` a su base por sí solo (`src/config.ts`); web lo incluye en `VITE_API_URL`.