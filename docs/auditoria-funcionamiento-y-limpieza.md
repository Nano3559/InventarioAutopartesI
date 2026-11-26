# Auditoría de Funcionamiento y Limpieza de Archivos — AutoParts Pro

> **Fecha de ejecución:** 22/11/2026 · **Rama de auditoría:** `feature/auditoria-seguridad`  
> **Alcance:** Monorepo integral (Backend NestJS, Frontend Web React/Vite, App Móvil Expo, AI-Service Python, Notebooks y Raíz).  
> **Objetivo:** Identificar archivos basura, código muerto, componentes no referenciados, duplicaciones de lógica y evaluar el funcionamiento operativo real de los flujos de negocio.

---

## 1. Inventario y Priorización de Archivos Basura y No Utilizados

Se ha realizado un barrido exhaustivo del árbol de archivos y del índice de Git (`git ls-files`). Se clasifican los archivos detectados en 4 niveles de prioridad según su impacto y el riesgo de su remoción:

### Nivel 1: Eliminación Inmediata (100% Basura / Cero Riesgo)
Archivos temporales, logs de depuración local, artefactos compilados y código muerto que fueron commiteados por error y no son requeridos por ningún subproyecto:

| Archivo | Ubicación | Tamaño / Tipo | Razón por la que es basura |
| :--- | :--- | :--- | :--- |
| **`mobile/expo-web.log`** | `mobile/` | ~11.5 KB (Log) | Log local de ejecución de Expo Web en la máquina de un desarrollador. Commiteado por error. |
| **`reconocer_rostro.cpython-312.pyc`** | `backend/spike/python/__pycache__/` | Binario `.pyc` | Bytecode compilado de Python versionado en Git. Viola estándares de repositorio limpio. |
| **`usuario_cliente_modelo.txt`** | Raíz `/` | Texto plano | Archivo de notas temporal generado al crear un usuario cliente de prueba; contiene credenciales y enlaces temporales. |
| **`bd supabase.txt`** | Raíz `/` | Texto plano (~3 KB) | Dump parcial de tablas SQL con una advertencia en la cabecera: *"This schema is for context only and is not meant to be run"*. Innecesario; el esquema real está en `backend/schema.sql` y las entidades TypeORM. |
| **`frontend/src/App.css`** | `frontend/src/` | 825 líneas (CSS) | Hoja de estilos heredada del template inicial de Vite / landing page antigua (`.site-header`, `.nav`, `.brand`, etc.). **Nunca es importada** ni en `App.tsx` ni en `main.tsx`. |
| **`frontend/src/assets/hero.png`** | `frontend/src/assets/` | 13 KB (PNG) | Imagen decorativa de la landing page previa. Ningún componente la importa. |
| **`frontend/src/assets/react.svg`** | `frontend/src/assets/` | 4 KB (SVG) | Ícono por defecto creado por `npm create vite@latest`. No se utiliza. |
| **`frontend/src/assets/vite.svg`** | `frontend/src/assets/` | 1.5 KB (SVG) | Ícono por defecto creado por Vite. No se utiliza. |

---

### Nivel 2: Archivos Duplicados y Mal Ubicados (Reubicar o Eliminar)
Archivos válidos pero que fueron volcados en la raíz del monorepo generando desorden:

| Archivo | Ubicación Actual | Destino Correcto | Justificación |
| :--- | :--- | :--- | :--- |
| **`entrenamiento_exito_autopartes.ipynb`** | Raíz `/` | Eliminar de raíz (ya existe en `notebooks/`) | Es una copia idéntica del notebook que ya reside y se documenta dentro de `notebooks/entrenamiento_exito_autopartes.ipynb`. |
| **`dataset_entrenamiento.csv`** | Raíz `/` | `notebooks/` o `.gitignore` | Dataset de entrenamiento del modelo de rotación/éxito (Hito 4). No debe ensuciar la raíz del monorepo; su lugar natural es la carpeta `notebooks/`. |

---

### Nivel 3: Archivos de Spike y Prototipos Obsoletos
Durante el desarrollo del Hito 3 se hicieron prototipos de prueba de concepto (spikes). Varios de estos quedaron superados por el código productivo en `backend/src/face/`:

| Archivo / Carpeta | Propósito Original | Estado Actual y Recomendación |
| :--- | :--- | :--- |
| **`backend/spike/python/`** (`reconocer_rostro.py`, `requirements.txt`) | Prototipo inicial para evaluar si el reconocimiento facial debía ser un microservicio en Python. | **Obsoleto**: Se tomó la decisión de arquitectura de ejecutar ArcFace in-process en NestJS con `onnxruntime-node`. No se utiliza en producción. |
| **`backend/spike/inspect-scrfd.mjs`** | Script de inspección manual de pesos del modelo SCRFD. | **Obsoleto**: Tarea puntual de depuración ya concluida. |
| **`backend/spike/probar-rehidratacion.mjs`** | Prueba de rehidratación de buffers a Float32Array. | **Obsoleto**: Resuelto e integrado en `FaceEmbedding`. |
| **`backend/spike/models/`** | Almacenaba pesos de prueba (`arcfaceresnet100-11-int8.onnx` de 65.7 MB y `version-RFB-320.onnx` de 1.2 MB). | Está en `.gitignore`, pero ocupa ~67 MB en disco local. Puede eliminarse localmente. |

