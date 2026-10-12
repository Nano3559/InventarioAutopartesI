# AutoParts Pro · Sistema de Inventario, Ventas y Asistencia Biométrica

> Plataforma integral para 7 importadoras de autopartes (4 almacenes + 3 tiendas) con más de
> 10.000 productos en catálogo. Gestiona inventario distribuido, ventas al detalle y al por mayor,
> pagos multi-método, traslados, devoluciones, costos, precios, reportes gerenciales, **identificación
> por códigos de barras Code128** y **control de asistencia mediante reconocimiento facial con IA**.

**Proyecto de Programación Avanzada — Unifranz** · Hito 3 entregado el 06/10/2026.

| Capa | Tecnologías | Despliegue |
| :--- | :--- | :--- |
| **Backend** | NestJS 11 + TypeORM + PostgreSQL + `onnxruntime-node` (ArcFace IA) | Render (`inventarioautopartesi.onrender.com`) |
| **Web Admin** | React 19 + Vite 8 + TypeScript + `@bwip-js/browser` | Vercel |
| **App Móvil** | Expo 57 / React Native 0.86 + `expo-camera` | Expo EAS |
| **Almacenamiento** | Supabase Storage (`products` público, `faces` privado) | Supabase Cloud |

---

## Tabla de contenidos

