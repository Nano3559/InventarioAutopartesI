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

## 2. Modelo de datos (14 entidades TypeORM)

| Entidad | Tabla | Propósito |
| :--- | :--- | :--- |
| `User` | `users` | Usuarios con `rol` (admin/tienda/inventario) + FK `tienda` |
| `Location` | `locations` | 7 ubicaciones: 4 almacenes + 3 tiendas (`tipo`, `codigo`) |
| `Product` | `products` | Catálogo: fabricante, marca, modelo, años, OEM, fábrica, precios, costo, stock mínimo |
| `Inventory` | `inventory` | Stock por producto + ubicación (UNIQUE product+location) |
| `Cliente` | `clientes` | Datos de factura (ciNit, nombre, celular) |
| `Sale` / `SaleItem` | `sales` / `sale_items` | Cabecera + líneas de venta (tipo menor/mayor) |
| `Payment` | `payments` | Pagos multi-método: efectivo, transferencia, qr, crédito |
| `Movimiento` | `movimientos` | Traslados entre ubicaciones (origen, destino, usuario, observación) |
| `Solicitud` | `solicitudes` | Pedidos tienda→almacén con estados + flag `auto` (reposición) |
| `Proveedor` | `proveedores` | Proveedor Bolivia (para costos) |
| `Factura` / `FacturaItem` | `facturas` / `factura_items` | Facturas de compra: tipo cambio, %, monto, archivo e ítems |
| `Devolucion` | `devoluciones` | Devoluciones (motivo, cantidad, monto, método) |

> `schema.sql` es el esquema PostgreSQL de referencia. **Nota:** no define
> `factura_items` aunque la entidad `FacturaItem` sí existe.

## 3. Módulos NestJS

`auth` · `users` · `products` · `locations` · `sales` · `movimientos` ·
`solicitudes` · `proveedores` · `costos` · `devoluciones` · `precios` · `reportes`.

Infraestructura compartida:

| Archivo | Responsabilidad |
| :--- | :--- |
| `src/common/constants.ts` | `UserRole`, `METODOS_PAGO`, `ESTADOS_SOLICITUD`, `PORCENTAJES` |
| `src/common/image-hash.ts` | `computeHash` + `generatePlaceholderImage` (sharp + Supabase) |
| `src/auth/jwt-auth.guard.ts` + `roles.guard.ts` | Guard global de JWT + RBAC |

## 4. Autenticación y RBAC

1. `POST /api/auth/login` valida credenciales (bcrypt) y devuelve un **JWT** (8h).
2. Cada request web/móvil envía `Authorization: Bearer <token>`.
3. `GET /api/auth/me` restaura la sesión al reabrir la app/sitio.
4. `@Roles('admin', ...)` + `RolesGuard` restringen endpoints; `ProtectedRoute`
   (web) y drawer por rol (móvil) restringen la UI.

Roles:

| Rol | Alcance |
| :--- | :--- |
| `admin` | Todo: inventario, precios, costos, venta mayor, reportes, movimientos |
| `tienda` | Vender, devolver, solicitar a almacén, consultar stock/reportes de su tienda |
| `inventario` | Solicitudes, movimientos/traslados, control físico de stock |

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
│                 Producto, Historial, Devoluciones, Solicitudes, Reportes, Búsqueda por imagen
├── components/   AppDrawer (menu por rol), StatCard, Badge, Header...
└── theme.ts      design tokens (paletas light/dark, tipografía, espaciado)
```

Navegación: **native-stack** raíz (`Login` → `Main` + modales `SalesEdit`,
`ProductDetail`) y **drawer** interno según rol.

## 8. Decisiones relevantes

- El **stock total** de un producto = suma de `inventory` en las 7 ubicaciones; el admin
  consulta el detalle por ubicación.
- **Sin Swagger**: documentación de endpoints en `api.md`.
- `DB_SYNC=true` solo en dev; en producción migraciones controladas y `ssl.rejectUnauthorized=false`.
- Mobile y web comparten la URL del backend: base sin `/api` en móvil (se agrega en el cliente).