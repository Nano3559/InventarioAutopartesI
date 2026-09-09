# Convención de Git

Documento de referencia para el trabajo sobre el repositorio. Describe el flujo
real del equipo (backend, web y móvil) para mantener `main` siempre en un estado
desplegable.

## 1. Modelo de ramas

```
        feature/R9              feature/m11-movil-inventario
            │                              │
        ┌───┴─────┐                    ┌───┴─────┐
        │   PR    │                    │   PR    │
        ▼         ▼                    ▼         ▼
     ─────────────────────────────────────────────────  main (protegida, solo merge)
```

- **`main`** — rama principal. Solo código que pasa `build` + `lint` (definición de
  "terminado" abajo). Se actualiza exclusivamente por merge de una rama `feature/*`
  vía Pull Request.
- **`feature/*`** — rama de trabajo por tarea. Una rama = una tarea; no acumular
  tareas distintas en la misma rama.
- **Histórico del equipo** — las primeras ramas `Brian`, `raul` del inicio del
  proyecto quedan como históricas; ya no se usan.

### Convención de nombres utilizada

El equipo usó dos patrones para nombrar ramas:

| Patrón | Ejemplo | Cuándo se usó |
| :--- | :--- | :--- |
| `feature/<código-tarea>` | `feature/R9`, `feature/M12`, `feature/B11` | Tareas asignadas con código (R=módulo reportes, M=módulo, B=backend) |
| `feature/<descripción>` | `feature/movilproduc`, `feature/historialventas`, `feature/optimizaciones` | Cambios descriptivos sin código formal |
| `feature/<código>-<descripción>` | `feature/m11-movil-inventario`, `feature/m10-notificaciones-responsive` | Combinación de código + descripción (usado en módulos recientes) |

Precedentes reales en el repo: `feature/R10supabase`, `feature/r7ventamayor`,
`feature/correccionarchivos`, `feature/carrito`, `feature/solialmacen`,
`feature/m8-precios`, `feature/B9-B10`.

## 2. Mensajes de commit

El equipo utilizó mayormente un formato **descriptivo libre** en español, con
algunos commits recientes siguiendo Conventional Commits.

### Formato principal utilizado (mayoritario)

```
<descripción del cambio en español>
```

Ejemplos reales del repositorio:

```
Tarea M12 Completada
backend listo para produccion
frontend-produccion completada
historial ventas y guia despliegue movil
Optimizaciones
Tarea R8 implementada
Tareas B9-B10 completadas
env agregado
```

### Formato Conventional Commits (adoptado en módulos recientes)

A partir de los módulos M9, M10 y M11 se empezó a usar el formato formal:

```
<tipo>(<alcance>): <descripción>
```

Ejemplos reales:

```
feat(mobile): implementacion M11 - pantalla de inventario movil con 7 ubicaciones
feat(frontend): implementacion M10 - centro de notificaciones en tiempo real
feat(frontend): implementacion M9 - modulo de reportes avanzados
```

| Tipo | Uso |
| :--- | :--- |
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `docs` | Cambios solo de documentación |
| `refactor` | Cambia estructura sin cambiar comportamiento |
| `chore` | Tareas de mantenimiento (deps, config, build) |

### Reglas del equipo

1. Descripción clara del cambio, en español.
2. **No commitear a medias**: solo commitear, pushear o mergear cuando la tarea
   esté terminada.
3. Los secretos jamás van en un commit ni en el mensaje.
4. Un commit = un cambio lógico cuando sea posible.

## 3. Flujo de trabajo

### Pull Requests

El equipo usó **Pull Requests** como flujo principal para integrar código a `main`.
Se registraron más de 40 PRs durante el desarrollo del proyecto.

```bash
# 1) Crear rama de tarea
git checkout main && git pull origin main
git checkout -b feature/mi-tarea

# 2) Trabajar y commitear
git add .
git commit -m "Tarea M12 Completada"
git push -u origin feature/mi-tarea

# 3) Abrir PR hacia main en GitHub
# 4) Revisar y mergear
```

### Merges

Los merges a `main` se realizaron principalmente vía PR en GitHub. En algunos
casos se realizaron merges directos cuando el consenso lo permitía.

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
4. `main` solo almacena integraciones revisadas; no commits directos salvo hotfix acordado.
5. Coordinar ramas para evitar conflictos frecuentes en archivos compartidos.

## 6. Checklist de Pull Request

- [ ] La rama parte de `main` actualizado.
- [ ] Build + lint verdes (y tests en backend).
- [ ] Mensajes de commit descriptivos y claros.
- [ ] Sin secretos ni `.env` reales en el diff.
- [ ] `docs/` y `AGENTS.md` actualizados si cambió estructura/rutas/entorno.
- [ ] `schema.sql` alineado si se tocaron entidades TypeORM.
