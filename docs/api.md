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

## Notas

- Subida de archivos: facturas e imágenes usan `multipart/form-data` con `multer`.
- La exportación de `xlsx` devuelve el archivo binario con headers de descarga.
- Errores: la API responde con estructura estándar de NestJS (`{ statusCode, message, error }`).
- Mobile agrega `/api` a su base por sí solo (`src/config.ts`); web lo incluye en `VITE_API_URL`.