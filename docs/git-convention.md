# Convención de Git

Documento de referencia para todo el trabajo sobre el repositorio. Reglas vividas
por todo el equipo (backend, web y móvil) para mantener `main` siempre en un estado
desplegable.

## 1. Modelo de ramas

```
        feature/B11            feature/m8-precios
            │                        │
        ┌───┴─────┐              ┌───┴─────┐
        │  PR/Cherry-pick        │  PR     │
        ▼         ▼              ▼         ▼
     ──────────────────────────────────────────────  main (protegida, solo merge)
```

- **`main`** — rama protegida. Solo código que pasa `build` + `lint` (definición de
  "terminado" abajo). Se actualiza exclusivamente por merge de una rama `feature/*`
  (idealmente vía Pull Request con revisión).
- **`feature/*`** — rama de trabajo. Nombre descriptivo del cambio:
  `feature/m8-precios`, `feature/b11-build-ios`, `feature/r9-busqueda-imagen`.
  Una rama = una tarea; no acumular tareas distintas en la misma rama.
- **Histórico del equipo** — las primeras ramas `rama/brian`, `rama/marco`,
  `rama/raul` del inicio del proyecto quedan como históricas; ya no se usan.

### Convención de nombres

`feature/<contexto-inicial>-<descripción-corta-en-kebab-case>`

Precedentes en el repo: `feature/inventario-m2`, `feature/m5-movimientos`,
`feature/b7-b8`, `feature/r7ventamayor`, `feature/correccioncrud`.

## 2. Mensajes de commit (Conventional Commits)

Formato: `<tipo>(<alcance>): <descripción>`

```
feat(auth): login con JWT y refresh de sesión
fix(products): stock negativo en venta por mayor
docs(readme): instrucciones de puesta en marcha
refactor(sales): extraer cálculo de totales
test(solicitudes): cubre flujo Pendiente -> Enviado
chore(deps): actualizar typeorm a la versión 1.1.0
```

| Tipo | Uso |
| :--- | :--- |
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `docs` | Cambios solo de documentación |
| `refactor` | Cambia estructura sin cambiar comportamiento |
| `test` | Añadir/modificar tests |
| `chore` | Tareas de mantenimiento (deps, config, build) |
| `style` | Formato, espacios, estilos que no afectan al código |
| `perf` | Mejoras de rendimiento |
| `ci` | Cambios de CI/CD |

Reglas:

1. Descripción en español, imperativo, sin punto final.
2. Alcance = módulo/carpeta afectada (`products`, `sales`, `auth`, `mobile`, `docs`...).
3. Un commit = un cambio lógico.
4. **No commitear a medias**: solo commitear, pushear o mergear cuando la tarea esté terminada.
5. Los secretos jamás van en un commit ni en el mensaje.

## 3. Flujo diario

```bash
# 1) Actualizar desde main
git checkout main && git pull origin main

# 2) Actualizar tu rama con lo último de main
git checkout feature/mi-tarea
git merge main

# 3) Trabajar, verificar y commitear
git add .
git commit -m "feat(products): <descripción>"
git push -u origin feature/mi-tarea

# 4) Al terminar la tarea -> PR hacia main (o merge directo si el consenso lo permite)
git checkout main && git merge feature/mi-tarea
git push origin main
```

## 4. Definición de "terminado" (Definition of Done)

Una tarea cierra únicamente cuando pasan en verde **en el módulo afectado**:

| Módulo | Verificación |
| :--- | :--- |
| Backend | `npm run build` (typecheck) + `npm run lint` + `npm test` |
| Frontend | `npm run build` (`tsc -b && vite build`) + `npm run lint` (oxlint) |
| Móvil | `npx tsc --noEmit` + `npx expo export` |

Si aplican cambios de rutas/entidades/entorno, actualizar además `docs/` en el mismo commit.

## 5. Reglas del equipo

1. **Nunca mergear a `main`** algo que no pase `build` + `lint` en verde.
2. Al empezar el día, `git pull origin main` y resolver conflictos en tu rama.
3. Si dos personas van a tocar el mismo archivo (ej. `App.tsx`), coordinar quién lo hace primero.
4. Commitear en español siguiendo Conventional Commits.
5. `main` solo almacena integraciones revisadas; no commits directos salvo hotfix acordado.

## 6. Checklist de Pull Request

- [ ] La rama parte de `main` actualizado.
- [ ] Build + lint verdes (y tests en backend).
- [ ] Mensajes de commit siguiendo Conventional Commits.
- [ ] Sin secretos ni `.env` reales en el diff.
- [ ] `docs/` y `AGENTS.md` actualizados si cambió estructura/rutas/entorno.
- [ ] `schema.sql` alineado si se tocaron entidades TypeORM.