# 🚗 Sistema Integral de Gestión de Inventario, Ventas y Distribución de Autopartes

Plataforma empresarial de alta disponibilidad para la administración centralizada de inventarios de repuestos automotrices, distribución entre 7 ubicaciones físicas (4 almacenes y 3 tiendas), ventas minoristas y mayoristas, facturación de compras a proveedores, control de márgenes de ganancia, reportes analíticos avanzados y aplicación móvil multiplataforma.

---

## 🏛️ Arquitectura del Sistema

El proyecto está estructurado bajo un monorepo modular y desacoplado:

```text
InventarioAutopartesI/
├── backend/                  # API REST construida con NestJS, TypeORM y SQLite/PostgreSQL
│   ├── src/
│   │   ├── auth/             # Autenticación JWT y control de acceso por roles (RBAC)
│   │   ├── products/         # CRUD de repuestos, cálculo de stock y búsqueda visual
│   │   ├── locations/        # Gestión de las 7 ubicaciones (4 almacenes + 3 tiendas)
│   │   ├── sales/            # Ventas mostrador, ventas mayoristas e historial
│   │   ├── devoluciones/     # Devoluciones, garantías y reingreso a stock
│   │   ├── solicitudes/      # Pedidos de reabastecimiento inter-sucursales
│   │   ├── movimientos/      # Traslados físicos con comprobantes
│   │   ├── precios/          # Gestión de precios y exportación Excel
│   │   ├── costos/           # Facturas de proveedores y costos de adquisición
│   │   └── reportes/         # Estadísticas analíticas y dashboards
│   └── src/seed.ts           # Semilla de datos con más de 30 productos y 7 ubicaciones
│
├── frontend/                 # Aplicación Web Admin (React 19 + TypeScript + Vite + Vanilla CSS)
│   ├── src/
│   │   ├── components/       # Componentes de diseño corporativo (Tablas, Modales, Gráficos)
│   │   ├── context/          # Estados globales (AuthContext, NotificationContext)
│   │   ├── layouts/          # Navbar con centro de notificaciones y Sidebar interactivo
│   │   ├── pages/            # Módulos: Dashboard, Inventario, Detalle, Ventas, Mayorista,
│   │   │                     # Historial, Devoluciones, Movimientos, Costos, Precios, Reportes
│   │   └── services/         # Clientes de consumo HTTP con manejo de errores y tokens
│
└── mobile/                   # Aplicación Móvil (React Native + Expo + React Navigation Drawer)
    └── src/
        ├── components/       # AppDrawer, StatCards, TableCards, Badges y Header
        ├── screens/          # Inventario en 7 Ubicaciones, Ventas, Historial, Solicitudes,
        │                     # Devoluciones, Reportes y Búsqueda por Imagen
        └── api/              # Conectores REST hacia el backend NestJS
```

---

## 👥 Usuarios y Credenciales de Prueba

El sistema implementa control de acceso basado en roles (**RBAC**):

| Rol | Usuario / Email | Contraseña | Sucursal Asignada | Permisos Principales |
| :--- | :--- | :--- | :--- | :--- |
| **Administrador** | `admin@autopartes.com` | `admin123` | Global (Todas) | Acceso total: CRUD, Precios, Costos, Reportes, Usuarios |
| **Encargado de Inventario** | `inventario@autopartes.com` | `admin123` | Almacén Central El Alto | Traslados, Solicitudes, Stock en 7 Ubicaciones, Costos |
| **Vendedor Tienda 1** | `tienda1@autopartes.com` | `admin123` | Tienda 1 (Av. Principal) | POS Ventas, Ventas Mayoristas, Devoluciones, Solicitudes |
| **Vendedor Tienda 2** | `tienda2@autopartes.com` | `admin123` | Tienda 2 (Comercial) | POS Ventas, Ventas Mayoristas, Devoluciones, Solicitudes |
| **Vendedor Tienda 3** | `tienda3@autopartes.com` | `admin123` | Tienda 3 (Zona Sur) | POS Ventas, Ventas Mayoristas, Devoluciones, Solicitudes |

---

## 🚀 Guía de Instalación y Ejecución Local

### 1. Prerrequisitos
* Node.js v18 o superior
* npm v9 o superior

---

### 2. Backend (NestJS API)

```bash
# Entrar a la carpeta del backend
cd backend

# Instalar dependencias
npm install

# Ejecutar la semilla de datos (7 importadoras, repuestos y usuarios)
npm run seed

# Iniciar el servidor en modo desarrollo (Puerto 3000)
npm run start:dev
```
> La API quedará disponible en: `http://localhost:3000`

---

### 3. Frontend Web Admin (React + Vite)

```bash
# En una nueva terminal, entrar a la carpeta frontend
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (Puerto 5173)
npm run dev
```
> La plataforma Web quedará disponible en: `http://localhost:5173`

---

### 4. App Móvil (React Native + Expo)

```bash
# En una nueva terminal, entrar a la carpeta mobile
cd mobile

# Instalar dependencias
npm install --legacy-peer-deps

# Iniciar el bundler de Expo
npm run start
# O para abrir en navegador web:
npm run web
```

---

## 🌟 Módulos y Funcionalidades Destacadas

1. **Catálogo Global e Inventario en 7 Ubicaciones Físicas:**
   - 4 Almacenes (Central El Alto, Norte, Sur, Distribución) y 3 Tiendas comerciales.
   - Búsqueda en tiempo real por nombre, marca, modelo, año, fabricante, código OEM y código de fábrica.
   - Modal de adición rápida de stock e inspección fotográfica 360°.

2. **Búsqueda Inteligente por Imagen:**
   - Carga y análisis visual de fotografías de repuestos para identificación instantánea en catálogo.

3. **Punto de Venta y Ventas Mayoristas:**
   - Carrito reactivo con cálculo automático de totales, impuestos, descuentos y cambio.
   - Generación e impresión de comprobantes oficiales de venta (*Nota de Venta*).

4. **Historial de Ventas, Devoluciones y Garantías:**
   - Registro de motivos de devolución (defectuoso, error de pedido, garantía) y reincorporación automática al inventario.

5. **Traslados Inter-sucursales y Reabastecimiento:**
   - Solicitudes de repuestos desde tiendas hacia almacenes centrales con flujo de aprobación y comprobantes de traslado.

6. **Gestión de Precios, Márgenes y Exportación Excel:**
   - Actualización masiva de márgenes de ganancia y exportación completa del catálogo a `.xlsx`.

7. **Costos y Facturas de Compra a Proveedores:**
   - Registro de facturas con cálculo automático de costo unitario promedio ponderado.

8. **Estadísticas y Reportes Analíticos:**
   - Evolución de ventas a 12 meses, comparativa por tienda, marcas de vehículos más demandadas y volumen de compras.

9. **Centro de Notificaciones en Vivo:**
   - Campana con contador interactivo y alertas de stock crítico, solicitudes y transferencias.

---

## 🧪 Pruebas de Calidad y Compilación

* **Frontend Web:**
  * Build: `npm run build` $\rightarrow$ **0 errores de TypeScript / Vite**.
  * Linter: `npm run lint` $\rightarrow$ **0 advertencias y 0 errores en los 73 archivos**.
* **App Móvil:**
  * Typecheck: `npx tsc --noEmit` $\rightarrow$ **0 errores**.
