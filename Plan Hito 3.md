# Plan Hito 3 — Identificación de productos por código de barras + Asistencia facial

## Objetivo

Implementar dos flujos con visión asistida:

1. **Código de barras para productos**: detectar el producto escaneando un código de barras **generado por el equipo** con una librería y **enlazado a un producto** de nuestra base de datos (`products.codigo`). El scan identifica y muestra el producto.
2. **Asistencia de personal por reconocimiento facial**: un sistema de registro donde el encargado ingresa **nombre y apellido**, la cámara del celular le toma las **fotos necesarias** para reconocerlo después, y al marcar asistencia el sistema lo reconoce **junto con su nombre completo**.

> **Descartado** (era el objetivo anterior): el conteo de autopartes basado en cajas (YOLO entrenado, dataset, algoritmo de fusión). Se elimina ese alcance.

---

## Cómo funciona

### Flujo A — Código de barras (identidad del producto)

```
Etiqueta generada (Code128) ─► enlazada a products.codigo
Scan del código (cámara móvil, multiscan)
        └─► GET /api/products/by-barcode/:codigo ──► { producto: nombre, stock, precio, imagen }
```

- **Generación**: librería de códigos de barras (web: `jsbarcode`; backend: `bwip-js`; móvil: `react-native-barcode-builder` + `react-native-svg`). Simbología **Code128** (alfanumérica, soporta `DAI309005`).
- El código generado se **imprime/etiqueta** y se **enlaza** a un producto existente en la DB.

### Flujo B — Registro y asistencia facial

```
REGISTRO (una vez):
nombre + apellido (pide el sistema)
        + N fotos del rostro (cámara del celular)
        └─► FastAPI /face/embed ─► embedding ─► se guarda en users (modificada)

ASISTENCIA (cada día):
foto en vivo (marcaje)
        └─► FastAPI /face/match ─► { usuario, nombre completo, confianza }
        └─► POST /api/attendance/check ─► registra entrada/salida
```

- El **microservicio Python FastAPI** concentra la IA facial (generación de embeddings y comparación), igual que estaba prevista la infraestructura del microservicio anterior.
- Ante baja confianza el sistema **pide confirmación humana** (muestra el nombre completo candidato).

---

## Fase 0 — Base (backend)

- Auditar entidades: `products.codigo` (ya existe) y `users` (adaptarla al nuevo objetivo: campos de fotografías de referencia / embeddings).
- **Reutilizar y modificar `users`**: se agregan los campos necesarios para el registro facial (fotografías de referencia, estado activo) y la asistencia. No se crea tabla `personal` nueva.
- Congelar el contrato de endpoints el día 1 (B1):
  - `GET /api/products/by-barcode/:codigo` — identifica el producto por código de barras.
  - `GET /api/products/:id/barcode` — genera/descarga la etiqueta del código de barras (`bwip-js`).
  - `POST /api/users/face/register` — registra personal con nombre, apellido y fotos del rostro.
  - `POST /api/attendance/check` — marcaje de asistencia (foto → reconocimiento → registro).
  - FastAPI microservicio: `POST /face/embed` (N fotos → embedding) y `POST /face/match` (foto → top candidatos).

---

# Plan de trabajo Hito 3 (22/09 → 06/10)

**Equipo:** Brian (backend), Raul (móvil), Marco (web admin).
**Periodo:** Mar 22/09 → Mar 06/10/2026 (15 días hábiles corridos, uno por día).
**Regla:** cada día termina en `main` con `build` + `lint` en verde en el módulo tocado (Definición de Terminado). Ver flujo de Git: `docs/git-convention.md`.

## Códigos de tarea

- **B** = Brian — backend NestJS + microservicio de reconocimiento facial (Python FastAPI).
- **R** = Raul — app móvil (Expo) + captura de fotos para registro facial.
- **M** = Marco — frontend web (admin) + QA/dataset de apoyo.

> "Necesita: X" indica qué tarea debe estar cerrada para poder arrancar. "—" = sin dependencia previa.

## Plan día a día

