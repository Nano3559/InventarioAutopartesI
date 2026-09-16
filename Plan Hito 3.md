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

- **Hoy**: Fase 0 + Fase 1 (conteo por códigos) — funciona sin entrenar nada.
- **Después**: Fases 2-3 (entrenar + inferencia) — se integra sin tocar la base porque el endpoint ya está definido.