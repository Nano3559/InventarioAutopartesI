# Plan Hito 3 — Conteo de productos con códigos de barras + IA

## Objetivo

Implementar un flujo de **conteo por lotes** en recepción de mercadería que combine dos tecnologías de visión:

1. **Lectura de códigos de barras** (multiscan) — para **identificar** cada producto con precisión.
2. **IA de reconocimiento de imagen (YOLO entrenado)** — para **contar** piezas visibles, incluso las que no tienen etiqueta.

Ambas se relacionan mediante un algoritmo de **fusión por bounding boxes**: el código asigna identidad, la IA asigna cantidad.

---

## Principio de funcionamiento (fusión)

Sobre el mismo frame capturado por la cámara del móvil actúan dos sensores:

```
Foto del lote
├─ Multiscan códigos  → [{codigo, bbox_barcode}]      (determinista, sin entrenar)
└─ YOLO (entrenado)   → [{clase, confianza, bbox}]     (conteo por imagen)
```

**Reglas de fusión** (por cada pieza detectada):
1. Si el `bbox_barcode` cae **dentro del `bbox` de la pieza** → el código gana: identidad exacta.
2. Si hay pieza **sin** código → la clase IA propone candidatos (el `codigo`/tipo que ya venía contando) y el encargado confirma con un toque.
3. El conteo final = `{codigo → cantidad}` resultante → se compara contra `cantidadDeclarada` del movimiento.

**Resumen:**
- **IA** → "vi 12 piezas" (conteo).
- **Código de barras** → "esas 12 son DAI309005" (identidad).
- **Fusión** → `12 × DAI309005` ✓

---

## Fase 0 — Base (backend)

- Revisar las entidades implicadas: `products.codigo`, `movimientos` (entrada), `locations`.
- Agregar el campo `cantidadDeclarada` al movimiento de entrada si no existe.
- Decisión de arquitectura: **inferencia en backend** (no on-device, por Expo puro).
- Definir desde el día 1 el contrato del endpoint de inferencia para no rehacer:
  - `POST /api/movimientos/entrada/count` para el modo solo-códigos.
  - `POST /api/inference/detect` para el modo IA (recibe el frame + códigos detectados).

## Fase 1 — Conteo por códigos (Ruta A, sin IA)

**Mobile**
- Pantalla **"Contar por lotes"** con `expo-camera` (multiscan).
- Conteo en vivo agrupando `{codigo → cantidad}`.
- Deduplicado por región (IoU entre lecturas + timeout) para no repetir la misma etiqueta en varios frames.

**Backend**
- `POST /api/movimientos/entrada/count`: recibe `[{codigo, cantidad}]` y compara contra `cantidadDeclarada`.
- Respuesta: `{ ok, faltantes[], sobra[], total }`.

## Fase 2 — Entrenar la IA (Ruta B)

1. **Datos**: 200-400 fotos por producto genérico (cajas de pastillas de freno, bujías, etc.) en el estante real.
2. **Etiquetado**: Roboflow — caja por pieza + clase (el `codigo` o tipo como clase).
3. **Entrenamiento**: `YOLOv8n` (ultralytics) en máquina local o Google Colab (~2-4 h por sesión).
4. **Exportación**: TensorFlow Lite u ONNX (modelo de 5-10 MB).
5. **Evaluación**: mAP sobre un set de validación separado antes de integrar.

## Fase 3 — Servicio de inferencia (backend)

- Microservicio **Python FastAPI** (o Node con `onnxruntime`) desplegado junto al backend (Render).
- `POST /api/inference/detect`:
  - Recibe el frame (`multipart` imagen) y la lista de códigos detectados con sus `bbox`.
  - Ejecuta YOLO → obtiene detecciones `[{clase, confianza, bbox}]`.
  - Implementa el **algoritmo de fusión** (código dentro de pieza) y devuelve:
    `[{ codigo?, clase, cantidad, confianza, necesita_confirmacion }]`.

## Fase 4 — Integración y UX

- El móvil envía un frame: `{image, barcodes[]}` → el backend fusiona y responde el agrupado.
- UI: feed de conteo en vivo, chips "confirmar candidatos" (piezas sin código), y botón **"Elegir tipo de movimiento"**.
- Al confirmar se crea el `movimiento` de entrada real y se ajusta el stock por `location`.
- Cierre técnico: `verificar-modulo` (lint + build) en backend y mobile antes de mergear.
- Documentar en `docs/` (rutas, entidades nuevas, entorno) según convención del proyecto.

