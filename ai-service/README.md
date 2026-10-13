# Reconocimiento inteligente de autopartes

Servicio independiente de **clasificación de una fotografía completa**, con YOLO11n-cls. No detecta objetos, no identifica un producto del inventario, no consulta Supabase y no participa en asistencia facial. Flujo: web → NestJS → FastAPI → modelo entrenado.

## Instalación en Windows / PowerShell

Desde la raíz del repositorio (Python 3.11 recomendado; 3.10 compatible):

```powershell
python -m venv ai-service/.venv
cd ai-service
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

No requiere activar el entorno ni cambiar ExecutionPolicy. `.env.example` se entrega localmente y permanece ignorado por la convención del repositorio. Las versiones exactas verificadas se registran en `requirements-lock.txt` al completar la instalación.

## Dataset: descargar, inspeccionar y preparar

```powershell
.\.venv\Scripts\python.exe scripts/download_dataset.py
Get-Content artifacts/dataset.json
.\.venv\Scripts\python.exe scripts/prepare_dataset.py
```

Fuente obligatoria: [gpiosenka/car-parts-40-classes](https://www.kaggle.com/datasets/gpiosenka/car-parts-40-classes). KaggleHub reutiliza su caché; nuestro manifiesto reutiliza una descarga existente. En una primera descarga se necesita red y, si Kaggle lo solicita, autenticar KaggleHub según sus instrucciones. Nunca guardar tokens en Git.

El número de clases se obtiene de las carpetas reales, nunca de la URL. `artifacts/dataset.json` conserva las clases originales ordenadas, conteos por partición, CSV originales, documentación disponible, versión observable y duplicados por contenido entre particiones. Licencia ausente = desconocida. No se publican imágenes de referencia sin comprobar derechos de reutilización. CSV de etiquetas no se interpreta como ficha técnica del repuesto.

`config/translations.json` es un mapa revisable `"etiqueta original": "Traducción española"`; se conserva siempre la etiqueta original y se marca la traducción como manual, externa al dataset. Las descripciones, compatibilidades, precios y existencias no se inventan.

## Entrenamiento y evaluación

```powershell
.\.venv\Scripts\python.exe scripts/train.py --config config/train.json
.\.venv\Scripts\python.exe scripts/evaluate.py --device cpu
Get-Item artifacts/models/best.pt
Get-Content artifacts/models/model-info.json
Get-Content artifacts/models/metrics.json
```

La configuración inicial usa `yolo11n-cls.pt` preentrenado, 224×224, 15 épocas y early stopping (patience 4). `device: "auto"` elige CUDA si PyTorch la tiene disponible, CPU en otro caso. `workers: 0` evita problemas de procesos en Windows. `batch: 16` es conservador; reducirlo a 8/4 si falta memoria. En GPU se puede usar `batch: -1` para autoajuste Ultralytics; en CPU se convierte a 16. Para usar CUDA instale el build PyTorch compatible siguiendo [PyTorch](https://pytorch.org/get-started/locally/) en este entorno; no hace falta cambiar el sistema web.

Se preservan las particiones originales; entrenamiento usa un directorio con **solo train y val**, nunca test. Si falta validación, el script falla en lugar de reutilizar test. La evaluación posterior usa exclusivamente test e incluye Top-1, Top-5, precisión/recall/F1 macro, métricas por clase y matriz de confusión JSON. Registra además parámetros, duración, época mejor, métricas de validación y SHA256 de pesos. Duplicados originales entre splits se reportan como limitación de independencia del holdout.

Una ejecución larga puede iniciarse desde otra terminal con el mismo comando de entrenamiento. No considerar finalizado el proceso hasta comprobar código de salida 0, `best.pt`, `model-info.json` y, después de evaluar, `metrics.json`. No se ejecuta entrenamiento al iniciar API/NestJS.

## Inferencia y API interna

### Importar un entrenamiento de Colab

Desde `ai-service`, con los archivos del ZIP extraídos en la raíz del repositorio:

```powershell
.\.venv\Scripts\python.exe scripts/import_model.py --source-dir ..
```

El importador comprueba SHA-256, clases, métricas y matriz de confusión, y carga el checkpoint antes de copiarlo a `artifacts/models/`. No reemplaza automáticamente otro modelo distinto ya activo. Los archivos originales entregados se conservan y se ignoran en Git. No es necesario descargar el dataset para usar un modelo importado; sus clases y metadatos están dentro de `model-info.json`.

Los pesos entregados desde Colab ya fueron importados y comprobados. Ver [VERIFICATION.md](VERIFICATION.md) para las métricas y las pruebas reales de esta instalación. Los comandos de entrenamiento anteriores se mantienen para futuros modelos, pero **no es necesario entrenar otra vez** para iniciar el servicio.

```powershell
.\.venv\Scripts\python.exe scripts/predict.py 'C:\ruta\foto-repuesto.jpg'
.\.venv\Scripts\python.exe -m uvicorn autoparts_ai.api:app --host 127.0.0.1 --port 8001 --workers 1 --limit-concurrency 8 --timeout-keep-alive 5
```

Rutas internas: `GET /health`, `POST /predict` (multipart `file`), `GET /model/info`, `GET /classes`. La API carga los pesos una vez; verifica SHA256 y correspondencia exacta de clases. Sin pesos válidos, health indica `model_unavailable` y predict/model info responden 503. No hay predicciones de demostración. Utilizar un solo worker para no duplicar el modelo en RAM.

Variables `.env` Python (prefijo `AUTOPARTS_`):

| Variable | Default |
|---|---|
| `WEIGHTS` | ruta absoluta `artifacts/models/best.pt` |
| `MODEL_INFO` | ruta absoluta `artifacts/models/model-info.json` |
| `DATASET_METADATA` | ruta absoluta `artifacts/dataset.json` |
| `API_KEY` | vacío, acceso local |
| `CONFIDENCE_THRESHOLD` | 0.70, provisional |
| `HIGH_CONFIDENCE_THRESHOLD` | 0.90, provisional |
| `MAX_IMAGE_BYTES` | 10485760 (10 MiB) |
| `MAX_IMAGE_PIXELS` | 20000000 |
| `INFERENCE_TIMEOUT_SECONDS` | 25 |
| `TORCH_THREADS` | 2 |
| `DEVICE` | auto |

Los umbrales son configurables; para este checkpoint se comprobaron 0.70 y 0.90 con 250 imágenes de validación, sin ajustar con test. Los valores iniciales de cualquier entrenamiento nuevo deben revisarse con su propia validación. Una probabilidad softmax alta no garantiza que una foto ajena al dataset sea una autoparte. Baja confianza se comunica como identificación no concluyente. No se afirma seguridad del 100%.

Para conexión remota usar red privada y el mismo secreto `AUTOPARTS_API_KEY`/`AUTOPARTS_AI_API_KEY`; no publicar Python en Internet ni incluir estos secretos en React. API key usa `X-API-Key`. JPG, PNG y WebP estáticos se verifican por contenido, MIME, bytes y píxeles, con EXIF corregido. El timeout mantiene ocupado el único worker hasta que termina la inferencia nativa, evitando una cola ilimitada.

## Conectar NestJS y web

En `backend/.env` (no versionar):

```dotenv
AUTOPARTS_AI_URL=http://127.0.0.1:8001
AUTOPARTS_AI_TIMEOUT_MS=30000
AUTOPARTS_AI_MAX_CONCURRENT=2
AUTOPARTS_AI_MAX_IMAGE_BYTES=10485760
AUTOPARTS_AI_MAX_IMAGE_PIXELS=20000000
# AUTOPARTS_AI_API_KEY=el-mismo-secreto-del-servicio-python
```

Desde terminales independientes en la raíz:

```powershell
cd backend
npm run start:dev
```

```powershell
cd frontend
npm run dev
```

React usa su `VITE_API_URL` existente y llama únicamente a NestJS: `POST /api/part-recognition/predict`, `GET /api/part-recognition/health`, `/model/info` y `/classes`. No se mezclan resultados con el catálogo.

## Rol cliente y comprobación real

La tabla de identidad existente es `users`, con `rol varchar`; `clientes` contiene datos de facturación y **no** es una tabla de cuentas. El script `backend/sql/cliente-role.sql` es idempotente y verifica el esquema compatible; no cambia usuarios existentes, no crea enums ni otra estructura de roles. Antes de ejecutarlo desde el SQL Editor de Supabase revisar su contenido y hacer la verificación sobre la BD objetivo. No se ha aplicado automáticamente.

Crear una cuenta desde el endpoint existente `POST /api/users` **con JWT de administrador** y `rol: "cliente"`, nombre, email único y contraseña propia segura. Si se cambia el rol de una cuenta autorizada usar `PATCH /api/users/:id` con JWT admin; tokens emitidos antes del cambio mantienen sus claims hasta expirar, por lo que volver a iniciar sesión. No hay autorregistro ni aceptación de roles sin autorización. Las políticas RLS reales de Supabase deben inspeccionarse en el entorno: el repositorio no demuestra su configuración desplegada y este módulo no concede acceso directo de usuarios a la BD.

Iniciar sesión con esa cuenta en la web, entrar en `/reconocimiento`, seleccionar una fotografía real de una clase disponible e identificar. Debe observarse principal + top3, confianza, estado concluyente, conteos y metadatos reales. Una cuenta cliente debe recibir 403 al intentar acceder a inventario/ventas/personal mediante API.

## Verificaciones

```powershell
# ai-service
.\.venv\Scripts\python.exe -m pytest tests -q
.\.venv\Scripts\python.exe -m pip check
# backend (otra terminal)
npm run lint
npm run build
npm test -- --runInBand
# frontend (otra terminal)
npm run lint
npm run build
```

Las pruebas Python utilizan fixtures y dobles explícitos, nunca presentados como resultados reales. La validación final de pesos, métricas y foto real es adicional a estas pruebas. Consultar `VERIFICATION.md` para el estado observado de esta instalación.

Referencias: [clasificación Ultralytics](https://docs.ultralytics.com/tasks/classify/), [YOLO11](https://docs.ultralytics.com/models/yolo11/), [KaggleHub](https://github.com/Kaggle/kagglehub). Ultralytics tiene sus propias condiciones de licencia; revisar las aplicables al despliegue previsto.

## Entrenamiento en Google Colab

Abrir [`notebooks/train_autoparts_colab.ipynb`](notebooks/train_autoparts_colab.ipynb) en [Google Colab](https://colab.research.google.com/) mediante **Archivo → Subir notebook**. Es autocontenido: no necesita subir scripts ni el repositorio. Seleccionar **Entorno de ejecución → Cambiar tipo de entorno de ejecución → GPU** y ejecutar las celdas en orden.

El notebook comprueba CUDA, conserva PyTorch/torchvision de Colab mediante restricciones de versiones e instala únicamente dependencias de entrenamiento. Descarga e inspecciona el dataset real, entrena YOLO11n-cls con 15 épocas y 224×224 inicialmente, usa validación para escoger `best.pt` y evalúa test después. Se pueden cambiar parámetros antes de entrenar. Si el batch automático agota memoria, elegir 16, 8 o 4. La prueba con foto propia y la copia a Drive son opcionales; Drive no se monta automáticamente. NestJS y FastAPI se ejecutan en el entorno del sistema, no en Colab.

Al finalizar descarga `autoparts-colab-artifacts.zip`: `best.pt`, `model-info.json`, `metrics.json`, `dataset-summary.json`, `translations.json`, `train-config.json` y `environment.txt`. La exportación comprueba SHA-256 de pesos y métricas test consistentes. No contiene dataset, imágenes, cachés ni credenciales. Guardar y compartir ese ZIP para importar los artefactos al servicio; no afirmar entrenamiento completado hasta recibirlo y verificarlo.

Para actualizar el notebook tras cambios en los módulos Python:

```powershell
.\.venv\Scripts\python.exe notebooks/build_notebook.py
```

Todas sus celdas se entregan sin ejecutar y sin resultados precargados. No se ha entrenado en Colab desde este entorno.

## Revisar umbrales mediante validación

Con los pesos importados y el dataset local disponible:

```powershell
.\.venv\Scripts\python.exe scripts/check_thresholds.py
```

El script usa exclusivamente las imágenes de **validación**, CPU y dos hilos; no entrena ni modifica pesos, métricas test o variables de entorno. Guarda `artifacts/models/validation-thresholds.json` con SHA-256, cobertura, precisión empírica entre predicciones aceptadas e intervalos Wilson 95% para umbrales de 0,50 a 0,95. Recomienda el menor umbral desde 0,70 con precisión empírica ≥0,97 y al menos 50 imágenes aceptadas. Estos criterios son revisables mediante `--target-precision` y `--minimum-accepted`.

La recomendación utiliza una muestra del mismo dataset y no acredita comportamiento sobre imágenes fuera de distribución. La precisión observada no calibra las probabilidades del modelo ni garantiza precisión futura. Aplicar un cambio de umbral requiere revisar los resultados y configurar el entorno explícitamente.