> **Nota importante:** Los scripts `backend/spike/face-check.ts`, `backend/spike/scrfd-check.ts` y `backend/spike/demand-check.ts` **SÍ se mantienen**, ya que son ejecutados por los comandos de verificación de `package.json` (`npm run face:check`, `npm run demand:check`).

---

### Nivel 4: Archivos Sensibles y Configuraciones Específicas
Archivos que representan malas prácticas de seguridad o herramientas que no aplican a todo el equipo:

| Archivo | Problema | Acción Recomendada |
| :--- | :--- | :--- |
| **`mobile/credentials.json`** | Contiene en texto plano la contraseña de la Keystore de Android (`"keystorePassword": "autopartes123"`, `"keyAlias": "autopartes"`). | **Peligro de fuga:** Agregar a `.gitignore` y eliminar del índice de Git (`git rm --cached mobile/credentials.json`). |
| **`mobile/CLAUDE.md`** y **`mobile/.claude/`** | Reglas específicas del editor Claude Desktop dentro de la carpeta `mobile/`. | Unificar con `mobile/AGENTS.md` o ignorar en Git para no imponer configs personales. |
| **`Documento de Integración Hito 3.md`** | Especificación técnica previa que quedó desactualizada (según consta en `AGENTS.md`). | Mover a `docs/historico/` o archivar para evitar confusión con las decisiones actuales. |

---

## 2. Auditoría de Funcionamiento del Sistema (Módulo por Módulo)

Se ha evaluado la lógica de negocio, integración entre frontend/móvil y backend, persistencia en base de datos y flujos de usuario:

### 2.1 Módulo de Inventario y Catálogo de Productos
* **Funcionamiento:** **100% Operativo**.
  - CRUD de productos con asignación multisede (`locations` y `inventories`).
  - Generación de código de barras Code128 con formato estándar `AP-<id>-<codigoFabrica>` (`@bwip-js/node`, `@bwip-js/browser`, `@bwip-js/react-native`).
  - Búsqueda visual por imagen mediante hash perceptual (distancia de Hamming $\le 10$).
* **Incoherencia Funcional Detectada:**
  - En el **Frontend Web** (`frontend/src/routes/index.tsx`), la ruta `/inventario` está restringida exclusivamente a `admin` (`allowedRoles={['admin']}`). Los roles `tienda` e `inventario` no pueden ver la tabla general del catálogo en web (aunque sí pueden ver `/inventario/:id`).
  - En la **App Móvil** (`mobile/src/components/AppDrawer.tsx`), el rol `inventario` sí tiene acceso al módulo de Inventario.
  - **Sugerencia:** Alinear los permisos de la ruta `/inventario` en Web para que `inventario` pueda consultar el catálogo general.

---

### 2.2 Módulo de Ventas y Facturación (POS y Mayoristas)
* **Funcionamiento:** **Operativo**.
  - Soporta ventas minoristas (`menor`) y mayoristas (`mayor`).
  - Importación masiva por Excel (`POST /sales/import-mayor`) con vista previa (`preview`) y validación de stock disponible.
  - Descuenta inventario en tiempo real en la tienda correspondiente (`adjustStock`).
  - Registro de múltiples formas de pago (`pagos`).
* **Observación de Funcionamiento:**
  - No existe validación de que el precio de venta unitario respete el precio oficial del catálogo o un margen mínimo (hallazgo **SEC-02** de la auditoría de seguridad).

---

### 2.3 Módulo de Movimientos y Transferencias
* **Funcionamiento:** **Operativo**.
  - Valida que la sucursal de origen tenga stock suficiente antes de transferir.
  - Genera comprobante de traspaso tanto en web como en móvil.
* **Observación Técnica:**
  - Las operaciones `adjustStock(origen, -cantidad)` y `adjustStock(destino, +cantidad)` en `movimientos.service.ts` se ejecutan secuencialmente pero sin envolverse en `this.dataSource.transaction`. Si la conexión cae entre ambas llamadas, el stock queda descontado del origen pero no sumado en destino.

---

### 2.4 Módulo de Asistencia y Reconocimiento Facial (Hito 3)
* **Funcionamiento:** **100% Operativo**.
  - Modelo ArcFace int8 corriendo *in-process* en NestJS (`onnxruntime-node`).
  - Fotos de referencia almacenadas en el bucket privado `faces` de Supabase, accesibles solo con URLs firmadas de corta duración.
  - Detección y recorte de rostro integrado con detector UltraFace/SCRFD y cálculo de similitud coseno con umbral estricto `0.80`.
  - **Modo Tiqueador (Kiosco):** La tablet de la tienda funciona en modo kiosco horizontal/vertical bloqueado, sin drawer, y requiere contraseña del administrador (`AdminPasswordGate`) para salir, descartando el token nuevo para no desloguear la tablet.

---

### 2.5 Módulo de Reconocimiento de Autopartes por IA (YOLO11n-cls)
* **Funcionamiento:** **100% Operativo**.
  - Microservicio FastAPI (`ai-service` en puerto 8001) entrenado con dataset de 40 clases.
  - Proxy seguro en NestJS (`POST /api/part-recognition/predict`) restringido al rol `cliente`.
  - En caso de caída del microservicio, NestJS captura el error limpiamente y responde con `BadGatewayException` (502) sin colgar el servidor.

---

