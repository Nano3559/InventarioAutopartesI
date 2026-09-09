---
name: verificar-modulo
description: Cierra tareas verificando que lint + build (typecheck) pasen en el módulo afectado. Usa cuando termines una tarea o antes de mergear/commitear para confirmar que backend, frontend o mobile quedan en verde según la convención del proyecto (Definition of Done).
---

# Verificar módulo (Definition of Done)

Antes de dar por terminada cualquier tarea, corre las verificaciones correspondientes
al módulo afectado. `main` solo recibe código que pasa estas pruebas.

## Por módulo

### Backend (`backend/`)
```
npm run build          # nest build (typecheck + compila a dist/)
npm run lint           # ESLint con --fix
npm test               # Jest unitario
```
Si hay cambios que afectan rutas/flujos: `npm run test:e2e`.

### Frontend (`frontend/`)
```
npm run build          # tsc -b && vite build (typecheck incluido)
npm run lint           # oxlint (¡NO ESLint!)
```
Frontend no tiene tests configurados; no los asumas.

### Mobile (`mobile/`)
```
npx tsc --noEmit       # typecheck
npx expo export        # build web/prod de verificación
```
Mobile no tiene scripts de lint/test/build en `package.json`.

## Reglas

1. Correr siempre en el directorio del subproyecto (usa `workdir`).
2. Si un comando falla, corregir el error y volver a correr hasta que esté en verde.
3. No marcar la tarea como terminada con errores pendientes.
4. Si cambió estructura/rutas/entorno/entidades, además actualizar `docs/` y `AGENTS.md` en el mismo cambio.
5. Para commitear/mergear tras la verificación, usar la skill `git-convencion`.