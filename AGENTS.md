# AGENTS.md

Proyecto de Programación Avanzada (Unifranz). Stack planeado — el repo aún está vacío; este archivo registra la intención acordada.

## Stack planeado

- Frontend: React + TypeScript (Vite).
- Backend: NestJS + TypeScript.

## Estructura prevista

- `frontend/` — app React (creada con `npm create vite@latest frontend -- --template react-ts`).
- `backend/` — API NestJS (creada con `npx @nestjs/cli new backend`).

Estructura monorepo simple con npm independientes en cada carpeta (sin workspaces por ahora). No asumir que existen hasta que se creen.

## Comandos

### Frontend (Vite + React + TS)
- `npm run dev` — servidor de desarrollo.
- `npm run build` — `tsc -b && vite build` (typecheck + build).
- `npm run lint` — ESLint.
- `npm run preview` — previsualizar build de producción.

### Backend (NestJS)
- `npm run start:dev` — servidor con hot-reload (`nest start --watch`).
- `npm run build` — `nest build`.
- `npm run lint` — ESLint con `--fix`.
- `npm test` — Jest unitario.
- `npm run test:e2e` — tests e2e (requiere `jest-e2e.json`, corre contra la app levantada).

## Notas

- Correr `lint` y `build` (que incluye typecheck) después de cambios, antes de dar por terminada una tarea.
- No crear paquetes ni estructura de carpetas hasta que el usuario describa el proyecto concreto.