### 2.6 Módulo de Predicción de Demanda y Viabilidad Comercial (Hito 4)
* **Funcionamiento:** **100% Operativo**.
  - Modelo Random Forest exportado a ONNX (`modelo_exito_autopartes.onnx`) ejecutado in-process.
  - Guardrails semánticos y financieros protegiendo la inferencia (rechazo de incongruencias con 400 y sugerencias en tiempo real).
  - Score compuesto ponderado (40% rotación IA, 40% salud del margen, 20% saturación de catálogo).
  - Globos inteligentes de sugerencia en frontend (`PredictSuccessModal.tsx`) con autocorrección en 1 clic.

---

## 3. Discrepancias Arquitectónicas y Duplicación de Código

1. **Dualidad en Servicios de Ubicaciones en Frontend:**
   - Existe `frontend/src/api/locations.ts` (con funciones sueltas `getLocations`, `getAlmacenes`, `getTiendas`).
   - Existe `frontend/src/services/locations.service.ts` (clase singleton `locationsService`).
   - *Problema:* Las pantallas `DevolucionesPage` y `SolicitudesPage` importan de `api/locations.ts`, mientras que el resto de pantallas usan `services/locations.service.ts`.
   - *Recomendación:* Migrar `DevolucionesPage` y `SolicitudesPage` a `locationsService` y eliminar `api/locations.ts`.

2. **Servicios de Devoluciones y Solicitudes en Carpeta Inconsistente:**
   - La mayoría de entidades del frontend están en `frontend/src/services/` (`sales`, `costos`, `precios`, `products`, `users`, `reportes`, `attendance`, `movimientos`).
   - Sin embargo, `devoluciones.ts` y `solicitudes.ts` se dejaron en `frontend/src/api/`.
   - *Recomendación:* Moverlos a `frontend/src/services/` para uniformar la arquitectura.

---

## 4. Plan de Limpieza y Depuración Propuesto

### Paso 1: Limpieza de Archivos Basura y Temporales
```bash
# Eliminar archivos temporales y basura en raíz
git rm "bd supabase.txt"
git rm "usuario_cliente_modelo.txt"
git rm "entrenamiento_exito_autopartes.ipynb"   # ya existe en notebooks/

# Eliminar log de Expo en móvil y desversionar credenciales sensibles
git rm "mobile/expo-web.log"
git rm --cached "mobile/credentials.json"

# Eliminar artefacto compilado de Python
git rm "backend/spike/python/__pycache__/reconocer_rostro.cpython-312.pyc"

# Eliminar CSS muerto y assets no utilizados en frontend
git rm "frontend/src/App.css"
git rm "frontend/src/assets/hero.png"
git rm "frontend/src/assets/react.svg"
git rm "frontend/src/assets/vite.svg"
```

### Paso 2: Reubicación de Datos
- Mover `dataset_entrenamiento.csv` a la carpeta `notebooks/`.

### Paso 3: Endurecimiento de `.gitignore`
Añadir a `.gitignore`:
```gitignore
# Credenciales locales de compilación móvil
credentials.json

# Logs de Expo
expo-*.log

# Bytecode de Python
__pycache__/
*.py[cod]
```

### Paso 4: Unificación Arquitectónica
- Unificar llamadas de `api/locations.ts` en `services/locations.service.ts`.
- Homogeneizar permisos de la ruta `/inventario` en `frontend/src/routes/index.tsx` para permitir acceso al rol `inventario`.

---
*Documento elaborado como bitácora de auditoría funcional y optimización del código de AutoParts Pro.*

---

## Revisión independiente AUD-REV-03-20261122

> **Fecha:** 22/11/2026  
> **Tipo:** Revisión independiente, documental y estática  
> **Relación con la auditoría anterior:** esta sección **amplía y corrige** la auditoría precedente sin borrar, reescribir ni ocultar sus resultados originales. Las afirmaciones de operación se evalúan por evidencia disponible y no sustituyen pruebas reales de dispositivo, base de datos o producción.  
> **Estado común de los hallazgos:** **Pendiente**.

### A. Hallazgos funcionales

