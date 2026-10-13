# Estado del modelo de reconocimiento de autopartes

Fecha de corte: **13 de octubre de 2026**. Este documento registra lo implementado, lo comprobado y los pendientes del plan solicitado. El modelo está entrenado y funciona localmente **y en producción**: el servicio Python quedó desplegado en Render, el backend NestJS quedó conectado a él y una predicción autenticada real devolvió el resultado esperado. Quedan pendientes menores (licencia, generalización con fotos propias y merge a `main`), no bloqueantes.

## Contexto y alcance

AutoParts Pro gestiona inventario y ventas de siete importadoras mediante React, NestJS y PostgreSQL en Supabase. Se incorporó un módulo independiente para que un usuario con rol `cliente` cargue una fotografía en la web y consulte la clase de autoparte estimada, su confianza, alternativas y los metadatos verificables del dataset.

```text
React → NestJS /api/part-recognition → FastAPI → YOLO11n-cls
      ← resultado JSON              ← predicción real
```

NestJS sigue siendo el único backend público utilizado por React: autentica mediante JWT, exige el rol cliente, valida archivos y gestiona errores y tiempos de espera. Python no se conecta a Supabase. El modelo clasifica la imagen completa; no detecta varios objetos ni genera bounding boxes.

Este módulo no sustituye el reconocimiento facial ArcFace/SCRFD, la búsqueda por imagen del catálogo ni las funcionalidades de inventario y ventas. No establece automáticamente una correspondencia entre una clase del dataset y un producto del inventario. No se modificaron las pantallas móviles.

## Avance del plan

| Fase | Estado | Implementado y comprobado | Pendiente |
|---|---|---|---|
| 1. Análisis | Completa | Inspección de módulos, roles, autenticación, estilos e integración; conservación de dependencias npm existentes | Sin pendientes específicos de esta fase |
| 2. Dataset | Completa | Descarga KaggleHub, inspección de variantes, clases y CSV; conteos y preparación de particiones; test separado físicamente del entrenamiento | Confirmar licencia antes de publicar imágenes de referencia |
| 3. Inteligencia artificial | Completa | Entrenamiento real en Colab, evaluación en test, importación y verificación de pesos, clases y métricas; inferencia local real | Validar comportamiento con fotografías nuevas ajenas al dataset |
| 4. Servicio Python | Completa | FastAPI, cuatro endpoints, carga única del modelo, validación de imágenes, configuración, límites y errores controlados; desplegado en Render (`autoparts-ai`) con descarga privada de pesos verificada por SHA-256 y arranque en nube comprobado | Sin pendientes de esta fase |
| 5. Base de datos y cliente | Completa | Rol cliente compatible con `users.rol`; asignación autorizada por backend; cuenta cliente real verificada | No se requiere ampliar un enum ni modificar roles anteriores |
| 6. NestJS | Completa | Módulo aislado, cuatro rutas protegidas, validación, proxy HTTP y pruebas de errores/timeouts; URL, secreto y timeout del Python remoto configurados en Render y conexión de producción verificada | Sin pendientes de esta fase |
| 7. React | Completa | Página corporativa, carga y preview, drag & drop, estados de procesamiento/error, confianza, top 3 y metadatos; web publicada en Vercel | Prueba manual en el navegador contra el servicio remoto (ya operativo) con una foto de test y una propia |
| 8. Verificaciones | Completa | Pruebas unitarias, HTTP, navegador, flujo local con pesos reales y **flujo completo en producción** (login cliente real → NestJS → Python → pesos reales) verificado | Repetir con una fotografía propia fuera del dataset |

## Dataset realmente utilizado