| Día | Brian (Backend/IA-servicio) | Raul (Móvil/IA) | Marco (Web admin) |
|---|---|---|---|
| **1** Mar 22/09 | **B1** Auditar entidades Hito 3 (`products.codigo`, `users`) y **modificar `users`** para registro facial/asistencia. Congelar contrato de endpoints (`by-barcode`, `barcode`, `face/register`, `attendance/check`, `/face/embed`, `/face/match`) · *Necesita: —* | **R1** Pantalla **"Escáner de códigos"** con `expo-camera` (multiscan) que consulte el producto · *Necesita: —* | **M1** Estructura web de **Productos** (tabla con columna código de barras + botón generar etiqueta) · *Necesita: —* |
| **2** Mié 23/09 | **B2** `GET /api/products/by-barcode/:codigo` → devuelve producto (nombre, stock, precio, imagen) + `GET /api/products/:id/barcode` que **genera el código** con `bwip-js` (PNG) · *Necesita: B1* | **R2** Conectar escáner al endpoint: escanear → **mostrar tarjeta del producto** · *Necesita: B2, R1* | **M2** Pantalla para **generar/imprimir etiquetas** de código de barras con `jsbarcode` por producto · *Necesita: B2, M1* |
| **3** Jue 24/09 | **B3** `POST /api/users/face/register`: recibe nombre, apellido y fotos → las envía a `/face/embed` → guarda embedding en `users` · *Necesita: B1* | **R3** Pantalla **"Registro de personal"**: pedir nombre+apellido + cámara que captura **N fotos del rostro** (guía y contador) · *Necesita: B3* | **M3** Listado de **personal registrado** (nombre completo, foto, estado) · *Necesita: B3, M1* |
| **4** Vie 25/09 | **B4** Scaffolding microservicio Python FastAPI con `POST /face/embed` (N fotos → embedding) y `POST /face/match` (foto → top candidatos) · *Necesita: B1* | **R4** Enviar las fotos desde el móvil (multipart) al backend → `/face/embed` → registrar usuario · *Necesita: B3, B4* | **M4** Curación/supervisión de fotos de personal registradas (calidad del registro) · *Necesita: R4* |
| **5** Sáb 26/09 | **B5** Persistencia de embeddings en `users` + índice de caras en el microservicio (base de referencias) · *Necesita: B4* | **R5** Generar/imprimir etiquetas de código de barras desde el móvil (opcional) + QA del escáner · *Necesita: B2* | **M5** QA de generación de etiquetas + validación de tamaños/impresión · *Necesita: M2* |
| **6** Dom 27/09 | **B6** (medio día) Apoyar pruebas de reconocimiento en el microservicio · *Necesita: —* | **R6** (medio día) Capturar fotos de referencia de **varios usuarios reales** para probar · *Necesita: R4* | **M6** (medio día) Respaldar base de personal + etiquetas generadas · *Necesita: R4* |
| **7** Lun 28/09 | **B7** `POST /api/attendance/check`: recibe foto → `/face/match` → crea registro de **asistencia** (usuario, fecha, tipo entrada/salida) · *Necesita: B5, R6* | **R7** Pantalla **"Marcar asistencia"**: foto en vivo → reconoce → muestra **nombre completo + hora** → guarda · *Necesita: B7* | **M7** Preparar entorno de despliegue del microservicio (Render/docker) + docs · *Necesita: B4* |
| **8** Mar 29/09 | **B8** Umbral de confianza en `/face/match` + manejo de "no reconocido" (solicitar confirmación del nombre) · *Necesita: B7* | **R8** Envío multipart de la foto desde el móvil + UX de **"no reconocido"** · *Necesita: B8* | **M8** QA/pulido pantalla de productos + etiquetas + revisión de docs · *Necesita: M3* |
| **9** Mié 30/09 | **B9** `GET /api/attendance` (historial de asistencia con filtros por fecha/usuario) · *Necesita: B7* | **R9** Feed/confirmación del marcaje: mostrar nombre completo + foto + confirmar **entrada/salida** · *Necesita: B8* | **M9** Vista web de **historial de asistencia** (filtros por fecha/usuario) · *Necesita: B9* |
| **10** Jue 01/10 | **B10** Endpoint de **confirmación/edición de asistencia** (corrección de un marcaje) · *Necesita: B9, B3* | **R10** UX "elegir tipo de marcaje (entrada/salida)" + ajuste fino del reconocimiento · *Necesita: B10* | **M10** Dashboard de **asistencia del día** en web (presentes/ausentes) · *Necesita: M9* |
| **11** Vie 02/10 | **B11** QA backend end-to-end (barcode, registro facial, asistencia) + tests · *Necesita: B1-B10* | **R11** Prueba completa móvil: escanear producto → registrar personal → **marcar asistencia** · *Necesita: R10, B10* | **M11** Guión de demo + datos de prueba reales (productos etiquetados + personal) · *Necesita: M10* |
| **12** Sáb 03/10 | **B12** Despliegue microservicio + ajustes CORS/env producción · *Necesita: B11* | **R12** Pruebas en dispositivo/emulador contra API en red (10.0.2.2 / IP local) · *Necesita: R11* | **M12** QA web en preview/producción + responsive · *Necesita: M11* |
| **13** Dom 04/10 | **B13** (medio día) Bugfixes menores acumulados · *Necesita: —* | **R13** (medio día) Bugfixes móvil acumulados · *Necesita: —* | **M13** (medio día) Bugfixes web acumulados · *Necesita: —* |
| **14** Lun 05/10 | **B14** Documentación en `docs/` (rutas nuevas, entidades, entorno) + lint/build final · *Necesita: B12* | **R14** Pulido UX móvil + `npx tsc --noEmit` y `expo export` · *Necesita: R12* | **M14** Documentación web + `npm run build` + `npm run lint` · *Necesita: M12* |
| **15** Mar 06/10 | **B15** Deploy final backend + microservicio y versionar release · *Necesita: B14* | **R15** Video/demo móvil del hito · *Necesita: R14* | **M15** Cierre: Definición de Terminado (build+lint en 3 módulos), merge a `main`, demo final · *Necesita: B15, R15* |

