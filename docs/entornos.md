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

Config TypeORM: `ssl: { rejectUnauthorized: false }`, `autoLoadEntities: true`.

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