- [Características principales](#características-principales)
  - [Inventario y Catálogo](#inventario-y-catálogo)
  - [Ventas y Facturación](#ventas-y-facturación)
  - [Flujo de Visión Asistida (Hito 3)](#flujo-de-visión-asistida-hito-3)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Roles del sistema](#roles-del-sistema)
- [Puesta en marcha](#puesta-en-marcha)
- [Scripts útiles](#scripts-útiles)
- [Variables de entorno](#variables-de-entorno)
- [Documentación técnica](#documentación-técnica)
- [Despliegue](#despliegue)
- [Estado del proyecto](#estado-del-proyecto)

---

## Características principales

### Inventario y Catálogo
- **Control multi-ubicación**: Stock desagregado en 7 sucursales (4 almacenes y 3 tiendas físicas).
- **Filtros avanzados**: Búsqueda por marca, modelo, año, fabricante y código OEM.
- **Movimientos y logística**: Registro de traslados entre sucursales y gestión de solicitudes de reposición.
- **Búsqueda por imagen**: Búsqueda asistida de repuestos mediante comparación fotográfica (web y móvil).

### Ventas y Facturación
- **Punto de Venta (POS)**: Carrito ágil, cálculo automático de impuestos y emisión de notas de venta.
- **Pagos multi-método**: Pagos simples o combinados en efectivo, transferencia bancaria, QR y crédito.
- **Venta por mayor**: Carga manual o ingesta masiva desde hojas de cálculo Excel validando stock disponible.
- **Costos y precios**: Gestión de facturas de proveedores y reglas de margen de ganancia (+20% a +80%).

### Flujo de Visión Asistida (Hito 3)

#### 1. Identificación por Códigos de Barras (Code128)
- **Generación masiva y unitaria**: Algoritmo `AP-<id>-<codigoFabrica>` codificado exclusivamente en barras Code128 (`includetext: false`) mediante `@bwip-js/node` y `@bwip-js/browser`.
- **Impresión masiva A4**: Generación de plantillas listas para impresión física de etiquetas para el catálogo completo.
- **Escáner móvil**: Lectura instantánea con `expo-camera` en la app móvil que consulta en Render y muestra la ficha del repuesto (precio, stock total, stock por tienda e imagen).

#### 2. Control de Asistencia Facial con IA (ArcFace in-process)
- **Modelo de IA embebido**: Inferencia *in-process* dentro de NestJS con `onnxruntime-node` utilizando **ArcFace int8** (`onnxmodelzoo/arcfaceresnet100-11-int8`, Apache-2.0, embedding de 512 dimensiones). Sin microservicios externos ni dependencias pesadas de GPU.
- **Registro facial**: Formulario móvil con encuadre oval guiado (112×112) que extrae, promedia y normaliza el embedding, almacenando la fotografía de auditoría en el bucket privado `faces` de Supabase.
- **Marcaje inteligente**: Detección biométrica por similitud coseno con umbral **estricto en 0.8** (configurable por env). Registro automático de `entrada` o `salida` según el flujo diario; si nadie supera el umbral se avisa "usuario desconocido, debe registrarse" sin registrar nada.
- **Privacidad y cumplimiento legal (Ley 26935 Bolivia)**: Fotografías servidas exclusivamente mediante URLs firmadas temporales (1 hora) y opción de supresión biométrica definitiva (`eliminarEmbedding: true`).

#### 3. Módulos Web de Gestión y Auditoría (Web Admin)
- **Gestión de Personal (`/personal`)**: Administración de trabajadores de las 7 sucursales, visualización de foto firmada, estado de biometría y botón de baja biométrica.
- **Historial de Asistencia (`/asistencia`)**: Tabla paginada con filtros por fecha, sucursal, empleado, tipo de marcaje y método (ArcFace IA vs Manual), con modal de corrección administrativa.
- **Dashboard en Tiempo Real (`/asistencia/dashboard`)**: Métricas consolidadas del día, recuento de presentes y ausentes por tienda, control de personal dentro del local y registro de los últimos 10 marcajes en vivo.
- **Modo Tiqueador Kiosco (Tablet Móvil)**: Bloqueo de la tablet en modo reloj biométrico con autenticación administrativa y tienda física persistida en `SecureStore`.

---

## Stack tecnológico

| Capa | Tecnologías | Notas |
| :--- | :--- | :--- |
| **Base de datos** | PostgreSQL 16 · TypeORM (15 entidades) | Alojadada en Supabase Cloud con SSL |
| **Backend** | NestJS 11 · TypeScript 5.7 · Passport/JWT · `onnxruntime-node` · `@bwip-js/node` | Monolito modular en puerto 3000 |
| **Frontend** | React 19 · Vite 8 · TypeScript · `react-router-dom` 7 · `lucide-react` · `@bwip-js/browser` | CSS plano modular, sin librerías pesadas |
| **Móvil** | Expo 57 · React Native 0.86 · `expo-camera` · `@bwip-js/react-native` · `expo-secure-store` | Navegación nativa Stack + Drawer |
| **Almacenamiento** | Supabase Storage · sharp · multer | Buckets `products` (público) y `faces` (privado) |
| **Calidad** | oxlint (web) · ESLint + Prettier (backend) · Jest + Supertest (129 specs e2e) | 0 errores y 0 warnings en builds |

Detalle técnico completo y justificaciones: [docs/stack-tecnologico.md](docs/stack-tecnologico.md).

---

## Estructura del repositorio

```
├── backend/            API NestJS (prefijo /api, puerto 3000)
│   ├── src/
│   │   ├── auth/          login JWT + guards RBAC
│   │   ├── users/         CRUD de empleados + baja biométrica
│   │   ├── products/      catálogo + generación y consulta Code128
│   │   ├── attendance/    historial, dashboard y marcaje de asistencia
│   │   ├── face/          inferencia ArcFace ONNX + índice de memoria
│   │   ├── entities/      15 entidades TypeORM (incluye Asistencia)
│   │   └── seed.ts        siembra de datos reales (7 sucursales, productos)
│   ├── schema.sql         esquema PostgreSQL de referencia
│   └── test/              129 tests e2e automatizados
├── frontend/           SPA React (Vite) — admin y tienda
│   └── src/
│       ├── services/      users, attendance, products, sales, locations...
│       ├── components/    personal, attendance, inventory, ventas...
│       ├── pages/
│       │   ├── personal/      Gestión de Personal y Rostros (/personal)
│       │   ├── attendance/    Historial (/asistencia) y Dashboard (/asistencia/dashboard)
│       │   └── ...            inventario, ventas, costos, precios, reportes
│       └── styles/        CSS plano modular con modo oscuro
├── mobile/             App Expo — admin, tienda e inventario
│   └── src/
│       ├── screens/       Scanner, FaceRegister, Attendance, Inventario, POS...
│       ├── components/    FaceCamera, AdminPasswordGate, TiendaSelector...
│       ├── context/       TiqueadorContext (kiosco para tablets)
│       └── storage/       terminal.ts (persistencia de sucursal en SecureStore)
├── docs/               Documentación técnica indexada
├── Plan Hito 3.md      Plan día a día ejecutado del Hito 3
├── requerimientos.md   Requisitos del sistema del cliente
└── AGENTS.md           Instrucciones y contexto del proyecto
```

---

## Roles del sistema

| Rol | Alcance en el sistema |
| :--- | :--- |
| **`admin`** | Acceso total: inventario global, precios, costos, reportes, personal, auditoría de asistencia, dashboard en vivo y modo tiqueador. |
| **`tienda`** | Operación de sucursal: Punto de Venta (POS), venta mayor, devoluciones, solicitudes al almacén y escáner de códigos de barras. |
| **`inventario`** | Control de almacén: recepción de stock, traslados entre sucursales y escaneo de autopartes. |

---

## Puesta en marcha

### 1. Requisitos previos
- Node.js 20+ y npm
- PostgreSQL 16 (local o Supabase)
- Expo Go o build de desarrollo para la aplicación móvil

### 2. Variables de entorno
Configura los archivos `.env` según las especificaciones de [docs/entornos.md](docs/entornos.md):
- `backend/.env`
- `frontend/.env.local`
- `mobile/.env`

### 3. Backend
```bash
cd backend
npm install
npm run start:dev        # API escuchando en http://localhost:3000/api
```

Para verificar el contrato biométrico de ArcFace:
```bash
npm run face:check       # Valida el modelo ONNX int8 (512 dims, norma 1)
```

### 4. Frontend Web
```bash
cd frontend
npm install
npm run dev              # Vite escuchando en http://localhost:5173
```

### 5. Aplicación Móvil
```bash
cd mobile
npm install
npm start                # Expo Metro Bundler
```

---

## Scripts útiles

| Comando | Módulo | Descripción |
| :--- | :--- | :--- |
| `npm run start:dev` | backend | Servidor NestJS en modo desarrollo con hot-reload |
| `npm run build` | backend | Compilación de producción (`nest build`) |
| `npm run face:check` | backend | Validación del contrato real del modelo ArcFace ONNX |
| `npm test` | backend | Tests unitarios con Jest |
| `npm run test:e2e` | backend | 129 tests e2e automatizados de asistencia y catálogo |
| `npm run seed` | backend | Población de datos reales en base de datos |
| `npm run dev` | frontend | Servidor web de desarrollo (Vite) |
| `npm run build` | frontend | Typecheck (`tsc -b`) y build de producción |
| `npm run lint` | frontend | Auditoría rápida con **oxlint** |
| `npx tsc --noEmit` | mobile | Typecheck de TypeScript en Expo |
| `npx expo export` | mobile | Verificación de build de producción móvil |

---

## Variables de entorno

Resumen de variables esenciales ([docs/entornos.md](docs/entornos.md)):

| Variable | Módulo | Descripción |
| :--- | :--- | :--- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Backend | Conexión a la base de datos PostgreSQL |
| `JWT_SECRET` | Backend | Clave para firma de tokens Bearer |
| `SUPABASE_URL`, `SUPABASE_KEY` | Backend | Conexión con Supabase Storage |
| `SUPABASE_BUCKET` | Backend | Bucket para fotos de repuestos (`products`) |
| `FACE_BUCKET` | Backend | Bucket privado para biometría (`faces`) |
| `ARCFACE_MODEL` | Backend | Ruta al modelo ArcFace ONNX int8 |
| `VITE_API_URL` | Frontend | URL base del backend (incluye `/api`) |
| `EXPO_PUBLIC_API_URL` | Móvil | URL base del backend (sin `/api`) |

---

## Documentación técnica

| Documento | Enfoque |
| :--- | :--- |
| [docs/README.md](docs/README.md) | Índice general de la documentación técnica |
| [docs/api.md](docs/api.md) | Contrato completo de endpoints REST (asistencia, productos, ventas, usuarios) |
| [docs/arquitectura.md](docs/arquitectura.md) | Arquitectura del sistema y §3.2 Modelo de reconocimiento facial sin detector |
| [docs/stack-tecnologico.md](docs/stack-tecnologico.md) | Versiones exactas y justificación técnica de la arquitectura |
| [docs/e2e-asistencia.md](docs/e2e-asistencia.md) | Pruebas e2e de asistencia biométrica |
| [docs/git-convention.md](docs/git-convention.md) | Guía de ramas, commits convencionales y flujo de integración |
| [docs/entornos.md](docs/entornos.md) | Tabla detallada de variables de configuración |
| [docs/despliegue.md](docs/despliegue.md) | Guía de despliegue en Vercel, Render y Expo EAS |
| [Plan Hito 3.md](Plan%20Hito%203.md) | Plan y bitácora de ejecución del Hito 3 |

---

## Despliegue

- **Frontend**: Alojado en [Vercel](https://vercel.com/) con redirecciones SPA (`vercel.json`).
- **Backend**: Desplegado en [Render](https://render.com/) con script de pre-arranque (`scripts/ensure-arcface-model.mjs`) que garantiza la descarga del modelo ONNX int8 si no existe en el contenedor.
- **Base de datos & Storage**: Alojados en Supabase Cloud con SSL forzado y bucket biométrico privado.
- **Móvil**: Compilado mediante perfiles EAS (`eas.json`).

---

## Estado del proyecto

**Hito 3 Finalizado con Éxito (06/10/2026).**
- Flujo de códigos de barras Code128 operativo en web y móvil.
- Flujo de reconocimiento facial con IA ArcFace in-process verificado con 129 pruebas e2e verdes.
- Módulos de Personal, Historial de Asistencia y Dashboard en tiempo real operativos en producción.
- Modo Tiqueador Kiosco habilitado para tablets de sucursal.

---

## Licencia

Proyecto académico — Programación Avanzada (Unifranz). Uso exclusivo del equipo de desarrollo. Sin licencia pública.