## Ruta crítica

- `B1 → B2 → R2/M2` — código de barras: generar etiqueta → escanear → identificar producto.
- `B1 → B3 → B4 → R4 → B5 → B7 → R7 → B10` — cadena de asistencia facial (registro → embedding → marcaje → confirmación).
- `M7 → B7` (despliegue del microservicio) y `B7 → M9` (historial) — web/microservicio van en paralelo y se sincronizan en los endpoints.

## Prioridades no negociables

1. Contrato de endpoints congelado el día 1 (B1).
2. Código de barras funcionando antes que el facial (días 1-2): etiqueta generada → scan → producto.
3. Registro facial con fotos de calidad desde el día 3 (es el mayor esfuerzo de datos).
4. El reconocimiento facial **siempre pide confirmación humana** ante baja confianza (nombre completo).
5. Definición de Terminado (build + lint verde) todos los días.

---

## Decisiones clave

| Decisión | Elección |
| --- | --- |
| Identidad del producto | Código de barras generado por el equipo (Code128) → `products.codigo` |
| Generación de códigos | `bwip-js` (backend) + `jsbarcode` (web) + `react-native-barcode-builder` (móvil) |
| Escaneo | `expo-camera` multiscan en el móvil |
| Dónde corre la IA facial | Microservicio Python FastAPI (embedding + match), no on-device |
| Registro de personal | Entidad `users` **modificada** (fotos/embedding de referencia, estado activo) |
| Marcaje de asistencia | Foto en vivo → `/face/match` → `attendance/check` (entrada/salida) |
| Conteo de autopartes | **Descartado** (era el alcance anterior) |

## Riesgos y costos

- **Etiquetas impresas**: si la impresión es pequeña o con brillo, la cámara no lee el código → garantizar tamaño/calidad de impresión.
- **Iluminación y ángulo en el registro facial**: es el mayor esfuerzo → tomar varias fotos con ligeras rotaciones/expresiones para robustez.
- **Umbral de similitud**: falsos positivos/negativos → ante baja confianza, confirmación humana del nombre completo.
- **Depende del registro previo**: la asistencia solo reconoce personal ya registrado.
- **Privacidad**: las fotos del rostro quedan en el backend/microservicio; no exponerlas.

## Alcance recomendado

- **Ahora**: flujo completo de código de barras (generación + identificación del producto) y asistencia facial (registro + marcaje + historial).
- **Base ya lista**: `products.codigo` (los productos existen con su código) y `users`.