---

## Decisiones clave

| Decisión | Elección |
| --- | --- |
| Dónde corre la inferencia | Backend (microservicio), no on-device |
| Modelo | YOLOv8n (pequeño, ~5-10 MB) |
| Identidad del producto | Código de barras (gana ante la IA) |
| Conteo | Detección por imagen (IA) |
| Piezas sin etiqueta | La cuenta la IA, confirma el encargado |
| Herramienta de etiquetado | Roboflow |

## Riesgos y costos

- **Etiquetado manual**: es el mayor esfuerzo (300+ imágenes por producto general).
- **Deduplicación entre frames**: la misma pieza puede contarse de más si queda en cuadro varios frames.
- **Solo cuenta lo visible**: piezas apiladas en caja cerrada no se detectan.
- **Piezas parecidas**: baja confianza en la clase IA → requiere confirmación humana.

## Alcance recomendado

- **Ahora**: Fases 2-3 (entrenar + inferencia) — se integra sin tocar la base porque el endpoint ya está definido.
- **Base ya lista**: registro de conteos por códigos y movimiento de entrada.

---

# Plan de trabajo Hito 3 (22/09 → 06/10)

**Equipo:** Brian (backend), Raul (móvil), Marco (web admin).
**Periodo:** Mar 22/09 → Mar 06/10/2026 (15 días hábiles corridos, uno por día).
**Regla:** cada día termina en `main` con `build` + `lint` en verde en el módulo tocado (Definición de Terminado). Ver flujo de Git: `docs/git-convention.md`.

## Códigos de tarea

- **B** = Brian — backend NestJS + microservicio de inferencia (Python).
- **R** = Raul — app móvil (Expo) + dataset/entrenamiento de IA.
- **M** = Marco — frontend web (admin) + QA/dataset de apoyo.

> "Necesita: X" indica qué tarea debe estar cerrada para poder arrancar. "—" = sin dependencia previa.

## Plan día a día

