# Despliegue

Guía de publicación de los tres frentes. Entorno de producción actual:

| Superficie | Plataforma | URL / config |
| :--- | :--- | :--- |
| Frontend (web) | Vercel | `frontend/vercel.json` + `.env.production` |
| Backend (API) | Render | `https://inventarioautopartesi.onrender.com` |
| Móvil | Expo EAS | `mobile/eas.json` (builds Android/iOS) |

## 1. Backend (Render)

1. Configurar variables en el dashboard de Render (ver `docs/entornos.md` §Backend).
2. `DB_SYNC=false` en producción (migraciones controladas; no `synchronize`).
3. Build command: `npm run build` (NestJS compila a `dist/`).
4. Start command: `npm run start:prod` (`node dist/main`).
5. Verificar salud: `GET https://inventarioautopartesi.onrender.com/api` responde.

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
- [ ] Web: Vercel sirve la SPA y hace `fetch` a la API de Render (CORS ok).
- [ ] Móvil: app compilada inicia sesión y descarga imágenes de Supabase + `/api`.
- [ ] `docs/entornos.md` refleja las URL finales.