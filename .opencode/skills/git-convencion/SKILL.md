---
name: git-convencion
description: Aplica la convención de Git del proyecto (docs/git-convention.md): ramas feature/*, mensajes Conventional Commits en español, flujo de PR y Definition of Done. Usa al crear ramas, hacer commits, pushear o mergear a main.
---

# Convención de Git (docs/git-convention.md)

Todo el trabajo sobre el repositorio sigue `docs/git-convention.md`. Resumen operativo:

## Ramas

- `main` — protegida, solo por merge de `feature/*` (código que pasa build + lint).
- `feature/<prefijo>-<descripción-en-kebab-case>` — ej. `feature/m8-precios`, `feature/b11-build-ios`, `feature/r9-busqueda-imagen`. Una rama = una tarea.

## Mensajes de commit (Conventional Commits)

```
<tipo>(<alcance>): <descripción en español, imperativo, sin punto final>
```

Tipos: `feat` `fix` `docs` `refactor` `test` `chore` `style` `perf` `ci`.
Alcance = módulo/carpeta (`products`, `auth`, `sales`, `mobile`, `docs`...).

## Flujo diario

```bash
git checkout main && git pull origin main
git checkout feature/mi-tarea && git merge main
# ...trabajar y verificar (skill verificar-modulo)...
git add .
git commit -m "feat(scope): descripción"
git push -u origin feature/mi-tarea
# al terminar: merge a main
git checkout main && git merge feature/mi-tarea && git push origin main
```

## Reglas imprescindibles

1. Nunca mergear a `main` algo que no pase el `build` + `lint` del módulo (skill `verificar-modulo`).
2. Solo commitear/pushear/mergear con la tarea terminada; nunca a medias.
3. Sin secretos ni `.env` reales en el diff; revisar `git status` antes de `git add .`.
4. `git add .` selectivo: stagear solo archivos intencionales.
5. Al tocar rutas/entidades/entorno, incluir la actualización de `docs/` en el mismo commit.