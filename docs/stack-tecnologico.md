# Stack Tecnológico

Resumen consolidado de las tecnologías del monorepo, versiones exactas y la razón
de cada elección. Úsalo antes de agregar dependencias para evitar duplicar o
introducir librerías incompatibles con el ecosistema actual.

## 1. Resumen por capa

| Capa | Tecnología | Versión | Entry point |
| :--- | :--- | :--- | :--- |
| Monorepo | npm independientes (sin workspaces) | — | `package.json` en cada carpeta |
| Backend | NestJS | 11 | `backend/src/main.ts` |
| Backend | TypeScript | 5.7 | `backend/tsconfig.json` |
| Base de datos | PostgreSQL (driver `pg`) + TypeORM | — | `backend/src/app.module.ts` |
| Frontend | React | 19.2 | `frontend/src/main.tsx` |
| Frontend | Vite | 8.2 | `frontend/vite.config.ts` |
| Frontend | TypeScript | 6.0 | `frontend/tsconfig.app.json` |
| Frontend | react-router-dom | 7.18 | `frontend/src/routes/` |
| Móvil | Expo | ~57.0 | `mobile/App.tsx` |
| Móvil | React Native | 0.86.2 | `mobile/index.ts` |

## 2. Backend (NestJS 11 + PostgreSQL)

Dependencias de runtime clave:

| Paquete | Rol |
| :--- | :--- |
| `@nestjs/typeorm` + `typeorm` + `pg` | ORM sobre PostgreSQL (15 entidades) |
| `@nestjs/passport` + `passport-jwt` + `bcryptjs` | Auth JWT (expiración 8h) |
| `@nestjs/config` | Lectura de `.env` |
| `class-validator` + `class-transformer` | Validación de DTOs |
| `multer` + `sharp` | Subida y procesamiento de imágenes |
| `@supabase/supabase-js` | Persistencia de imágenes en la nube (hash) + bucket privado de rostros |
| `onnxruntime-node` | **Inferencia ArcFace int8 in-process** (Hito 3). Sin binding nativo extra ni servicio aparte; el modelo (63 MB, Apache-2.0) no se versiona |
| `@bwip-js/node` | Generación de etiquetas **Code128** (`toBuffer()` → PNG). Sustituye a `jsbarcode` |
| `xlsx` | Export/import de Excel (precios, venta mayor) |
| `sqlite3` | Base local usada en tests |

Decisiones:

- **TypeORM + PostgreSQL** con `autoLoadEntities` y `synchronize` controlado por
  `DB_SYNC` (true en dev, false en prod). `schema.sql` es el esquema de referencia
  (ojo: no define `factura_items`, que sí existe como entidad).
- **Sin Swagger**: la API se documenta a mano en `api.md`.
- **Prefijo global `/api`**, CORS habilitado, puerto 3000 por default.
- **Una sola familia `@bwip-js` por plataforma**: `@bwip-js/node` (backend),
  `@bwip-js/browser` (web), `@bwip-js/react-native` (móvil). Mismo proyecto en las 3, tipos
  incluidos, sin dependencias nativas. **No** usar `jsbarcode` ni `bwip-js` v3.
- **La IA corre dentro del backend**: un 2º servicio de inferencia no cabe cómodo en Render
  Free (512 MB, 750 h/mes) y agrega un 2º cold start. Ver [arquitectura.md](arquitectura.md) §3.2.

## 3. Frontend (React 19 + Vite 8)

| Paquete | Rol |
| :--- | :--- |
| `react-router-dom` | Enrutado + `ProtectedRoute` por rol |
| `lucide-react` | Iconos |
| `oxlint` (dev) | Linter (Rust-based) — **NO hay ESLint en frontend** |

Decisiones:

- **Sin librería de estado** (Redux/Zustand): se usan `Context` (`AuthContext`,
  `NotificationContext`) y estado local.
- **Sin Formik/React Hook Form**: formularios con estado local de React.
- **CSS plano**: 13 hojas de estilo en `src/styles/`, sin framework (ni Tailwind).
- Roles y enrutado: vistas protegidas por `roles` en `ProtectedRoute`.

## 4. Móvil (Expo 57 / React Native 0.86)

| Paquete | Rol |
| :--- | :--- |
| `@react-navigation/native-stack` + `drawer` | Navegación stack + drawer por rol |
| `expo-secure-store` | Token seguro (SecureStore nativo / localStorage en web) |
| `expo-image-picker` + `expo-document-picker` | Cámara y archivos (búsqueda por imagen, Excel) |
| `expo-camera` | Escáner de **códigos de barras** (Hito 3) y captura de rostro. `onBarcodeScanned` + multiscan, sin dependencia de render |
| `expo-print` + `expo-sharing` | Nota de venta (impresión/export) |
| `@expo-google-fonts/inter` + `@expo/vector-icons` | Tipografía e iconos |
| `react-native-reanimated` + `gesture-handler` | Drawer/animaciones |

Decisiones:

- **Expo 57** (SDK ~57.0.14). **Expo cambió bastante**: consultar
  `https://docs.expo.dev/versions/v57.0.0/` y `mobile/AGENTS.md` antes de escribir
  código móvil.
- Drawer por rol: `admin` (13 pantallas), `tienda` (10) e `inventario` (6). El escáner de
  códigos de barras está en los tres; registro facial y marcaje, solo en `admin`.
- API en `src/api/`: wrapper fetch con Bearer + `ApiError`; sesión en SecureStore.

## 5. Calidad y tooling

| Herramienta | Dónde | Comando |
| :--- | :--- | :--- |
| ESLint 9 + Prettier | backend | `npm run lint` / `npm run format` |
| oxlint | frontend | `npm run lint` (NO ESLint) |
| TypeScript strict | los 3 | parte de `build` / `tsc --noEmit` |
| Jest + supertest | backend | `npm test` / `npm run test:e2e` |
| Prettier | backend | `.prettierrc` |

Frontend **no tiene tests**; Móvil **no tiene scripts de lint/test/build**
(verificar con `npx tsc --noEmit` y `npx expo export`).

## 6. Reglas para agregar dependencias

1. Verificar que no exista ya una alternativa en el stack (context over Redux, CSS plano, etc.).
2. Versiones compatibles con el ecosistema (React 19, RN 0.86, Expo 57, NestJS 11).
3. No agregar dependencias **raíz** (`package.json` raíz solo tiene `@types/multer`).
4. Registrar el cambio aquí mismo, en el README y en `docs/entornos.md` si requiere `.env`.

## 7. Despliegue

| Superficie | Plataforma | Config |
| :--- | :--- | :--- |
| Frontend | Vercel | `frontend/vercel.json`, `.env.production` |
| Backend | Render (URL prod) | `.env.production` del frontend apunta a `https://inventarioautopartesi.onrender.com` |
| Móvil | EAS | `mobile/eas.json` |

Detalle en [despliegue.md](despliegue.md).