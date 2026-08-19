# Plan de trabajo — Sistema de Inventario y Ventas

**Equipo:** Brian (B, backend), Marco (M, web admin), Raul (R, web tienda → móvil)
**Periodo:** 19/08/2026 → 01/09/2026 (entrega)

## Códigos de tarea

- **B** = Brian (backend, NestJS)
- **M** = Marco (frontend web admin)
- **R** = Raul (frontend web tienda → app móvil)

Cada tarea indica con "Necesita: X" qué tarea debe estar terminada antes de poder arrancar. Las que dicen "—" no dependen de nada previo.

## Plan día a día

| Día | Brian (Backend) | Marco (Web admin) | Raul (Web tienda → móvil) |
|---|---|---|---|
| **1** Mié 19/08 | **B1** Compilar backend + conectar `app.module` (TypeORM, CORS, `/uploads`) · *Necesita: —* | **M1** Router + layout + Login · *Necesita: B1* | **R1** Cliente API + Login · *Necesita: B1* |
| **2** Jue 20/08 | **B2** Seed (4 almacenes + 3 tiendas + usuarios + 30 productos) · *Necesita: B1* | **M2** Inventario (tabla, filtros, CRUD, stock por ubicación) · *Necesita: B1, B2* | **R2** Dashboard básico por rol · *Necesita: B1, B2* |
| **3** Vie 21/08 | **B3** Endpoint Precios + export Excel · *Necesita: B1* | **M3** Detalle/edición de producto · *Necesita: M2* | **R3** Venta (carrito, total, `POST /sales`) · *Necesita: B1, B2, R1* |
| **4** Sáb 22/08 | **B4** Endpoint Reportes/Dashboard · *Necesita: B1, B2* | **M4** Pagos multi-método + factura · *Necesita: R3* | **R4** Devolución + Solicitud a almacén · *Necesita: B2, R1* |
| **23/08** Dom | Medio día de recuperación (opcional) |||
| **5** Lun 24/08 | **B5** QA integración API + CORS + uploads · *Necesita: B1-B4* | **M5** Movimientos (traslado + historial) · *Necesita: B1, B2* | **R5** Nota de venta + confirmación completa · *Necesita: R3, M4* |
| **6** Mar 25/08 | **B6** Venta por mayor: import Excel + validación stock · *Necesita: B5* | **M6** Solicitudes (encargado): estados · *Necesita: B2, R4* | **R6** Botón "Solicitar a almacén" sin stock · *Necesita: R4, M6* |
| **7** Mié 26/08 | **B7** Pulir Costos + proveedores · *Necesita: B1, B2* | **M7** Pantalla Costos (factura, proveedor, %, ítems) · *Necesita: B7, B2* | **R7** Venta por mayor UI (A manual / B Excel) · *Necesita: B6, R3, M7* |
| **8** Jue 27/08 | **B8** Tests e2e de todos los módulos · *Necesita: B1-B7* | **M8** Pantalla Precios + export Excel · *Necesita: B3, M7* | **R8** Reportes vista tienda + impresión · *Necesita: B4, R3-R7* |
| **9** Vie 28/08 | **B9** Búsqueda por imagen (endpoint + uploads) · *Necesita: B5* | **M9** Dashboard completo + reportes con filtros · *Necesita: B4, M2, M5* | **R9** Búsqueda por imagen UI (cámara) · *Necesita: B9* |
| **10** Sáb 29/08 | **B10** Crear app Expo (login + navegación + cliente API) · *Necesita: B8, M1, R1* | **M10** Notificaciones + responsive web · *Necesita: M6, M9* | **R10** Cerrar pendientes web · *Necesita: R3-R9* |
| **30/08** Dom | Medio día de recuperación |||
| **11** Lun 31/08 | **B11** Build Android (cámara, URL API) · *Necesita: B10* | **M11** Móvil: Inventario/stock + Dashboard · *Necesita: B10* | **R11** Móvil: Venta + búsqueda por imagen · *Necesita: B10, B9* |
| **12** Mar 01/09 | **B12** QA final backend + deploy · *Necesita: B1-B11* | **M12** QA web · *Necesita: M1-M11* | **R12** QA móvil (login→venta→imagen) · *Necesita: R11, M11, B11* |

## Regla de "terminada"

Cada tarea cierra con `npm run build` + `npm run lint` en verde en el módulo correspondiente:

- Backend: `nest build` + `npm run lint`
- Web: `tsc -b && vite build` + `npm run lint`
- Móvil: `npx tsc --noEmit` / `expo export`

## Flujo de Git — ramas por persona

- **`main`** = solo código que compila (protegida). Se mergea ahí al cierre de cada tarea (cuando `build` + `lint` estén en verde).
- **Ramas:** `rama/raul`, `rama/marco`, `rama/brian` (una por persona).

```bash
# crear y publicar las ramas
git branch rama/raul
git branch rama/marco
git branch rama/brian
git push -u origin rama/raul rama/marco rama/brian

# flujo diario de cada persona
git checkout rama/raul          # cada uno trabaja en SU rama
git add . && git commit -m "..."
git push
# al terminar la tarea del día:
git checkout main && git merge rama/raul
git push origin main
```

### Reglas del equipo

1. **Nunca mergear a `main`** algo que no pase `build` + `lint` en verde.
2. Al empezar el día: `git pull origin main` y actualizar la propia rama con `git merge main`.
3. Si dos personas van a tocar el mismo archivo (ej. `App.tsx`), avisarse y coordinar quién lo hace primero.
4. Solo commitear, pushear o mergear cuando la tarea esté terminada; no commitear a medias.

## Ruta crítica (no se puede atrasar)

- `B1 → B2 → R3 → M4 → R5` — núcleo de venta web
- `B5 → B8 → B10 → B11/R11` — app móvil

## Prioridades no negociables para la entrega

1. Login y roles
2. Inventario
3. Venta + pagos
4. Solicitudes / movimientos
5. Dashboard básico

Extras de valor agregado (al final): export/import Excel, búsqueda por imagen, notificaciones, app móvil.