- Fuente: [gpiosenka/car-parts-40-classes](https://www.kaggle.com/datasets/gpiosenka/car-parts-40-classes), versión **3**.
- La descarga contiene variantes de 40 y 50 clases. Se seleccionó e inspeccionó **`car parts 50`**, con **50 clases reales**; la cantidad no se dedujo de la URL.
- Total: **9.239 imágenes**: 8.739 de entrenamiento, 250 de validación y 250 de prueba.
- No se encontraron duplicados por SHA-256 entre particiones.
- Los CSV proporcionan etiquetas, índices de clase, rutas de archivos y partición. No contienen fichas técnicas que permitan afirmar fabricantes, compatibilidades, precios o existencias.
- Los nombres en español proceden de un mapeo manual revisable, conservando las etiquetas originales. No se presentan como metadatos originales del dataset.
- La licencia permanece sin confirmar en los artefactos inspeccionados. No se publican fotografías de referencia hasta verificar sus derechos de reutilización.

## Modelo y métricas verificadas

El usuario ejecutó el cuaderno de Google Colab y entregó el ZIP resultante. Los pesos fueron importados, cargados y contrastados con las clases y la matriz de confusión. **No hace falta entrenar otra vez para poner en funcionamiento este modelo.**

| Parámetro | Valor |
|---|---|
| Arquitectura | YOLO11n-cls, transferencia desde pesos preentrenados |
| Entrada | 224 × 224 píxeles |
| Configuración | 15 épocas máximas, patience 4, batch 32, GPU |
| Tiempo registrado | 665,38 segundos, aproximadamente 11 minutos |
| Mejor época registrada | 11 |
| Pesos activos locales | `ai-service/artifacts/models/best.pt` |
| SHA-256 | `b9bd44e58650ec5fab95705b5f4c1aa5f4b5a86008ffc60926dfea2dd481d7b2` |

Evaluación posterior al entrenamiento, sobre las **250 imágenes de test**:

| Métrica | Resultado |
|---|---|
| Accuracy Top-1 | 96,4 % |
| Accuracy Top-5 | 100 % |
| Precisión macro | 96,93 % |
| Recall macro | 96,4 % |
| F1 macro | 96,37 % |

El Top-5 de 100 % significa que la etiqueta correcta estuvo entre cinco alternativas para este conjunto de prueba; no garantiza una identificación perfecta de fotografías nuevas.

Los umbrales se comprobaron utilizando **validación**, sin ajustar con test: con 0,70 se aceptaron 222/250 imágenes (88,8 % de cobertura) y la precisión entre las aceptadas fue 99,10 %; con 0,90 se aceptaron 201/250 (80,4 %) y la precisión fue 99,50 %. Ambos valores son configurables. Una confianza baja se muestra como resultado no concluyente, y una probabilidad alta tampoco garantiza que una imagen ajena a las clases conocidas sea una autoparte.

## Funcionalidad y endpoints

La página cliente muestra la fotografía seleccionada, resultado principal, nombre original y traducción disponible, confianza, tres predicciones principales, metadatos reales y un panel secundario de información del análisis. Incluye selección/cambio/eliminación de imagen, drag & drop, estados vacíos y errores controlados. No muestra campos técnicos inventados ni progreso ficticio.

| Función | FastAPI interno | NestJS público, JWT y rol cliente |
|---|---|---|
| Estado y disponibilidad | `GET /health` | `GET /api/part-recognition/health` |
| Clasificar imagen | `POST /predict` | `POST /api/part-recognition/predict` |
| Modelo y métricas | `GET /model/info` | `GET /api/part-recognition/model/info` |
| Clases y metadatos | `GET /classes` | `GET /api/part-recognition/classes` |

La predicción recibe multipart con campo `file`. JPG/JPEG, PNG y WebP se validan por tipo y contenido, con límite de 10 MiB y de píxeles. Los pesos se cargan una vez al iniciar FastAPI; nunca se entrena al iniciar NestJS ni Python. Si faltan pesos válidos, la API devuelve un error controlado, sin simular resultados.

## Estado real de la nube y causa del bloqueo

| Servicio | Resultado de la auditoría |
|---|---|
| Vercel | Web publicada READY: https://frontend-vert-five-39.vercel.app; contiene el módulo y apunta a la API de Render |
| Supabase | Conexión activa y cuenta cliente real creada; login comprobado. No se alteraron usuarios anteriores |
| Render NestJS | API activa: https://inventarioautopartesi.onrender.com/api; API y login cliente responden 200; reconocimiento responde 503 `service_unavailable` |
| Python en nube | No se encontró un servicio Python desplegado en la auditoría; conexión pendiente |

El mensaje «El servicio de reconocimiento está desconectado» corresponde a ese **503**. Render tenía un servicio Node, sin el Python que ejecuta los pesos, y no tenía configuradas `AUTOPARTS_AI_URL` ni `AUTOPARTS_AI_API_KEY`. Un modelo local no queda disponible para Render por publicar React o actualizar NestJS: `127.0.0.1:8001` señala al propio servidor de Render.

Se está preparando un servicio Python separado, carga de artefactos mediante descarga privada verificada por hash, protección con API key y adaptación de los tiempos de espera al arranque en frío. **Todavía no se confirma la subida de artefactos, el despliegue Python ni una predicción de producción satisfactoria.** No se publican tokens, contraseñas, claves ni enlaces firmados en este documento.

## Base de datos y compatibilidad

La tabla real utiliza `users.rol` como varchar, sin CHECK que limite los roles. Por ello no fue necesario ampliar un enum ni crear una estructura paralela de roles. El SQL preparado en `backend/sql/cliente-role.sql` documenta el procedimiento compatible e idempotente; no asigna automáticamente roles a usuarios existentes.

La cuenta de prueba tiene rol cliente y su login fue verificado; sus credenciales se mantienen fuera de la documentación. No se cambiaron políticas RLS ni se ejecutaron migraciones destructivas. Los controllers existentes mantienen restricciones para sus roles anteriores y bloquean acceso administrativo del cliente.

## Pruebas ejecutadas

| Verificación | Resultado registrado |
|---|---|
| Python pytest | 29 pruebas aprobadas y 4 subtests |
| Python pip check / compileall | Aprobados |
| Backend lint / build | Aprobados; 8 advertencias previas de `any` |
| Backend unitarios | 67 aprobados |
| Backend HTTP/JWT aislados | 48 aprobados |
| Frontend lint / build | Aprobados; advertencia de tamaño del bundle |
| Navegador escritorio y móvil | 9 comprobaciones aprobadas, 1440px y 390px |
| Flujo local React → NestJS → Python | Predicción real AIR COMPRESSOR, confianza 0,998932, top 3 y metadatos válidos |

Las pruebas de estados de error y baja confianza utilizan fixtures explícitos; la inferencia local documentada utiliza los pesos reales. No se ejecutaron las suites antiguas que exigen BD/usuarios específicos de prueba ni pruebas de pantallas móviles. La verificación local no sustituye la prueba pendiente de producción.

## Archivos y organización

- `ai-service/autoparts_ai/`: configuración, dataset, entrenamiento, evaluación, inferencia, esquemas y API.
- `ai-service/scripts/`: descarga, preparación, entrenamiento, evaluación, predicción, importación y comprobaciones.
- `ai-service/config/`: parámetros y traducciones revisables; cuaderno Colab y pruebas dentro del servicio.
- `ai-service/artifacts/models/`: pesos y manifiestos activos; artefactos y dataset excluidos de Git.
- `backend/src/part-recognition/`: controller, service, DTOs y pruebas del proxy protegido.
- `backend/sql/cliente-role.sql`: procedimiento SQL preparado para el rol.
- `frontend/src/pages/recognition/RecognitionPage.tsx`, `services/recognition.service.ts`, `types/recognition.types.ts` y `styles/recognition.css`: experiencia web.
- Integración mínima en registro de módulo, roles, rutas, navegación y administración de usuarios; controles de acceso de controllers existentes; documentación y `.gitignore`.

Se conservaron las dependencias npm existentes. Python utiliza FastAPI, Uvicorn, Pydantic Settings, multipart, Ultralytics, PyTorch/torchvision, KaggleHub, Pillow y scikit-learn; pytest/httpx para pruebas, truststore para instalación y Playwright opcional para QA. Las versiones verificadas están en `ai-service/requirements-lock.txt`.

## Cómo iniciar el modelo localmente

Desde la raíz del proyecto, abrir tres terminales PowerShell separadas. Los pesos ya están importados.

```powershell
cd ai-service
.\.venv\Scripts\python.exe -m uvicorn autoparts_ai.api:app --host 127.0.0.1 --port 8001 --workers 1 --limit-concurrency 8
```

```powershell
cd backend
$env:DB_SYNC = 'false'
npm run start:dev
```

```powershell
cd frontend
npm run dev
```

Para este flujo, configurar el backend con `AUTOPARTS_AI_URL=http://127.0.0.1:8001` y la web con `VITE_API_URL=http://localhost:3000/api`. Usar un solo worker Python para evitar duplicar el modelo en memoria.

Ejemplo de inferencia directa desde `ai-service`, sin NestJS:

```powershell
.\.venv\Scripts\python.exe scripts/predict.py 'C:\ruta\foto-repuesto.jpg'
```

Las imágenes de test están en `ai-service/artifacts/kaggle-cache/datasets/gpiosenka/car-parts-40-classes/versions/3/car parts 50/test`, organizadas por clase. Después de una prueba con test, utilizar también fotografías propias para observar la generalización.

## Pendientes para cerrar el plan

1. Completar el alojamiento privado de pesos y metadatos, verificando SHA-256. No subir el dataset a Git.
2. Publicar el código de arranque Python y desplegar el servicio independiente; comprobar instalación CPU, memoria disponible, carga del modelo y salud. La automatización está en preparación por el agente.
3. Configurar URL y secreto del Python remoto en NestJS y tiempos de espera compatibles con arranque en frío. Se preparan 120 segundos para el proxy y 125 para la web; hasta desplegar y probar no se consideran efectivos en producción.
4. Verificar salud, clases y métricas desde Render, y realizar una predicción autenticada con pesos reales. Comprobar denegación de acceso sin JWT o sin rol cliente.
5. Repetir la prueba manual desde Vercel con una imagen de test y una fotografía propia; confirmar resultados, alternativas y errores controlados.
6. Actualizar este estado y `ai-service/VERIFICATION.md` con evidencia del despliegue y la inferencia de producción. Si límites del alojamiento impiden operar, documentarlos y elegir un entorno que soporte la inferencia; no simular éxito.

El usuario podrá realizar la prueba manual cuando se haya confirmado la conexión remota. Los pendientes de nube no requieren un nuevo entrenamiento ni cambios destructivos en Supabase.

## Referencias del proyecto

- [Guía de instalación, entrenamiento e integración](ai-service/README.md).
- [Resultados de verificaciones](ai-service/VERIFICATION.md).
- [Índice técnico](docs/README.md), [API](docs/api.md) y [variables de entorno](docs/entornos.md).

Este módulo tiene su propio plan; no cambia retrospectivamente el alcance del Hito 3 de asistencia facial y códigos de barras.
