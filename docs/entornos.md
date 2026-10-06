# Variables de Entorno

Cada subproyecto lee su propio `.env` desde su carpeta. Las plantillas
`.env.example` se mantienen **fuera del repositorio** (decisión del equipo): esta
página es la referencia canónica de variables. Copia y rellena con valores reales;
jamás se comiten secretos en el repositorio.

## 1. Crear los archivos de entorno

Si cuentas con las plantillas `.env.example` (se conservan localmente), cópialas:

```bash
cp backend\.env.example   backend\.env
cp frontend\.env.example  frontend\.env.local
cp mobile\.env.example    mobile\.env
```

Si no las tienes, crea cada archivo con las variables documentadas en las secciones
siguientes de esta página.

| Archivo | Se versiona? | Contiene |
| :--- | :--- | :--- |
| `backend/.env` | No | Credenciales de DB, JWT |
| `frontend/.env.local` | No | URL de API local |
| `frontend/.env.production` | Sí | URL de API de producción (para Vercel) |
| `mobile/.env` | No | URL de API para el dispositivo |

> `frontend/.env.production` sí se versiona porque Vercel lo necesita en el build y
> su contenido no es un secreto (URL pública del backend).

## 2. Backend (`backend/.env`)

| Variable | Default | Descripción |
| :--- | :--- | :--- |
| `DB_HOST` | `localhost` | Host de PostgreSQL |
| `DB_PORT` | `5432` | Puerto de PostgreSQL |
| `DB_NAME` | `AutopartesDB` | Nombre de la base de datos |
| `DB_USER` | `postgres` | Usuario de BD |
| `DB_PASSWORD` | `postgres` | Contraseña de BD |
| `PORT` | `3000` | Puerto de la API NestJS |
| `JWT_SECRET` | (obligatorio cambiar) | Clave para firmar tokens JWT |
| `DB_SYNC` | `true` | `true` en dev sincroniza el esquema automáticamente; `false` en prod |
| `DB_SSL` | `false` | `true` solo si el host exige TLS (Supabase/Render). Un PostgreSQL local sin SSL falla si se fuerza |

Config TypeORM: `autoLoadEntities: true`, `synchronize: segun DB_SYNC`. El SSL es
condicional (`ssl: { rejectUnauthorized: false }` cuando `DB_SSL=true`, si no `false`),
porque Supabase exige TLS pero un PostgreSQL local rechaza el handshake.

### 2.1 Supabase Storage (imágenes)

| Variable | Default | Descripción |
| :--- | :--- | :--- |
| `SUPABASE_URL` | — | Project URL de Supabase. **Obligatoria** para subir imágenes |
| `SUPABASE_KEY` | — | `service_role` key. **Obligatoria** para subir imágenes |
| `SUPABASE_BUCKET` | `products` | Bucket **público** de imágenes de producto |
| `FACE_BUCKET` | `faces` | Bucket **privado** de fotos de rostro (Hito 3). Solo se accede con URL firmada |

> Sin `SUPABASE_URL` / `SUPABASE_KEY` el backend arranca (el cliente se crea lazy) pero
> `POST /products/:id/image` y `POST /users/face/register` responden **400**. El bucket
> `faces` debe existir y ser privado: policies solo `service_role`.
>
> ⚠️ **`SUPABASE_KEY` tiene que ser la clave `service_role` en TODOS los lados** (`.env`
> local, entorno de **Render** y secret de GitHub Actions). El bucket `products` funciona
> con la clave `anon` porque tiene policy, pero `faces` es privado sin policies: con `anon`
> la subida de un rostro falla con `new row violates row-level security policy (bucket:
> faces)` (visto el 06/10 en Render, donde la env quedó en `anon`). `service_role` ignora
> RLS (BYPASSRLS), así que cubre los dos buckets.

### 2.2 Reconocimiento facial (Hito 3)

| Variable | Default | Descripción |
| :--- | :--- | :--- |
| `ARCFACE_MODEL` | `models/arcfaceresnet100-11-int8.onnx` | Ruta al modelo ONNX (63 MB, Apache-2.0, **no** se versiona) |

El modelo no se versiona (63 MB) y **en Render tampoco viene en el repo**, así que
`npm run start:prod` ejecuta antes `prestart:prod` →
`scripts/ensure-arcface-model.mjs`, que lo baja de
`https://huggingface.co/onnxmodelzoo/arcfaceresnet100-11-int8/resolve/main/arcfaceresnet100-11-int8.onnx`
si no está en el servidor. El script es idempotente, baja a un `.descargando` y solo
renombra cuando el tamaño es el esperado (63 MB ± 5 %, así un HTML de error no cuela) y,
si falla la red, avisa y **no** tumba el arranque: el resto de la API funciona igual.

En local basta con `node scripts/ensure-arcface-model.mjs` (o bajar el archivo a mano
a `backend/spike/models/`). Si el archivo no está, el registro facial y el marcaje por
rostro responden **503** con un mensaje que lo dice; el resto de la API sigue
funcionando (la `InferenceSession` se carga en la primera inferencia, no al arrancar).

- `POST /face/warmup` (admin) fuerza esa carga y devuelve los ms: sirve para medir el
  cold start de Render con el modelo en RAM.
- `GET /face/status` (admin) dice si el modelo está disponible y si el índice en
  memoria coincide con los rostros de la BD (rehidratación tras un spin-down).
- Contrato del modelo en local: `npm run face:check`.

## 3. Frontend (`frontend/.env.local` y `.env.production`)

| Variable | Local | Producción |
| :--- | :--- | :--- |
| `VITE_API_URL` | `http://localhost:3000/api` | `https://inventarioautopartesi.onrender.com/api` |

- Debe incluir el prefijo **`/api`**.
- Vite la expone en el cliente únicamente con el prefijo `VITE_`.

## 4. Mobile (`mobile/.env`)

| Variable | Valor | Cuándo |
| :--- | :--- | :--- |
| `EXPO_PUBLIC_API_URL` | `http://localhost:3000` | Expo web / iOS simulador |
| | `http://10.0.2.2:3000` | Emulador Android |
| | `http://IP-de-tu-PC:3000` | Dispositivo físico (misma red WiFi) |
| | `https://inventarioautopartesi.onrender.com` | Compilación de producción |

- NO incluye `/api`: el cliente lo agrega automáticamente (`src/config.ts`).
- En web/emuladores/runtime se resuelve el default desde `EXPO_PUBLIC_API_URL`.

## 5. Buenas prácticas

1. Nunca commitear `.env` reales; el `.gitignore` raíz los cubre (`.env`, `.env.local`, `.env.*.local`).
2. Si agregas una variable nueva, actualizar esta página (el `.env.example` local correspondiente si lo conservas).
3. `VERCEL_TOKEN` es opcional y solo para despliegue por script; no versionarlo.
4. No anides secretos en JSON/`vercel.json` dentro del repo.