| ID | Dictamen | Prioridad | Evidencia | Retroalimentación y corrección requerida | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AUD3-FUN-001** | **“100% operativo” no está demostrado para inventario.** El propio documento registra una ruta web inaccesible para `inventario`, y la búsqueda visual devuelve los mejores resultados sin aplicar el umbral Hamming ≤10 afirmado. | Alta · P1 | `docs/auditoria-funcionamiento-y-limpieza.md:69-76`; `frontend/src/routes/index.tsx:43-59`; `backend/src/products/products.service.ts:644-669` | Cambiar el estado a “implementado/parcialmente verificado”; definir roles esperados y criterio de aceptación de similitud. Añadir pruebas por rol y casos sin coincidencia suficiente. | Pendiente |
| **AUD3-FUN-002** | **Ventas funcionan nominalmente, pero no pueden calificarse operativas de forma segura.** Precio, pagos, venta e inventario no forman una transacción; edición e importación repiten el riesgo. | Crítica · P0 | `docs/auditoria-funcionamiento-y-limpieza.md:80-87`; `backend/src/sales/sales.service.ts:192-203`; `backend/src/sales/sales.service.ts:409-478`; `backend/src/sales/sales.service.ts:720-772` | Declarar “operativo con defectos críticos de integridad” hasta implementar transacciones, precio server-side y pruebas concurrentes/fallo intermedio. | Pendiente |
| **AUD3-FUN-003** | **El flujo de asistencia no es biométrico en el tiqueador actual.** Tras elegir un empleado por carnet, la app manda `usuarioId`; el backend registra manual y salta ArcFace. | Crítica · P0 | `mobile/src/screens/AttendanceScreen.tsx:273-310`; `backend/src/attendance/attendance.controller.ts:62-68`; `backend/src/attendance/attendance.service.ts:536-567` | Separar y rotular los flujos. Para afirmar reconocimiento facial operativo, el camino normal debe enviar solo foto/recorte y verificar identidad; el manual debe ser excepcional y auditado. | Pendiente |
| **AUD3-FUN-004** | **El mecanismo de carnet no es fuente maestra.** El mapa vive por dispositivo, trae asociaciones semilla, permite reasignación y acepta ID/email; dos tablets pueden resolver personas de forma distinta. | Crítica · P0 | `mobile/src/storage/carnets.ts:5-26`; `mobile/src/storage/carnets.ts:28-68`; `mobile/src/storage/carnets.ts:71-100` | Eliminarlo como autenticación o centralizarlo en backend con unicidad, permisos y auditoría. Probar sincronización, colisiones, baja de usuario y cambio de dispositivo. | Pendiente |
| **AUD3-FUN-005** | **Reconocimiento facial tiene documentación contradictoria.** Una sección dice que SCRFD está implementado y obligatorio; otra dice que falta portarlo. Por ello “100% operativo” no es un estado documental defendible sin revalidación real. | Alta · P1 | `docs/auditoria-funcionamiento-y-limpieza.md:100-105`; `docs/arquitectura.md:133`; `docs/arquitectura.md:311-313`; `AGENTS.md:52` | Revalidar código/modelos con personas reales, registrar scores y unificar la documentación. Distinguir inferencia cargada, detección/alineación, precisión y despliegue. | Pendiente |
| **AUD3-FUN-006** | **La descripción del kiosco como “horizontal/vertical bloqueado” es incorrecta.** La orientación es `default`, por lo que toda la app puede rotar. | Media · P2 | `docs/auditoria-funcionamiento-y-limpieza.md:105`; `mobile/app.json:3-7`; `Plan Hito 3.md:142` | Describirlo como layout responsive en ambas orientaciones, no bloqueado. Si el requisito es bloqueo por pantalla, implementar y probar una política específica. | Pendiente |
| **AUD3-FUN-007** | **Reconocimiento de autopartes no es “100% operativo” en producción según la evidencia versionada.** El modelo verificado tiene 50 clases, no 40; Render devolvía 503 y el servicio Python remoto figuraba pendiente. | Crítica · P0 | `docs/auditoria-funcionamiento-y-limpieza.md:109-113`; `ai-service/VERIFICATION.md:7-15`; `ai-service/VERIFICATION.md:31`; `ai-service/VERIFICATION.md:36-40`; `ai-service/README.md:195-197` | Estado correcto: modelo e integración local verificados; producción pendiente/no acreditada en esa evidencia. Ejecutar health e inferencia pública actuales antes de declarar operativo. | Pendiente |
| **AUD3-FUN-008** | **Predicción de demanda no está demostrada en producción.** Los artefactos ONNX/JSON están ignorados y un clon no los recupera; las verificaciones documentadas son locales. | Alta · P1 | `docs/auditoria-funcionamiento-y-limpieza.md:117-122`; `notebooks/README.md:21-24`; `notebooks/README.md:65-83` | Usar estados “verificado localmente” y “provisionamiento de producción pendiente” hasta comprobar modelo, hash, endpoint y UI en Render. | Pendiente |
| **AUD3-FUN-009** | **Permisos web incoherentes.** `/inventario` es solo admin mientras el detalle acepta tienda/inventario; la navegación móvil ofrece inventario al rol correspondiente. | Alta · P1 | `frontend/src/routes/index.tsx:43-59`; `docs/auditoria-funcionamiento-y-limpieza.md:73-76`; `docs/arquitectura.md:173-182` | Definir matriz RBAC canónica y alinear ruta, sidebar y API. Añadir pruebas de navegación y API por cada rol. | Pendiente |
| **AUD3-FUN-010** | **El admin web puede operar ventas sin sede explícita y caer en ubicación 1.** La UI envía `locationId` solo si `user.tiendaId` existe y el backend usa `1` como fallback. | Alta · P0 | `frontend/src/pages/ventas/SalesPage.tsx:62-63`; `frontend/src/pages/ventas/SalesPage.tsx:290`; `frontend/src/pages/ventas/VentaMayorPage.tsx:60-61`; `frontend/src/pages/ventas/VentaMayorPage.tsx:262`; `backend/src/sales/sales.service.ts:84-91` | Obligar al admin a seleccionar sede antes de cotizar stock o vender; eliminar fallback silencioso a ubicación 1. | Pendiente |
| **AUD3-FUN-011** | **Venta Mayor móvil usa stock global y no exige tienda activa.** Valida contra `stockTotal` y envía `user.tiendaId`, que para admin puede ser nulo; el backend vuelve a ubicación 1. | Crítica · P0 | `mobile/src/screens/VentaMayorScreen.tsx:29`; `mobile/src/screens/VentaMayorScreen.tsx:146-172`; `mobile/src/screens/VentaMayorScreen.tsx:237`; `backend/src/sales/sales.service.ts:671-694` | Usar tienda activa del dispositivo/contexto, consultar stock por ubicación y bloquear confirmación sin sede. Revalidar stock dentro de una transacción en backend. | Pendiente |
| **AUD3-FUN-012** | **Un enlace HTML interno puede cerrar la sesión web.** Búsqueda por imagen usa `<a href>`; la recarga monta `AuthProvider`, que borra token/usuario. | Alta · P1 | `frontend/src/pages/inventory/SearchByImagePage.tsx:237-245`; `frontend/src/context/AuthContext.tsx:9-22` | Usar `Link`/`navigate` para rutas SPA o cambiar deliberadamente la política de sesión. Añadir prueba de navegación desde resultados. | Pendiente |
| **AUD3-FUN-013** | **El centro de notificaciones está desconectado de los flujos.** Existe `addNotification`, pero no se observan invocaciones fuera del provider; la UI puede permanecer vacía salvo datos previos de `localStorage`. | Media · P2 | `frontend/src/context/NotificationContext.tsx:43-65`; `frontend/src/layouts/Navbar.tsx:80-98` | Conectar eventos reales o retirar/rotular la función como local/demo. Definir fuente, sincronización y expiración de notificaciones. | Pendiente |
| **AUD3-FUN-014** | **Manejo API web/móvil inconsistente.** Web convierte cualquier fallo de red en status 500, no fija timeout y fuerza recarga en 401; móvil tampoco aplica timeout general y considera cualquier respuesta menor a 600 como “vivo”. | Alta · P1 | `frontend/src/api/client.ts:61-90`; `mobile/src/api/client.ts:95-120`; `mobile/src/api/client.ts:123-156` | Unificar `AbortSignal.timeout`, status de red distinguible, retry solo idempotente y flujo central de expiración de sesión. Readiness no debe aceptar 401/500 como salud completa. | Pendiente |
| **AUD3-FUN-015** | **Android permite HTTP claro.** Es útil en desarrollo local, pero no debe quedar como postura de producción sin configuración por entorno. | Alta · P1 | `mobile/app.json:13-26`; `docs/entornos.md:115-124` | Separar configuración dev/prod y bloquear cleartext en builds de producción, salvo excepciones de network security config documentadas. | Pendiente |
| **AUD3-FUN-016** | **Expo Web almacena token y carnets en `localStorage`.** No comparte las garantías de SecureStore nativo. | Alta · P1 | `mobile/src/storage/token.ts:4-11`; `mobile/src/storage/carnets.ts:28-35`; `mobile/src/storage/carnets.ts:61-66` | Documentar la diferencia de plataforma; evitar datos de identidad local en web y adoptar manejo de sesión web apropiado. | Pendiente |
| **AUD3-FUN-017** | **El consentimiento facial no queda acreditado de forma suficiente.** Está presente en UI, pero no se conserva en backend con versión, fecha, actor o revocación; además, el flujo de reentrenamiento activa el consentimiento local automáticamente. | Alta · P1 legal/privacidad | `mobile/src/screens/FaceRegisterScreen.tsx:78-110`; `mobile/src/screens/FaceRegisterScreen.tsx:302-305`; `mobile/src/screens/FaceRegisterScreen.tsx:791-804`; `backend/src/entities/user.entity.ts:43-48` | Exigir confirmación explícita también al reemplazar biometría y persistir evidencia verificable: versión del aviso, timestamp, actor, finalidad y mecanismo de revocación. | Pendiente |
| **AUD3-FUN-018** | **La afirmación de usar `@bwip-js/react-native` no coincide con el proyecto móvil actual.** La dependencia no está en `mobile/package.json`; móvil escanea con `expo-camera`, pero no genera Code128 con bwip. | Media · P2 | `AGENTS.md:48`; `mobile/package.json:5-28`; `mobile/src/screens/ScannerScreen.tsx:47-55`; `mobile/src/screens/ScannerScreen.tsx:318` | Corregir stack/documentación o implementar el uso real si existe un requisito de generación móvil. No confundir escaneo con renderizado de etiquetas. | Pendiente |
| **AUD3-FUN-019** | **Movimientos y solicitudes pueden quedar parcialmente aplicados.** Los dos ajustes de stock, movimiento y cambio de estado se ejecutan secuencialmente sin transacción común. | Crítica · P0 | `backend/src/movimientos/movimientos.service.ts:65-94`; `backend/src/solicitudes/solicitudes.service.ts:108-147` | Encapsular operación y transición en transacción con bloqueo; probar caída después de cada paso y doble despacho concurrente. | Pendiente |
| **AUD3-FUN-020** | **Rutas móviles registradas no tienen navegación efectiva.** `ProductDetail` y `SalesEdit` están en el stack, pero no se observaron llamadas que naveguen hacia ellas; `SalesEditScreen` solo envuelve la pantalla de ventas. | Media · P2 | `mobile/App.tsx:181-186`; `mobile/src/screens/SalesEditScreen.tsx:7-11`; `mobile/src/screens/InventarioScreen.tsx:191-206` | Conectar los flujos desde inventario/historial con parámetros y pruebas, o retirar rutas/código para no declarar funciones inaccesibles. | Pendiente |
| **AUD3-FUN-021** | **Los controles de detalle de producto móvil no se adaptan al rol.** Carga de imagen, ajuste de stock y activación aparecen sin una matriz de capacidades coherente con el backend. | Media · P1 | `mobile/src/screens/ProductDetailScreen.tsx:244-273`; `mobile/src/screens/ProductDetailScreen.tsx:330-357`; `backend/src/products/products.controller.ts:127-148` | Ocultar o deshabilitar por capacidad para evitar flujos que terminan en 403, manteniendo RBAC en backend como control definitivo. | Pendiente |
| **AUD3-FUN-022** | **No hay cierre global de sesión móvil ante 401/403.** El cliente transforma el error, pero conserva sesión y navegación mientras las operaciones siguen fallando individualmente. | Media · P1 | `mobile/src/api/client.ts:146-156`; `mobile/src/context/AuthContext.tsx:33-61` | Centralizar expiración de sesión, borrar token y volver al login en 401; ante 403, refrescar identidad/rol o bloquear la capacidad afectada. | Pendiente |
| **AUD3-FUN-023** | **La búsqueda visual móvil puede construir imágenes incorrectas y depender de un tercero.** Usa la ruta recibida sin resolverla contra la API y emplea `placehold.co` como fallback. | Baja · P2 | `mobile/src/screens/SearchByImageScreen.tsx:121-126` | Resolver URLs relativas con la configuración de API y usar un recurso local para evitar fallos y exposición innecesaria de metadatos a terceros. | Pendiente |