| Día | Brian (Backend/IA-servicio) | Raul (Móvil/IA) | Marco (Web admin) |
|---|---|---|---|
| **1** Mar 22/09 | **B1** Auditar entidades Hito 3 (`products.codigo`, `movimientos` entrada, `locations`) y agregar `cantidadDeclarada` si falta. Congelar contrato de endpoints `entrada/count` y `inference/detect` · *Necesita: —* | **R1** Pantalla **"Contar por lotes"** con `expo-camera` (multiscan) · *Necesita: —* | **M1** Estructura web de **Movimientos de entrada/conteos** (tabla base) · *Necesita: —* |
| **2** Mié 23/09 | **B2** `POST /api/movimientos/entrada/count` (modo solo-códigos) → `{ok, faltantes[], sobra[], total}` · *Necesita: B1* | **R2** Conteo en vivo agrupando `{codigo → cantidad}` + deduplicado (IoU + timeout) · *Necesita: R1* | **M2** Conectar tabla web con lista de conteos (faltantes, sobra, total) · *Necesita: B2, M1* |
| **3** Jue 24/09 | **B3** Endpoint para confirmar conteo → crear `movimiento` de entrada real + ajuste de stock por `location` · *Necesita: B2* | **R3** Flujo solo-códigos end-to-end: contar lote → confirmar → ver stock · *Necesita: B2, B3* | **M3** Reporte de diferencias en web (faltantes/sobra por lote) · *Necesita: B2, M2* |
| **4** Vie 25/09 | **B4** Scaffolding microservicio Python FastAPI con `POST /api/inference/detect` (multipart frame + codes[] · *Necesita: B1* | **R4** Iniciar dataset: 200–400 fotos por producto genérico en estante real · *Necesita: —* | **M4** Curación/organización de las fotos del dataset · *Necesita: R4* |
| **5** Sáb 26/09 | **B5** Script de entrenamiento YOLOv8n (ultralytics) listo para Colab · *Necesita: —* | **R5** Continuar dataset + preparar export a Roboflow · *Necesita: R4* | **M5** Etiquetado en Roboflow (caja por pieza + clase = código/tipo) · *Necesita: R5* |
| **6** Dom 27/09 | **B6** (medio día) Apoyar etiquetado Roboflow · *Necesita: —* | **R6** (medio día) Cerrar etiquetado Roboflow + set de validación · *Necesita: R5, M5* | **M6** (medio día) Respaldar etiquetado Roboflow · *Necesita: R5* |
| **7** Lun 28/09 | **B7** Subir dataset y entrenar YOLOv8n en Colab (2–4 h) + evaluar mAP · *Necesita: B5, R6* | **R7** Exportar modelo a ONNX/TFLite (~5–10 MB) · *Necesita: B7* | **M7** Preparar entorno de despliegue del microservicio (Render/docker) + docs · *Necesita: B4* |
| **8** Mar 29/09 | **B8** Cargar modelo en microservicio + pipeline YOLO (frame → `[{clase, confianza, bbox}]`) · *Necesita: B7, M7* | **R8** Envío de frame + barcodes desde móvil al microservicio (formato multipart acordado) · *Necesita: B8* | **M8** QA/pulido pantalla de movimientos + revisión de docs · *Necesita: M3* |
| **9** Mié 30/09 | **B9** Algoritmo de **fusión** en microservicio (código dentro de bbox gana; sin código → candidatos) → `[{codigo?, clase, cantidad, confianza, necesita_confirmacion}]` · *Necesita: B8* | **R9** Feed de conteo en vivo consumiendo `/inference/detect` (chips de candidatos) · *Necesita: B9* | **M9** Vista web de conteo con IA (candidatos a confirmar) · *Necesita: B9* |
| **10** Jue 01/10 | **B10** Endpoint de confirmación con IA (candidatos → movimiento + stock por location) · *Necesita: B9, B3* | **R10** UX "confirmar candidatos" + botón **"Elegir tipo de movimiento"** · *Necesita: B10* | **M10** Histórico de conteos/diferencias en web · *Necesita: M9, B9* |
| **11** Vie 02/10 | **B11** QA backend end-to-end (modo códigos, modo IA, confirmación) + tests · *Necesita: B1-B10* | **R11** Prueba completa móvil: lote → conteo → confirmación (ambos modos) · *Necesita: R10, B10* | **M11** Guión de demo + datos de prueba reales · *Necesita: M10* |
| **12** Sáb 03/10 | **B12** Despliegue microservicio + ajustes CORS/env producción · *Necesita: B11* | **R12** Pruebas en dispositivo/emulador contra API en red (10.0.2.2 / IP local) · *Necesita: R11* | **M12** QA web en preview/producción + responsive · *Necesita: M11* |
| **13** Dom 04/10 | **B13** (medio día) Bugfixes menores acumulados · *Necesita: —* | **R13** (medio día) Bugfixes móvil acumulados · *Necesita: —* | **M13** (medio día) Bugfixes web acumulados · *Necesita: —* |
| **14** Lun 05/10 | **B14** Documentación en `docs/` (rutas nuevas, entidades, entorno) + lint/build final · *Necesita: B12* | **R14** Pulido UX móvil + `npx tsc --noEmit` y `expo export` · *Necesita: R12* | **M14** Documentación web + `npm run build` + `npm run lint` · *Necesita: M12* |
| **15** Mar 06/10 | **B15** Deploy final backend + microservicio y versionar release · *Necesita: B14* | **R15** Video/demo móvil del hito · *Necesita: R14* | **M15** Cierre: Definición de Terminado (build+lint en 3 módulos), merge a `main`, demo final · *Necesita: B15, R15* |

## Ruta crítica

- `B1 → B2 → B3` — movimiento de entrada con cantidades.
- `R4 → R5 → R6 → B7 → B8 → B9 → R9 → B10 → R10` — cadena IA (dataset → entrenamiento → inferencia → confirmación).
- `M7 → B8` y `B9 → M9` — web/microservicio van en paralelo y se sincronizan en el endpoint.

## Prioridades no negociables

1. Contrato de endpoints congelado el día 1 (B1).
2. Conteo por códigos funcionando antes de la IA (días 1-3).
3. Dataset y entrenamiento en camino desde el día 4 (es el mayor esfuerzo).
4. Fusión códigos+IA respetando "el código gana".
5. Definición de Terminado (build + lint verde) todos los días.