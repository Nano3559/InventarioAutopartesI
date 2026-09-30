# AGENTS.md

Sistema de Inventario y Ventas para 7 importadoras de autopartes (**AutoParts Pro / AutoRepuestos PRO**). Proyecto de Programación Avanzada (Unifranz). Implementado como monorepo simple con 3 subproyectos npm independientes (sin workspaces).

Documentación del negocio y plan: `requerimientos.md` (ejercicio), `Plan Hito 3.md` (plan día a día del Hito 3, 29/09 → 06/10/2026 — **códigos de barras + asistencia facial**, ver sección "Hito 3" más abajo), `Documento de Integración Hito 3.md` (referencia técnica previa) y `docs/git-convention.md` (flujo de Git del equipo). Documentación técnica consolidada en `docs/` (`docs/README.md` es el índice; `docs/api.md` se consulta con frecuencia).

## Asistentes y skills propios (opencode)

- **Agentes** en `.opencode/agent/`: `backend`, `frontend`, `mobile`, `docs` (subagentes por dominio). Para tareas específicas de un frente, delega al subagente correspondiente.
- **Skills** en `.opencode/skills/`: `verificar-modulo` (correr lint+build antes de cerrar una tarea), `git-convencion` (aplicar ramas/commits/PR según `docs/git-convention.md`) e `impeccable` (diseño/UX de interfaces frontend: audit, polish, critique, layout, animaciones, etc.).
- Los cambios en `.opencode/` requieren reiniciar opencode para tomar efecto.

## Stack implementado

- **Backend:** NestJS 11 + TypeScript + TypeORM + PostgreSQL (`pg`). Auth JWT (Passport), bcryptjs, multer + sharp + Supabase (imágenes), `xlsx` (Excel), swagger-free.
- **Frontend web admin/tienda:** React 19 + Vite 8 + TypeScript, `react-router-dom` 7, `lucide-react`. Sin librería de estado/forms/CSS (estilos en CSS plano, context para auth/notificaciones). Desplegado en Vercel.
- **Mobile:** Expo 57 / React Native 0.86. React Navigation (native-stack + drawer), expo-secure-store, image/document picker, print/sharing. EAS para builds.

## Estructura

```
backend/    API NestJS (prefijo /api, puerto 3000)
frontend/   SPA React (Vite) para admin y tienda
mobile/     App Expo para admin, tienda e inventario
```

Archivos raíz: `Plan Hito 3.md`, `requerimientos.md`, `README.md` y `docs/` (documentación técnica indexada en `docs/README.md`).

### Roles

`admin` | `tienda` | `inventario` (en los requerimientos figura como "encargado de inventario"). Definidos en `backend/src/common/constants.ts` y aplicados por JWT/RBAC tanto en web como móvil.

## Hito 3 — en curso (29/09 → 06/10/2026)

Plan día a día en `Plan Hito 3.md` (8 días, 3 personas, 1 tarea diaria por persona). Entrega prioritaria del **día 1 (29/09): flujo completo de código de barras** — etiqueta por producto, cámara del celular, mensaje con la info del producto desde la BD.

**Responsables**
- **Brian** — backend NestJS y despliegue en **Render** (BD en Supabase). IA facial **in-process**.
- **Raul** — app móvil (Expo) y **base de datos en Supabase** (bucket `faces`, ping diario para que el free tier no pause a los 7 días).
- **Marco** — frontend web (Vercel). Nunca bloquea a Brian ni a Raul.

**Decisiones tomadas** (estaban abiertas en `Documento de Integración Hito 3.md`; ese documento quedó desactualizado respecto a estas):

- **Identidad de producto:** Code128 generado por el equipo → `products.codigo`, formato `AP-<id>-<codigoFabrica>`. Etiqueta **solo barras** (`includetext: false`), sin texto legible.
- **Librería de códigos de barras:** `@bwip-js/node` (backend), `@bwip-js/browser` (web), `@bwip-js/react-native` (móvil). **No usar `jsbarcode` ni `bwip-js` v3.**
- **Reconocimiento facial:** ArcFace ONNX int8 (**Apache-2.0**, `onnxmodelzoo/arcfaceresnet100-11-int8`) ejecutado **dentro de NestJS con `onnxruntime-node`** — un solo servicio. **No hay microservicio FastAPI**, ni `FACE_SERVICE_URL` / `FACE_API_KEY`.
- **Sin modelo detector de rostros:** la app recorta 112×112 con guía oval y ArcFace ya consume ese recorte.
- **Umbral de confianza:** `UMBRAL_CONFIANZA_FACIAL` se recalibra con **similitud coseno** (rango típico 0.28–0.45); el 0.55 inicial daba falsos negativos.
- **Descartado:** conteo de autopartes con YOLO (ya no es el alcance).
- **Pendiente, sin agendar:** escaneo desde el POS (botón en `SalesScreen` + cámara en modal, decisión ya tomada) y conteo de recepción. El escáner del Hito 3 es **solo de consulta**. Ver "Tarea pendiente" en `Plan Hito 3.md`.
- **Registro facial:** el nombre del formulario debe existir en `users` (`nombre` + `apellido`); si no, 404. El endpoint asocia un rostro a un usuario ya creado, no crea usuarios.

**Ya está listo:** entidades `Product.codigo`, `User` extendida (5 campos) y `Asistencia`; constantes en `backend/src/common/constants.ts`; `backend/sql/hito3.sql`; `AttendanceModule` registrado.

