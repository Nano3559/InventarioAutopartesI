Documento de Integración Hito 3 - Para Brian y Marco
Estado: Documento de referencia técnica. No asigna tareas — solo documenta decisiones, estado actual, arquitectura y gaps para que ambos tengan la misma base de conocimiento antes de planificar.
1. Resumen Ejecutivo
El Hito 3 agrega dos flujos independientes al sistema existente:
Flujo	Qué hace	Estado BD
A. Código de Barras	Generar etiquetas Code128, escanear con cámara, identificar producto	✅ Lista (products.codigo)
B. Asistencia Facial	Registrar personal con fotos, marcaje diario por reconocimiento, historial	✅ Lista (asistencia, users extendido)
Arquitectura objetivo: Backend NestJS en Render + Frontend Vercel + Mobile Expo → Supabase Postgres + Storage. Nuevo: microservicio de IA (FastAPI u onnxruntime-node) para embeddings y matching facial.
2. Qué Ya Existe en el Proyecto (Base Actual)
2.1 Backend (NestJS 11 + TypeORM + PostgreSQL)
Componente	Estado
Módulos existentes	auth, users, products, locations, sales, movimientos, solicitudes, proveedores, costos, devoluciones, precios, reportes
Entidades TypeORM	14 en backend/src/entities/
Autenticación	JWT + Passport + bcrypt, roles admin | tienda | inventario
Subida imágenes	Multer + Sharp + Supabase Storage (bucket products)
Config TypeORM	autoLoadEntities: true, synchronize: true (dev), ssl: { rejectUnauthorized: false }
Seed	npm run seed → 7 ubicaciones + productos + usuarios de prueba
2.2 Frontend Web (React 19 + Vite + TypeScript)
Capa	Detalle
Rutas	Protegidas por rol (admin, tienda)
Layout	Sidebar por rol + Navbar
Estado	Contextos AuthContext (JWT + localStorage) + NotificationContext
API	Cliente fetch en src/api/ + servicios por dominio en src/services/
Estilos	CSS plano (sin librería UI)
Deploy	Vercel (vercel.json)
2.3 Mobile (Expo 57 / React Native 0.86)
Capa	Detalle
Navegación	Drawer por rol (admin/tienda comparten 9 pantallas; inventario 5)
Auth	expo-secure-store + JWT
API	Wrapper fetch en src/api/ con Bearer + ApiError
Pantallas existentes	Login, Dashboards, Inventario/Detalle, Venta (POS), Venta Mayor (Excel), Historial, Ventas edición, Devoluciones, Solicitudes, Reportes, Búsqueda por imagen
Deploy	EAS (eas.json)
2.4 Base de Datos (Supabase Postgres)
- Proyecto: kdwdrogjvxvldtxsdpmg (URL: https://kdwdrogjvxvldtxsdpmg.supabase.co)
- BD local dev: localhost:5432/autopartesdb (PostgreSQL 18.6)
- Storage: Bucket products (imágenes de producto)
- Esquema actual: 14 tablas (locations, users, products, clientes, proveedores, inventory, sales, sale_items, payments, movimientos, solicitudes, facturas, factura_items, devoluciones)
3. Qué Se Hizo con la Base de Datos (Hito 3)
Archivo ejecutable: backend/sql/hito3.sql (idempotente, probado 2× en BD limpia)
3.1 Tabla Nueva: asistencia
CREATE TABLE public.asistencia (
  id              serial PRIMARY KEY,
  "usuarioId"     integer NOT NULL REFERENCES public.users(id),
  "locationId"    integer REFERENCES public.locations(id) ON DELETE SET NULL,
  fecha           timestamp NOT NULL DEFAULT now(),
  tipo            varchar NOT NULL,          -- 'entrada' | 'salida'
  confianza       double precision,          -- score 0-1 del modelo
  metodo          varchar NOT NULL DEFAULT 'automatico', -- 'automatico' | 'manual'
  "confirmadoPorId" integer REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX IX_asistencia_fecha ON public.asistencia (fecha);
CREATE INDEX IX_asistencia_usuario_fecha ON public.asistencia ("usuarioId", fecha);
Por qué estos campos:
- locationId → 7 tiendas, el marcaje debe saber dónde ocurrió
- confianza → score del modelo para auditoría y threshold
- metodo → distingue automático vs confirmación manual (prioridad #4 del plan)
- confirmadoPorId → trazabilidad de quién validó un marcaje dudoso
3.2 Extensión de users (5 campos nuevos)
Campo	Tipo	Propósito
apellido	varchar NULL	Separar nombre/apellido (el plan pide "nombre y apellido")
embedding	jsonb NULL	Vector 512-dims (o 128) del rostro — no usa pgvector, el matching es en FastAPI
facePhoto	text NULL	URL firmada en Supabase Storage (bucket faces) para listado web
faceRegisteredAt	timestamp NULL	Cuándo se registró el rostro
activo	boolean NOT NULL DEFAULT true	Estado del personal (baja lógica sin borrar embedding)
3.3 Campos Ya Existentes (Validados)
Tabla.Campo	Estado	Nota
products.codigo	✅ varchar UNIQUE	37 productos con NULL — se genera lazy al pulsar "Generar etiqueta"
movimientos.cantidadDeclarada	✅ integer NULL	Para recepción declarada vs conteo
movimientos.tipo	✅ varchar NULL	'traslado' | 'entrada'
3.4 Bucket Pendiente: faces
- No existe aún. Crear en Supabase Storage → Privado (no público como products)
- Acceso vía Signed URLs (createSignedUrl, expiración 1h)
- Políticas: solo service_role (backend) puede subir/leer
4. Flujo de Funcionamiento (Arquitectura Objetivo)
4.1 Flujo A — Código de Barras (Identidad de Producto)
┌─────────────┐     GENERAR ETIQUETA      ┌──────────────────┐
│  Web Admin  │──────────────────────────▶│  GET /products/  │
│  (Marco)    │  click "Generar"          │  :id/barcode     │
└─────────────┘                           │  (bwip-js)       │
                                          │  PNG Code128     │
                                          └────────┬─────────┘
                                                   │
                                                   ▼
┌─────────────┐     ESCANEAR (Mobile)      ┌──────────────────┐
│  Mobile     │──────────────────────────▶│  GET /products/  │
│  (Raúl)     │  expo-camera multiscan    │  by-barcode/:cod │
└─────────────┘                           │  Devuelve:       │
                                          │  {producto,      │
                                          │   stock, precio, │
                                          │   imagen}        │
                                          └──────────────────┘
Puntos clave:
- Código generado por el equipo (Code128), no código de fábrica
- products.codigo = identidad propia, codigoFabrica = código del fabricante (ya existe, NOT NULL)
- Multiscan: escanear varios códigos sin salir de la pantalla
- Si codigo es NULL, primera generación lo setea y devuelve PNG
4.2 Flujo B — Asistencia Facial (Dos Fases)
Fase 1: REGISTRO (una vez por persona)
┌─────────────┐     REGISTRO PERSONAL      ┌──────────────────┐
│  Web Admin  │──────────────────────────▶│  POST /users/    │
│  (Marco)    │  nombre + apellido         │  face/register   │
│             │  N fotos webcam            │  (multipart)     │
└─────────────┘                           └────────┬─────────┘
                                                   │
                              ┌────────────────────▼────────────────────┐
                              │           BACKEND (Brian)               │
                              │  1. Recibe multipart                    │
                              │  2. POST /face/embed → FastAPI          │
                              │  3. Recibe embedding (vector)           │
                              │  4. Guarda en users:                    │
                              │     embedding (jsonb)                   │
                              │     facePhoto (URL bucket faces)        │
                              │     faceRegisteredAt, apellido, activo  │
                              │  5. FastAPI rehidrata índice en memoria │
                              └─────────────────────────────────────────┘
Fase 2: MARCAJE DIARIO
┌─────────────┐     MARCAR ASISTENCIA      ┌──────────────────┐
│  Mobile     │──────────────────────────▶│  POST /attendance│
│  (Raúl)     │  Foto en vivo              │  /check          │
└─────────────┘                           │  (multipart)     │
                                          └────────┬─────────┘
                                                   │
                              ┌────────────────────▼────────────────────┐
                              │           BACKEND (Brian)               │
                              │  1. POST /face/match → FastAPI          │
                              │  2. Recibe {usuarioId, nombre, conf.}   │
                              │  3. Si confianza ≥ 0.55 → automático    │
                              │     Si < 0.55 → devuelve candidato +    │
                              │     pide confirmación manual (UI)       │
                              │  4. INSERT INTO asistencia:             │
                              │     usuarioId, fecha, tipo, confianza,  │
                              │     metodo, locationId, confirmadoPorId │
                              └─────────────────────────────────────────┘
Fase 3: HISTORIAL Y DASHBOARD
Endpoint	Qué devuelve
GET /api/attendance?fecha=&usuarioId=&locationId=	Lista paginada con filtros
PATCH /api/attendance/:id	Corrección manual (cambiar tipo/fecha)
Dashboard día	Presentes / Ausentes por tienda
5. Estado Actual vs Estado Objetivo
Componente	Actual
BD Supabase	✅ asistencia + users extendido + products.codigo
BD Local	✅ Sincronizada vía synchronize: true
Entidades TypeORM	✅ AsistenciaEntity, UserEntity extendida
Módulo Attendance	✅ AttendanceModule registrado en AppModule
Constantes	✅ TIPOS_ASISTENCIA, METODOS_ASISTENCIA, UMBRAL_CONFIANZA_FACIAL=0.55
SSL/Config	✅ Autodetect (local sin TLS, Supabase/Render con TLS)
Endpoints Products	❌ by-barcode, :id/barcode
Endpoints Users	❌ POST /face/register
Endpoints Attendance	❌ POST /check, GET /attendance, PATCH /:id
FastAPI / IA	❌ Sin decidir: FastAPI vs onnxruntime-node
Modelo Facial	❌ Sin definir: buffalo_sc vs MobileFaceNet
Bucket faces	❌ No creado
Mobile: Escáner	❌ ScannerScreen + expo-camera multiscan
Mobile: Registro Facial	❌ FaceRegisterScreen (form + N capturas)
Mobile: Marcaje	❌ AttendanceScreen (foto → match → confirmación)
Mobile: Historial	❌ AttendanceHistoryScreen
Web: Productos	❌ Columna código + botón generar (jsbarcode)
Web: Personal	❌ Listado + registrar (nombre, apellido, N fotos)
Web: Asistencia	❌ Historial filtros + Dashboard día
Deploy FastAPI	❌ Dockerfile + Render service
6. Información a Considerar (Decisiones Pendientes)
6.1 Modelo de IA — NO DEFINIDO
Opción	Tamaño	Precisión (MR-ALL)	Licencia
buffalo_sc (InsightFace)	16 MB	71.87%	Non-commercial research only
MobileFaceNet (standalone)	13 MB	99.55% LFW	Apache 2.0 / MIT típica
buffalo_l (default)	326 MB	91.25%	Non-commercial research only
Impacto: Define tamaño Docker, RAM en Render, precisión, y si hay riesgo legal (InsightFace = solo investigación no comercial).
Nota: El plan original usaba YOLO para conteo (descartado). El reconocimiento facial usa modelo preentrenado — no hay dataset que crear ni entrenamiento.
6.2 Integración IA: FastAPI vs onnxruntime-node — NO DEFINIDO
Criterio	FastAPI (Microservicio)
Arquitectura	Servicio separado (Render 2do service)
Deploy	Dockerfile + 2do servicio Render
RAM en Render Free	2 servicios × 512MB = excede 750h/mes
Cold start	2 servicios duermen → 2 cold starts
Rehidratación índice	Obligatoria en startup FastAPI
Librerías	InsightFace listo (detector + landmark + rec)
Mantenimiento	2 codebases
Precisión	InsightFace probado
Recomendación preliminar: onnxruntime-node en NestJS si el objetivo es simplificar deploy y costos. FastAPI si se valora aislamiento y librería madura.
No hay decisión tomada. El equipo debe elegir antes de que Brian arranque la parte de IA.
6.3 Modelo de Despliegue Demo — Pendiente
Opción	Pros
Render (prod real)	Demuestra arquitectura completa
Local (WiFi)	Full CPU/RAM, modelo grande, cero cold start, full control
7. Supuestos y Restricciones Técnicas
Tema	Detalle
Autenticación FastAPI	Shared secret / API key (FACE_API_KEY) entre NestJS y FastAPI
Matching facial	1:N en memoria (índice cargado al inicio). Threshold default 0.55 (constante UMBRAL_CONFIANZA_FACIAL).
Fallas de matching	Si confianza < threshold O no hay candidatos → UI pide confirmación manual (muestra nombre candidato). Prioridad #4 del plan.
Índice en memoria	Se pierde en cada cold start/redeploy. Rehidratación obligatoria al arrancar: SELECT id, embedding FROM users WHERE embedding IS NOT NULL.
Fotos de referencia	N fotos en registro → un solo embedding (promedio/consolidado). Solo se guarda 1 facePhoto para UI. Las N fotos son descartables salvo que se quiera re-entrenar.
Bucket faces	Privado. URLs firmadas (createSignedUrl, 1h TTL). No acceso público.
Privacidad / Legal	Datos biométricos = sensibles (Ley 26935 Bolivia). Requiere consentimiento explícito, derecho a supresión, logs sin imágenes. No está implementado.
Supabase Pausing	Free tier pausa a los 7 días sin actividad. Ping diario (GitHub Actions cron) evita pausa.
Render Limits	512 MB RAM, 0.1 vCPU, spin-down 15 min, 750 hrs/mes/workspace. No soporta 2 servicios 24/7 gratis.
8. Archivos de Referencia en el Repo
Archivo	Qué contiene
backend/sql/hito3.sql	DDL idempotente completo para Supabase
backend/src/entities/asistencia.entity.ts	Entidad TypeORM asistencia
backend/src/entities/user.entity.ts	User extendido (5 campos nuevos)
backend/src/attendance/attendance.module.ts	Módulo NestJS registra entidad
backend/src/common/constants.ts	Tipos, métodos, umbral facial
backend/src/app.module.ts	SSL autodetect + AttendanceModule
backend/schema.sql	Esquema referencia actualizado (15 tablas)
docs/arquitectura.md	Modelo de datos (15 entidades), módulos, ref a sql/hito3.sql
docs/entornos.md	Variables de entorno (incluye DB_SSL, FACE_SERVICE_URL)
Plan Hito 3.md	Plan original (base, 15 días, 3 roles)
9. Próximos Pasos (Para Alinear al Equipo)
1. Definir modelo facial → buffalo_sc vs MobileFaceNet (afecta Docker, RAM, precisión, licencia)
2. Definir integración IA → FastAPI (2do servicio) vs onnxruntime-node en NestJS (1 servicio)
3. Definir demo final → Render prod vs Local WiFi (afecta cold start, rehidratación, modelo usable)
4. Crear bucket faces en Supabase Storage (privado, policies service_role)
5. Brian valida spike de integración IA (2-4h) con la opción elegida → mide RAM + latencia
6. Equipo acuerda plan día a día ajustado (el original es 15 días; prod real añade ~3 días por FastAPI deploy + QA)
10. Glosario Rápido
Término	Significado
Embedding	Vector numérico (512-dims InsightFace, 128-dims MobileFaceNet) que representa un rostro
Matching 1:N	Comparar 1 foto contra N embeddings registrados → devuelve top-K candidatos + score
Threshold / Umbral	Score mínimo para considerar match automático (default 0.55)
Rehidratación	Cargar embeddings de BD a memoria al arrancar el servicio de IA
Cold start	Tiempo que tarda un servicio "dormido" (Render spin-down) en responder al primer request
Spin-down	Render apaga servicios Free tras 15 min sin tráfico entrante
Signed URL	URL temporal con firma para acceder a objeto privado en Supabase Storage
RLS	Row Level Security (Supabase) — no se usa en este proyecto; el backend usa service_role
11. Contacto / Dudas
- Brian (Backend + IA): decisiones de modelo, integración, deploy FastAPI/Node
- Marco (Frontend Web): pantallas, UX, jsbarcode, dashboard
- Raúl (Mobile): cámara, multipart, UX registro/marcaje, EAS build
Este documento es vivo. Actualizar cuando se tomen las decisiones pendientes (modelo, integración, demo).