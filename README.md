# AutoParts Pro · Sistema de Inventario y Ventas

> Plataforma para 7 importadoras de autopartes (4 almacenes + 3 tiendas) con más de
> 10.000 productos en stock. Gestiona inventario por ubicación, venta al detalle y
> por mayor, pagos multi-método, devoluciones, traslados, costos, precios y reportes.

**Proyecto de Programación Avanzada — Unifranz** · Entregado el 01/09/2026.

| | |
| :--- | :--- |
| **Backend** | NestJS 11 + TypeORM + PostgreSQL |
| **Web** | React 19 + Vite 8 (admin y tienda) |
| **Móvil** | Expo 57 / React Native 0.86 |
| **Despliegue** | Web → Vercel · API → Render · App → Expo EAS |

---

## Tabla de contenidos

- [Características](#características)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Roles del sistema](#roles-del-sistema)
- [Puesta en marcha](#puesta-en-marcha)
- [Scripts útiles](#scripts-útiles)
- [Variables de entorno](#variables-de-entorno)
- [Documentación técnica](#documentación-técnica)
- [Convención de trabajo](#convención-de-trabajo)
- [Despliegue](#despliegue)
- [Estado del proyecto](#estado-del-proyecto)

---

## Características

**Inventario** — Catálogo completo con buscador y filtros (marca, fabricante,
modelo, año, código OEM/fábrica). Stock distribuido en 7 ubicaciones con control
por almacén/tienda, stock mínimo y reposición automática al llegar a 0.

**Ventas** — POS con carrito, subtotales y totales automáticos. Pago en un solo
método o combinado (efectivo, transferencia, QR, crédito). Registro de datos para
factura (CI/NIT, nombre, celular) y nota de venta imprimible.

**Venta por mayor** — Ingesta manual (Opción A) o por importación de Excel
(Opción B) validando stock disponible, con datos de cliente, entrega y pago.

**Movimientos y solicitudes** — Traslados entre ubicaciones con histórico, y
solicitudes de las tiendas al almacén con estados controlados por el encargado de
inventario.

**Devoluciones** — Registro con motivo, cantidad, monto y método, actualizando el
inventario correspondiente.

**Costos y precios** — Facturas por proveedor (con subida de archivo) y cálculo de
precios a partir del costo (+20% a +80%, precio por mayor manual). Export a Excel.

**Reportes** — Dashboard con KPIs, ventas por tienda/marca/vehículo, reportes
mensuales por tienda (con costo) y compras por proveedor.

**Búsqueda por imagen** — Identificación de productos desde una fotografía (web y móvil).

---

## Stack tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Base de datos** | PostgreSQL 16 · TypeORM (14 entidades) |
| **Backend** | NestJS 11 · TypeScript 5.7 · Passport/JWT · bcryptjs |
| **Frontend** | React 19 · Vite 8 · TypeScript 6 · react-router-dom 7 · lucide-react |
| **Móvil** | Expo 57 (React Native 0.86) · React Navigation 7 · expo-print/secure-store |
| **Archivos** | multer · sharp · Supabase (imágenes) |
| **Excel** | xlsx (import/export) |
| **Calidad** | oxlint (web) · ESLint+Prettier (backend) · Jest+supertest (backend e2e) |

Detalle con versiones y justificaciones: [docs/stack-tecnologico.md](docs/stack-tecnologico.md).

---

## Estructura del repositorio

```
├── backend/            API NestJS (prefijo /api, puerto 3000)
│   ├── src/
│   │   ├── auth/          login JWT + guards RBAC
│   │   ├── common/        constantes roles/pagos/estados + image-hash
│   │   ├── entities/      14 entidades TypeORM
│   │   ├── <modulo>/      products, sales, movimientos, costos, precios...
│   │   └── seed.ts        siembra datos reales del negocio
│   ├── schema.sql          esquema PostgreSQL de referencia
│   └── test/              specs e2e (Jest + supertest)
├── frontend/           SPA React (Vite) — admin + tienda
│   └── src/
│       ├── api/           cliente fetch + wrappers por dominio
│       ├── services/      lógica de negocio sobre la API
│       ├── context/       AuthContext (JWT) + NotificationContext
│       ├── routes/        rutas protegidas por rol
│       ├── layouts/       Sidebar por rol + Navbar
│       ├── pages/         inventario, ventas, costos, precios, reportes...
│       └── styles/        CSS plano por pantalla
├── mobile/             App Expo — admin, tienda e inventario
│   └── src/
│       ├── api/           misma arquitectura que web (Bearer + ApiError)
│       ├── screens/       Login, POS, Venta Mayor, Inventario, Solicitudes...
│       ├── components/    AppDrawer por rol, StatCard, Badge...
│       └── theme.ts       design tokens (light/dark)
├── docs/               Documentación técnica organizada
├── PLAN.md             Plan día a día del equipo + flujo de Git
├── requerimientos.md   Ejercicio del cliente (requisitos del sistema)
└── AGENTS.md           Instrucciones para el asistente de código
```

---

## Roles del sistema

| Rol | Alcance |
| :--- | :--- |
| **`admin`** | Acceso completo: inventario, precios, costos, ventas (menor/mayor), movimientos, reportes, usuarios |
| **`tienda`** | Vender, registrar devoluciones, solicitar productos al almacén y consultar stock/reportes de su tienda |
| **`inventario`** | Gestionar solicitudes de las tiendas, registrar traslados y control físico del stock |

Roles definidos en `backend/src/common/constants.ts` y aplicados por JWT/RBAC en
web (`ProtectedRoute`) y móvil (drawer por rol).

---

## Puesta en marcha

### Requisitos previos

- Node.js 20+ y npm
- PostgreSQL en ejecución con una base `AutopartesDB`
- (Opcional) Expo CLI / cuenta EAS para la app móvil

### 1. Configurar variables de entorno

Las plantillas `.env.example` se mantienen fuera del repositorio (no se versionan).
Si cuentas con la plantilla local, cópialas y rellena los valores:

```bash
cp backend\.env.example   backend\.env
cp frontend\.env.example  frontend\.env.local
cp mobile\.env.example    mobile\.env
```

Si no las tienes, crea cada archivo con las variables documentadas en
[docs/entornos.md](docs/entornos.md).

### 2. Backend

```bash
cd backend
npm install
npm run start:dev        # NestJS escucha en http://localhost:3000/api
```

Verifica: `GET http://localhost:3000/api` responde.

_(Opcional — requiere DB arriba y `.env` configurado: `npm run seed` siembra las
7 importadoras, usuarios y el catálogo de productos.)_

### 3. Frontend (web)

```bash
cd frontend
npm install
npm run dev              # Vite escucha en http://localhost:5173
```

### 4. Mobile (Expo)

```bash
cd mobile
npm install
npm start                # expo start (QR / emulador)
```

En el emulador Android usa `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000`; en un
dispositivo físico, el IP de tu PC en la misma red WiFi.

---

## Scripts útiles

| Comando | Módulo | Descripción |
| :--- | :--- | :--- |
| `npm run start:dev` | backend | Dev con hot-reload |
| `npm run build` | backend | `nest build` (typecheck + compila) |
| `npm run lint` | backend | ESLint con `--fix` |
| `npm test` / `test:e2e` | backend | Tests unitarios / e2e |
| `npm run seed` | backend | Siembra datos reales del negocio |
| `npm run dev` | frontend | Servidor de desarrollo |
| `npm run build` | frontend | `tsc -b && vite build` (typecheck) |
| `npm run lint` | frontend | **oxlint** (no ESLint) |
| `npm run preview` | frontend | Previsualizar build |
| `npm start` | mobile | `expo start` |
| `npx tsc --noEmit` | mobile | Typecheck |
| `npx expo export` | mobile | Build web/prod de verificación |

---

## Variables de entorno

Resumen rápido; detalle en [docs/entornos.md](docs/entornos.md).

| Archivo | Variables clave |
| :--- | :--- |
| `backend/.env` | `DB_HOST`, `DB_PORT`, `DB_NAME` (AutopartesDB), `DB_USER`, `DB_PASSWORD`, `PORT` (3000), `JWT_SECRET`, `DB_SYNC` |
| `frontend/.env.local` | `VITE_API_URL` (incluye `/api`) |
| `frontend/.env.production` | `VITE_API_URL` de producción (Vercel) |
| `mobile/.env` | `EXPO_PUBLIC_API_URL` (sin `/api`) |

---

## Documentación técnica

| Documento | Contenido |
| :--- | :--- |
| [docs/README.md](docs/README.md) | Índice de la documentación |
| [docs/arquitectura.md](docs/arquitectura.md) | Diagramas, entidades, módulos y flujos críticos |
| [docs/stack-tecnologico.md](docs/stack-tecnologico.md) | Versiones y justificación de cada tecnología |
| [docs/git-convention.md](docs/git-convention.md) | Ramas, commits y flujo de PR del equipo |
| [docs/api.md](docs/api.md) | Referencia de endpoints REST |
| [docs/entornos.md](docs/entornos.md) | Variables de entorno por entorno |
| [docs/despliegue.md](docs/despliegue.md) | Guía de publicación (Vercel, Render, EAS) |

Docs de negocio: [requerimientos.md](requerimientos.md) y [PLAN.md](PLAN.md).

---

## Convención de trabajo

- Git: ramas `feature/*` → `main` vía PR; mensajes **Conventional Commits** en español.
  Reglas completas en [docs/git-convention.md](docs/git-convention.md).
- Definition of Done: `build` + `lint` en verde en el módulo afectado antes de mergear.
- Asistente de código: leer `AGENTS.md`; agentes/skills propios en `.opencode/`.

---

## Despliegue

| Superficie | Plataforma | Comando/config |
| :--- | :--- | :--- |
| Frontend | Vercel | `npm run build` + `vercel --prod` |
| Backend | Render | build `nest build`, start `npm run start:prod` |
| Móvil | Expo EAS | `npx eas build` |

Guía paso a paso y checklist: [docs/despliegue.md](docs/despliegue.md).

---

## Estado del proyecto

**Entregado (01/09/2026).** Funcionalidades completas según [requerimientos.md](requerimientos.md).

**Líneas de mejora conocidas:**

- `schema.sql` no define la tabla `factura_items` (existe la entidad `FacturaItem`).
- `frontend/.env.production` se versiona por necesidad de Vercel (contiene solo URL pública).
- Frontend sin tests automatizados; móvil sin scripts de lint/test.
- `uploads/` incluye artefactos del seed ya versionados.

---

## Licencia

Proyecto académico — uso exclusivo del equipo de desarrollo (Unifranz). Sin licencia pública.