**Trampas conocidas** (ver la tabla completa en el plan):
- En Nest, `@Get('by-barcode/:codigo')` debe declararse **antes** de `@Get(':id')`, si no responde 400.
- `npx tsc --noEmit` en `mobile/` requiere `npm install`: `node_modules` puede quedar desactualizado respecto a `package.json`.
- El bucket `faces` es **privado** (URLs firmadas); datos biométricos → consentimiento explícito (Ley 26935 Bolivia).
- Un `.ts` **fuera de `src/`** (ej. `backend/spike/`) entra en `nest build` si no está en el `exclude` de `tsconfig.build.json`: eso baja el `rootDir` y `dist/main.js` pasa a `dist/src/main.js`, rompiendo `npm run start:prod` **sin error de build**.
- `leftJoinAndSelect('a.usuario', 'u')` filtra **todas** las columnas de `users`, incluido `password` y `embedding`. Para joins de solo lectura usar `leftJoin(...)` + `addSelect([...])` con las columnas explícitas.

## Backend (`backend/`)

Módulos NestJS: `auth`, `users`, `products`, `locations`, `sales`, `movimientos`, `solicitudes`, `proveedores`, `costos`, `devoluciones`, `precios`, `reportes`, `attendance`. 14 entidades TypeORM en `src/entities/` (más `Asistencia`, del Hito 3). `schema.sql` = esquema PostgreSQL de referencia (ojo: no define `factura_items`, que sí existe como entidad).

### Comandos
- `npm run start:dev` — dev con hot-reload (`nest start --watch`).
- `npm run build` — `nest build` (typecheck + compila a `dist/`).
- `npm run lint` — ESLint con `--fix`.
- `npm run seed` — `ts-node src/seed.ts` (siembra datos reales: 7 ubicaciones, productos, etc.). Requiere PostgreSQL arriba y `.env` configurado.
- `npm test` — Jest unitario (specs en `src/`).
- `npm run test:e2e` — tests e2e (specs en `test/`, requiere `test/jest-e2e.json` y la app/db).

### Entorno (`backend/.env`; variables en `docs/entornos.md`)
`DB_HOST`, `DB_PORT`, `DB_NAME` (AutopartesDB), `DB_USER`, `DB_PASSWORD`, `PORT` (3000), `JWT_SECRET`, `DB_SYNC` (true en dev, sincroniza esquema automáticamente). TypeORM con `ssl: { rejectUnauthorized: false }` y `autoLoadEntities`. `POST /api/auth/login` devuelve el JWT.

## Frontend (`frontend/`)

SPA con layout (Sidebar por rol + Navbar), rutas protegidas por rol. Capas `api/` (cliente fetch) y `services/` (dominios: products, sales, movimientos, precios, costos, reportes, locations). Contextos: `AuthContext` (JWT + localStorage) y `NotificationContext` (localStorage).

### Comandos
- `npm run dev` — servidor de desarrollo (Vite).
- `npm run build` — `tsc -b && vite build` (typecheck + build).
- `npm run lint` — **oxlint** (NO ESLint).
- `npm run preview` — previsualizar build.
- Sin tests configurados.

### Entorno (`frontend/.env.local`; variables en `docs/entornos.md`)
`VITE_API_URL=http://localhost:3000/api` (producción usa `frontend/.env.production`). Despliegue: Vercel (`vercel.json`).

## Mobile (`mobile/`)

App Expo con drawer por rol (admin/tienda comparten 9 pantallas; inventario 5). Screens principales: Login, dashboards por rol, Inventario/Detalle, Venta (POS), Venta Mayor (import Excel), Historial, Ventas (edición), Devoluciones, Solicitudes, Reportes, Búsqueda por imagen. API en `src/api/` (fetch wrapper con Bearer + ApiError), sesión en SecureStore/localStorage.

### Comandos
- `npm start` — `expo start`.
- `npm run android` / `npm run ios` / `npm run web`.
- Sin scripts de lint/test/build. Verificar: `npx tsc --noEmit` y `npx expo export` para build web/prod. Builds nativos vía EAS (`eas.json`).

### Entorno (`mobile/.env`; variables en `docs/entornos.md`)
`EXPO_PUBLIC_API_URL=http://localhost:3000` (sin `/api`, se agrega automáticamente). Emulador Android: `http://10.0.2.2:3000`; dispositivo físico: IP del PC en la misma red WiFi.

## Notas

- Después de cambios, correr `lint` + `build` (typecheck incluido) en el módulo correspondiente antes de dar una tarea por terminada (skill `verificar-modulo`).
- Al commitear/mergear, seguir `docs/git-convention.md` (skill `git-convencion`); `main` solo recibe código que pasa build + lint.
- Documentación técnica indexada en `docs/README.md`; actualizar `docs/` (y el README raíz) cuando cambien rutas, entidades, entorno o estructura.
- **Expo ha cambiado**: leer `mobile/AGENTS.md` y la doc versionada en https://docs.expo.dev/versions/v57.0.0/ antes de escribir código móvil.
- Imágenes/imágenes de producto: subidas a `/uploads` (servidas estáticamente por el backend) y a Supabase vía sharp (hash) en `common/image-hash.ts`. No commitear el contenido de `uploads/`.
- `.env`, `.env.example` y `.env.local` reales están en `.gitignore`; no commitear secretos ni plantillas. Referencia de variables: `docs/entornos.md`.
- Root `package.json` solo contiene `@types/multer` como devDependency; no agregar dependencias raíz.