### B. Hallazgos de limpieza y repositorio

| ID | Dictamen | Prioridad | Evidencia | Retroalimentación y corrección requerida | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AUD3-LIM-001** | **Los tamaños/conteos originales son incorrectos.** Valores reales: `mobile/expo-web.log` 188 bytes/4 líneas; `bd supabase.txt` 9.570 bytes/206 líneas; `frontend/src/App.css` 693 líneas; `frontend/src/assets/vite.svg` 8.710 bytes. | Media · P2 | `docs/auditoria-funcionamiento-y-limpieza.md:18-25`; `mobile/expo-web.log`; `bd supabase.txt:1-40`; `frontend/src/App.css`; `frontend/src/assets/vite.svg` | Conservar los valores anteriores como historial y añadir medición reproducible en bytes/líneas, evitando aproximaciones no comprobadas. | Pendiente |
| **AUD3-LIM-002** | **El barrido no fue exhaustivo: hay 181 archivos versionados bajo `node_modules/` raíz.** Esto contradice el ignore y es la mayor omisión de limpieza del índice. | Alta · P0 | `docs/auditoria-funcionamiento-y-limpieza.md:11`; `.gitignore:14-19`; `node_modules/.package-lock.json` | Retirar `node_modules/` del índice, verificar por qué entró y añadir una comprobación CI de artefactos prohibidos. No borrar dependencias locales como sustituto de desindexarlas correctamente. | Pendiente |
| **AUD3-LIM-003** | **Los notebooks duplicados están confirmados como idénticos.** Ambos tienen SHA-256 `D347DF2A38C5A480DC5F1D496419D7F267F5D8C4596EEABDE2F511E40DAB5D3A`. | Media · P1 | `entrenamiento_exito_autopartes.ipynb`; `notebooks/entrenamiento_exito_autopartes.ipynb`; `docs/auditoria-funcionamiento-y-limpieza.md:34` | Conservar la copia documentada bajo `notebooks/` y retirar la raíz en un commit que actualice cualquier enlace afectado. Registrar hash/comando como evidencia. | Pendiente |
| **AUD3-LIM-004** | **Mover `dataset_entrenamiento.csv` rompe rutas actuales si se hace aisladamente.** El entrenador lo busca en raíz, el extractor lo genera allí y la documentación enlaza esa ubicación. | Alta · P1 | `docs/auditoria-funcionamiento-y-limpieza.md:35`; `docs/auditoria-funcionamiento-y-limpieza.md:164-165`; `notebooks/train_predictive_model.py:26-34`; `backend/scripts/extract_training_data.js:128`; `docs/configuracion-modelo-prediccion.md:28`; `docs/configuracion-modelo-prediccion.md:42` | Decidir ubicación canónica y cambiar productor, consumidor, comandos y enlaces en el mismo commit. No ignorar el dataset sin definir reproducibilidad/procedencia. | Pendiente |
| **AUD3-LIM-005** | **Varios spikes siguen referenciados o ejecutables.** `probar-rehidratacion.mjs` conserva script npm; el spike Python se cita como antecedente del pipeline; `scrfd-check.ts` corresponde a `face:detector:check`. | Alta · P1 | `docs/auditoria-funcionamiento-y-limpieza.md:44-49`; `backend/package.json:20-30`; `backend/src/face/face-align.ts:13`; `docs/arquitectura.md:311-313`; `docs/e2e-asistencia.md:115-116` | Clasificar cada spike como comando mantenido, referencia histórica o eliminable. Antes de borrar, retirar/reemplazar referencias y ejecutar checks equivalentes. | Pendiente |
| **AUD3-LIM-006** | **Archivos frontend muertos confirmados.** No se observaron imports de `App.css`, `hero.png`, `react.svg` ni `vite.svg` dentro de `frontend/src`. | Baja · P2 | `docs/auditoria-funcionamiento-y-limpieza.md:22-25`; `frontend/src/App.css`; `frontend/src/assets/hero.png`; `frontend/src/assets/react.svg`; `frontend/src/assets/vite.svg` | Retirarlos en un commit de limpieza separado y comprobar lint/build. Mantener evidencia de búsqueda para no basarse solo en inspección visual. | Pendiente |
| **AUD3-LIM-007** | **Hay otras omisiones de limpieza.** El README genérico de Nest continúa versionado; `mobile/.claude/settings.json` debe evaluarse individualmente; uploads runtime incluyen 42 archivos rastreados, entre ellos facturas PDF. | Alta · P1 | `backend/README.md:1-5`; `mobile/.claude/settings.json`; `.gitignore:41-43`; `backend/uploads/factura-1787856657831-549.pdf` | Sustituir/retirar README de plantilla, decidir política de configuración compartida y separar fixtures sintéticos de archivos runtime. Revisar historial por datos sensibles. | Pendiente |
| **AUD3-LIM-008** | **`expo-*.log` es redundante como regla nueva.** La raíz ya ignora `*.log`; el archivo aparece porque está previamente rastreado. | Baja · P2 | `docs/auditoria-funcionamiento-y-limpieza.md:167-179`; `.gitignore:62-71`; `mobile/expo-web.log` | Desindexar el archivo y conservar la regla global. Añadir patrones más específicos solo si expresan una política distinta. | Pendiente |
| **AUD3-LIM-009** | **Las credenciales requieren respuesta de incidente, no solo limpieza.** Desindexar `credentials.json` o borrar la nota no invalida valores presentes en historial. | Crítica · P0 | `docs/auditoria-funcionamiento-y-limpieza.md:58`; `docs/auditoria-funcionamiento-y-limpieza.md:150-152`; `mobile/credentials.json:1-10`; `usuario_cliente_modelo.txt:1-5` | Rotar/revocar, revisar uso e historial y después retirar archivos. No reproducir secretos en commits, issues ni documentación. | Pendiente |
| **AUD3-LIM-010** | **`bd supabase.txt` no es solo un duplicado inocuo.** Es un snapshot de esquema desplegado, puede divergir y contiene estructura sensible; `schema.sql` también está desincronizado. | Alta · P1 | `bd supabase.txt:1-2`; `bd supabase.txt:30-40`; `backend/schema.sql:1-10`; `docs/arquitectura.md:52-53` | Retirar o archivar como evidencia histórica sanitizada con fecha/origen. Establecer migraciones o generación canónica de esquema. | Pendiente |
| **AUD3-LIM-011** | **El plan de borrado debe preservar coordinación documental y validación.** Varias eliminaciones propuestas afectan scripts, referencias o seguridad y no son todas “cero riesgo”. | Alta · P1 | `docs/auditoria-funcionamiento-y-limpieza.md:13-25`; `docs/auditoria-funcionamiento-y-limpieza.md:141-183`; `backend/package.json:20-30` | Dividir en commits: contención de secretos, desindexación de artefactos, deduplicación, refactor arquitectónico. Ejecutar checks del módulo después de cada grupo. | Pendiente |
| **AUD3-LIM-012** | **El barrido de código muerto omitió más elementos.** `PlaceholderPage` no está en rutas y existen funciones API sin consumidores visibles, como `getLocation`, operaciones de producto móvil y `marcarAsistenciaManual`. | Media · P2 | `frontend/src/pages/placeholder/PlaceholderPage.tsx:1-60`; `frontend/src/api/locations.ts:18-20`; `mobile/src/api/products.ts:35-56`; `mobile/src/api/attendance.ts:191-200` | Confirmar con búsqueda y build antes de eliminar; distinguir código muerto de API preparada para una función pendiente y documentar la decisión. | Pendiente |

