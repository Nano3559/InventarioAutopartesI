# Despliegue

Guía de publicación de los tres frentes. Entorno de producción actual:

| Superficie | Plataforma | URL / config |
| :--- | :--- | :--- |
| Frontend (web) | Vercel | `frontend/vercel.json` + `.env.production` |
| Backend (API) | Render | `https://inventarioautopartesi.onrender.com` |
| Móvil | Expo EAS | `mobile/eas.json` (builds Android/iOS) |

## 1. Backend (Render)

Configuración real del servicio (`srv-dabk6b2d0e5s739lkgr0`, root dir `backend`,
plan free, región Oregon):

| Ajuste | Valor |
| :--- | :--- |
| Build command | `npm install && npm run build` |
| Start command | `npm run start:prod` |
| Health check path | `/api` |
| Auto deploy | sí, desde `main` |

1. Variables en el dashboard de Render (ver `docs/entornos.md` §Backend). Además de
   las de base de datos: `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_BUCKET` (imágenes de
   producto), `FACE_BUCKET=faces` (bucket privado de rostros) y `ARCFACE_MODEL` si se
   quiere una ruta distinta a `models/arcfaceresnet100-11-int8.onnx`.
2. `DB_SYNC=false` en producción (migraciones controladas; no `synchronize`).
3. El modelo ArcFace (63 MB) **no está en el repo**: `npm run start:prod` dispara antes
   `prestart:prod` → `scripts/ensure-arcface-model.mjs`, que lo descarga si falta. El
   disco de Render persiste entre spin-down, pero **cada deploy borra el filesystem**,
   así que el archivo se baja en el primer arranque de cada despliegue (~8 s).
4. Verificar salud: `GET https://inventarioautopartesi.onrender.com/api` responde 200.

> ✅ **RESUELTO (06/10):** `SUPABASE_KEY` en el entorno de Render quedó con la clave
> **`anon`** y el registro facial fallaba con `400 row-level security policy (bucket: faces)`
> (el bucket `faces` es privado, sin policies: solo `service_role` lo alcanza; `products`
> funciona con `anon` porque tiene policy). Se corrigió poniendo la **`service_role`** de
> Supabase como `SUPABASE_KEY` en el dashboard de Render (la misma del secret del ping en
> GitHub Actions) + `Manual Deploy`. Ver `docs/entornos.md` §Backend.

### 1.1 Plan free: spin-down y cold start

El plan free apaga la instancia tras 15 min sin tráfico. Al primer request el arranque
tarda (Nest + TypeORM contra Supabase con TLS). Para medirlo y comprobar que el
reconocimiento facial se rehidrata:

```bash
# 1. Estado del servicio y del índice en memoria (admin)
curl -H "Authorization: Bearer $TOKEN" \
  https://inventarioautopartesi.onrender.com/api/face/status

# 2. Cargar el modelo ArcFace a mano y ver cuánto tarda
curl -X POST -H "Authorization: Bearer $TOKEN" \
  https://inventarioautopartesi.onrender.com/api/face/warmup

# 3. Cold start: sin tráfico, el primer request tarda; medirlo con cronometro
curl -w "\n%{time_total}s\n" -o /dev/null -s https://inventarioautopartesi.onrender.com/api
```

`indiceEnMemoria === rostrosEnBase` en `/face/status` es la prueba de que el
`onModuleInit` rehidrató los embeddings tras el spin-down. `modelo.cargada` es `false`
salvo después de un `warmup` o una inferencia: la `InferenceSession` es perezosa a
propósito para no pagar 92 MB de RAM y ~0.5 s si nadie marca asistencia.

**Medido el 04/10/2026 contra el servicio real** (`npm run spike:rehidratacion`, que mete
un embedding sintético en un usuario temporal, espera el apagado y lo borra al final):

| Medida | Valor |
| :--- | :--- |
| Descarga del modelo en el arranque (`prestart:prod`) | ~8 s, 62.7 MB, en `models/` |
| Primer request tras 17 min sin tráfico | **52.7 s** |
| Carga del modelo con la sesión fría (`warmup`) | **2.2 s** (561 ms en local) |
| Rehidratación | `rostrosEnBase=1, indiceEnMemoria=1, indiceCompleto=true` |

> ⚠️ **Los 52.7 s son el riesgo operativo del plan free**, no del código: la app móvil y la
> web tienen que avisar "despertando el servidor…" en el primer request tras un rato de
> inactividad, y para la demo hay que dejar Render con tráfico reciente (o despertarlo un
> par de minutos antes).

## 2. Frontend (Vercel)

1. `frontend/.env.production` debe apuntar al backend desplegado
   (`VITE_API_URL=https://inventarioautopartesi.onrender.com/api`).
2. La SPA se sirve desde `frontend/`; `vercel.json` define el framework y rewrites
   para el enrutado del cliente (react-router).

```bash
cd frontend
npm run build                       # tsc -b && vite build (typecheck incluido)
vercel --prod                       # o importar el repo en el dashboard
```

Checks locales antes de publicar: `npm run build` en verde y `npm run lint` (oxlint).

## 3. Móvil (Expo EAS)

1. Ajustar `mobile/app.json` (título, slugs, paquetes `com.autopartes.pro`).
2. El cliente móvil usa `EXPO_PUBLIC_API_URL`; en dispositivo real apuntar a la URL
   pública del backend de Render.
3. Config de builds en `mobile/eas.json` (development / preview / production).

```bash
cd mobile
npx expo export                     # verificación de build web/prod (sin errores)
npx eas login
npx eas build --platform android    # o --platform ios
npx eas build --platform android --profile preview
```

> En compilación para dispositivo físico/TestFlight la URL local `localhost` no
> funciona; usar el backend desplegado o el IP del PC en la misma WiFi.

## 4. Verificación post-deploy

- [ ] `GET /api` responde 200 en el backend.
- [ ] Login con un usuario admin, tienda e inventario funcionan.
- [ ] `GET /api/face/status` (admin): `modelo.disponible: true` e `indiceCompleto: true`.
- [ ] `POST /api/face/warmup` (admin): devuelve `ms` y deja `modelo.cargada: true`.
- [ ] `GET /api/attendance/dashboard?fecha=YYYY-MM-DD` (admin) responde 200.
- [ ] `GET /api/products/by-barcode/AP-<id>-<codigoFabrica>` responde 200.
- [ ] Primer request tras 15 min sin tráfico responde (cold start) y el log muestra
      el reinicio del índice facial.
- [ ] Web: Vercel sirve la SPA y hace `fetch` a la API de Render (CORS ok).
- [ ] Móvil: app compilada inicia sesión y descarga imágenes de Supabase + `/api`.
- [ ] `docs/entornos.md` refleja las URL finales.