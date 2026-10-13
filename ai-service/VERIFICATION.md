# Estado comprobado del módulo

Verificado el 13/10/2026. El modelo entrenado por el usuario en Colab fue recibido, validado e importado; no hay predicciones simuladas en la aplicación.

## Modelo

- YOLO11n-cls, clasificación, 224×224, 50 clases.
- Dataset Kaggle `gpiosenka/car-parts-40-classes`, versión 3, variante `car parts 50`.
- Train 8.739 imágenes, validación 250, test 250. Sin duplicados entre particiones detectados por SHA-256.
- Configuración Colab: 15 épocas, patience 4, batch 32, GPU; duración 665,38 segundos; mejor checkpoint época 11.
- Test: Top-1 96,4%; Top-5 100%; precisión macro 96,93%; recall macro 96,4%; F1 macro 96,37%.
- SHA-256: `b9bd44e58650ec5fab95705b5f4c1aa5f4b5a86008ffc60926dfea2dd481d7b2`.
- Hash, clases y métricas macro/Top-1 contrastados con la matriz de confusión del ZIP.
- Pesos activos: `artifacts/models/best.pt`; manifiesto y métricas conservados en esa misma carpeta, ignorada por Git. Originales entregados preservados.
- Validación de umbrales sobre val: 0,70 acepta 222/250, precisión entre aceptadas 99,10%; 0,90 acepta 201/250, precisión 99,50%. No se ajustó el modelo con test. Estas mediciones no garantizan resultados fuera del dataset.

## Verificaciones

| Verificación | Resultado |
|---|---|
| Python pytest | 29 pruebas aprobadas, 4 subtests; una advertencia de deprecación de Starlette/httpx |
| Python pip check y compileall | Aprobados |
| Backend lint/build | Aprobados; 8 advertencias anteriores de `any` |
| Backend unitarios | 67 aprobados |
| Backend e2e aislados HTTP/JWT | 48 aprobados, sin BD ni inferencia simulada en producción |
| Frontend lint/build | Aprobados; advertencia de bundle grande |
| Navegador Edge/Playwright | 9 comprobaciones aprobadas, escritorio 1440px y móvil 390px |
| NestJS → FastAPI → pesos reales | Aprobado: AIR COMPRESSOR, confianza 0,998932, top 3 y metadatos válidos |
| React → NestJS → FastAPI → pesos reales | Aprobado en escritorio y móvil; autenticación efímera de integración, sin BD |
| Supabase real | Conexión y creación exclusiva de cuenta cliente verificadas por UsersService/AuthService y bcrypt |
| Render real | `/api` responde 200; login cliente responde 200; reconocimiento responde 503 `service_unavailable` |
| Vercel real | Nueva web publicada READY; `/reconocimiento` y JS responden 200, bundle incluye módulo y API de Render |

La prueba de navegador real reconstruye el multipart de la misma imagen seleccionada en el interceptor de Playwright, porque Chromium no expone los bytes del archivo en `post_data_buffer`. Envía la imagen a NestJS, que ejecuta la inferencia real en Python. No sustituye la predicción. Las pruebas de estados de error y confianza baja usan fixtures explícitas separados. No se ejecutaron las suites antiguas que requieren usuarios/BD de prueba ni las pantallas móviles.

## Nube

Web publicada: https://frontend-vert-five-39.vercel.app . API: https://inventarioautopartesi.onrender.com/api . La cuenta nueva tiene rol cliente, activa y sin tienda; no se modificaron cuentas anteriores. La tabla real tiene `rol varchar` sin CHECK de rol, por lo que no requirió extender un enum ni insertar una tabla de roles.

**Pendiente para reconocimiento en la nube:** alojar el servicio Python con los pesos importados y configurar en Render `AUTOPARTS_AI_URL` con su dirección accesible. `127.0.0.1:8001` solo conecta procesos del mismo servidor; el Python local no es accesible desde Render mediante esa dirección. La actualización de Render corresponde al usuario. No se aplicaron cambios de RLS, privilegios ni migraciones destructivas.

## Archivos y dependencias

- Nuevos: `ai-service/autoparts_ai/`, scripts independientes descarga/preparación/entrenamiento/evaluación/inferencia/importación/umbrales/verificación web, configuraciones y traducciones, notebook Colab, dependencias, README, pruebas Python y navegador.
- Nuevos backend: `src/part-recognition/`, `sql/cliente-role.sql`, e2e aislado y scripts de puente/provisión cliente.
- Nuevos frontend: página `RecognitionPage`, servicio, tipos y CSS de reconocimiento.
- Existentes modificados: registro de módulo y roles backend, restricciones de lectura en diez controllers; roles/rutas/sidebar/navbar y formulario administrativo web; schema de referencia, `.gitignore`, AGENTS/README y documentación técnica. Sin cambios móviles ni eliminación de archivos existentes.
- Dependencias npm existentes conservadas. Python instalado en `.venv`: FastAPI, Uvicorn, Pydantic Settings, multipart, Ultralytics, PyTorch/torchvision, KaggleHub, Pillow, scikit-learn, truststore, pytest/httpx. Versiones en `requirements-lock.txt`; Playwright opcional para QA en `requirements-ui-test.txt`.

## Ejecutar localmente

Desde la raíz, en tres terminales separadas:

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

Para web local configurar `VITE_API_URL=http://localhost:3000/api`; producción usa Render. Endpoint multipart `POST /api/part-recognition/predict`, campo `file`; diagnósticos `GET /health`, `/model/info`, `/classes` bajo `/api/part-recognition`, todos protegidos por JWT y rol cliente. La API Python equivalente es interna.

No es necesario entrenar de nuevo. Comandos completos, configuración y procedimiento de importación: [README](README.md).