### C. Hallazgos documentales

| ID | Dictamen | Prioridad | Evidencia | Retroalimentación y corrección requerida | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AUD3-DOC-001** | **Los términos “exhaustivo”, “100% operativo” y “cero riesgo” exceden la evidencia.** No se registran comandos, entorno, commit, resultados ni matriz de casos que los sustenten. | Alta · P1 | `docs/auditoria-funcionamiento-y-limpieza.md:11-14`; `docs/auditoria-funcionamiento-y-limpieza.md:69`; `docs/auditoria-funcionamiento-y-limpieza.md:101`; `docs/auditoria-funcionamiento-y-limpieza.md:110`; `docs/auditoria-funcionamiento-y-limpieza.md:118` | Usar estados: implementado, verificado unitariamente, verificado localmente, verificado en integración, verificado en producción y bloqueado. Adjuntar fecha/comando/resultado. | Pendiente |
| **AUD3-DOC-002** | **La documentación facial se contradice.** SCRFD figura simultáneamente implementado y pendiente; el índice aún describe arquitectura “sin detector”. | Alta · P1 | `docs/arquitectura.md:95`; `docs/arquitectura.md:133`; `docs/arquitectura.md:311-313`; `docs/README.md:13`; `AGENTS.md:52` | Revalidar código actual y actualizar arquitectura, índice, plan y AGENTS en el mismo commit. Marcar decisiones históricas como tales. | Pendiente |
| **AUD3-DOC-003** | **La documentación de IA de autopartes mezcla 40 y 50 clases y estado local/nube.** | Alta · P1 | `docs/auditoria-funcionamiento-y-limpieza.md:111`; `ai-service/VERIFICATION.md:7-15`; `ai-service/VERIFICATION.md:31-40` | Usar el manifiesto/model-info del checkpoint activo como fuente de número de clases y separar estado local de despliegue productivo. | Pendiente |
| **AUD3-DOC-004** | **El árbol del README raíz omite componentes vigentes.** `ai-service/` y `notebooks/` no aparecen en la estructura resumida, aunque el mismo README los describe. | Media · P2 | `README.md:10-15`; `README.md:23`; `README.md:100-132` | Añadir ambos componentes cuando se haga la próxima actualización estructural, sin duplicar el “cómo” ya mantenido en sus README. | Pendiente |
| **AUD3-DOC-005** | **Stack móvil desactualizado respecto a Code128.** Se afirma `@bwip-js/react-native`, pero no es dependencia ni aparece en código móvil. | Media · P2 | `docs/stack-tecnologico.md:48-50`; `README.md:91-93`; `mobile/package.json:5-28` | Corregir las tablas para indicar escaneo con `expo-camera`; mantener bwip solo en plataformas donde está instalado/usado. | Pendiente |
| **AUD3-DOC-006** | **El esquema de referencia no representa todas las entidades y conserva comentarios obsoletos.** | Alta · P1 | `docs/arquitectura.md:34-53`; `backend/schema.sql:38-42`; `backend/src/entities/user.entity.ts:39-45` | Definir una fuente canónica: migraciones/entidades. Si `schema.sql` sigue siendo ejecutable, automatizar comparación y actualizarlo junto con cambios de entidad. | Pendiente |
| **AUD3-DOC-007** | **Las auditorías están enlazadas desde un índice modificado mientras ambos documentos aún no estaban en el índice Git al iniciar la revisión.** Un commit parcial dejaría enlaces rotos. | Alta · P1 de integración | `docs/README.md:20-21`; `docs/git-convention.md:125-147` | Incluir índice y ambos documentos juntos cuando se integre la auditoría, siguiendo revisión/Definition of Done y sin mezclar remediaciones de código. | Pendiente |
| **AUD3-DOC-008** | **La arquitectura por capas del frontend reconoce duplicidad real de ubicaciones/devoluciones/solicitudes, pero la recomendación requiere validar contratos antes de mover archivos.** | Media · P2 | `docs/auditoria-funcionamiento-y-limpieza.md:126-137`; `frontend/src/pages/ventas/DevolucionesPage.tsx:22-24`; `frontend/src/pages/ventas/SolicitudesPage.tsx:16-18` | Unificar por comportamiento y tipos, no solo por carpeta. Mantener compatibilidad y ejecutar build tras migrar consumidores. | Pendiente |

### D. Aspectos positivos confirmados en AUD-REV-03

1. **Duplicados verificados por contenido:** los dos notebooks predictivos son idénticos, no solo similares por nombre.
2. **Archivos frontend muertos confirmados:** no se hallaron referencias a los cuatro elementos listados en AUD3-LIM-006.
3. **Separación del modelo predictivo documentada honestamente:** `notebooks/README.md:21-24` advierte que los artefactos no viajan con Git y `notebooks/README.md:65-83` limita el alcance de las verificaciones locales.
4. **Reconocimiento de autopartes mantiene documentación de verificación diferenciada:** `ai-service/VERIFICATION.md:17-34` separa pruebas locales, navegador, Supabase y nube, incluida la respuesta 503 observada.
5. **Consentimiento y almacenamiento nativo existen en la implementación móvil:** son controles positivos, aunque requieren completar evidencia servidor y aclarar la excepción web.
6. **Varias incoherencias ya fueron detectadas por la auditoría original:** permisos de inventario, falta de transacción en movimientos y duplicidad de servicios son observaciones válidas que esta revisión amplía.

### E. Plan priorizado de funcionamiento, limpieza y documentación

| Fase | Prioridad | Alcance y criterio de salida |
| :--- | :--- | :--- |
| **0 — Contención** | P0 | Rotar secretos; retirar credenciales y facturas reales del índice; deshabilitar bypass de asistencia; impedir ventas sin sede y stock global móvil. |
| **1 — Integridad funcional** | P0 | Transacciones/bloqueo para ventas, movimientos, solicitudes y devoluciones; precio server-side; matriz multisede; pruebas concurrentes. |
| **2 — Verificación real** | P1 | Probar inventario, asistencia biométrica sin `usuarioId`, IA de autopartes en producción y demanda con artefactos provisionados. Registrar commit, entorno y resultados. |
| **3 — Limpieza segura** | P1 | Desindexar 181 archivos de `node_modules`, logs/pyc/assets muertos; deduplicar notebook; clasificar spikes antes de eliminarlos; coordinar ubicación del dataset. |
| **4 — Coherencia UX/API** | P1/P2 | Corregir rutas por rol, sede admin, navegación SPA, notificaciones y manejo de 401/timeouts; separar configuración Android dev/prod. |
| **5 — Consolidación documental** | P1/P2 | Unificar estado SCRFD, clases del modelo, stack Code128, esquema y estructura raíz. Reemplazar absolutos por estados verificables y conservar esta revisión como historial. |

### F. Criterio de cierre de esta revisión

Un hallazgo funcional solo se cierra con una prueba del flujo afectado y evidencia de persistencia consistente; uno de limpieza, con `git ls-files`/búsqueda y checks del módulo; uno documental, contrastando nuevamente código, lockfiles, rutas y entidades. La eliminación de secretos o documentos sensibles exige rotación y revisión de historial, no únicamente `git rm`.
