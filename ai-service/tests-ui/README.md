# Verificación de la interfaz web

Estas pruebas opcionales usan Playwright con Microsoft Edge instalado. No agregan dependencias al frontend ni requieren usuarios reales o conexión a PostgreSQL.

Desde `ai-service/`:

```powershell
.venv/Scripts/python.exe -m pip install -r requirements-ui-test.txt
```

Iniciar la web en otra terminal desde `frontend/`:

```powershell
npm run dev -- --host 127.0.0.1 --port 5178 --strictPort
```

Ejecutar desde `ai-service/`:

```powershell
.venv/Scripts/python.exe tests-ui/test_recognition_browser.py
```

`UI_TEST_URL` permite cambiar la URL de Vite. La prueba controla exclusivamente respuestas HTTP mediante fixtures explícitas: autenticación cliente, selección/cambio/eliminación, validación de formato y tamaño, procesamiento sin solicitudes duplicadas, confianza baja, tres clases, errores de disponibilidad/timeout/capacidad/red y aislamiento de rutas entre cliente y administrador. Verifica escritorio 1440×1000 y móvil 390×844, incluido el botón de salida visible. Las fixtures jamás se incorporan al servicio ni producen predicciones para usuarios.

Las capturas y el reporte se guardan en `artifacts/ui/`, excluido de Git.

## Inferencia real desde la interfaz

El modo siguiente necesita FastAPI con pesos disponibles y un puente Nest de integración previamente iniciado. El puente genera `artifacts/live-ui-session.json` con `url` (incluye `/api`) y un JWT efímero `token`. Nunca debe guardarse ese archivo en Git ni imprimirse su contenido.

```powershell
.venv/Scripts/python.exe tests-ui/test_recognition_browser.py --live
```

Este modo selecciona la primera imagen de prueba de `AIR COMPRESSOR`, encontrada desde el manifiesto local `artifacts/dataset.json`. La interfaz recibe una respuesta real del recorrido Nest → FastAPI → YOLO. Comprueba la clase, las 50 clases del modelo, la confianza, los conteos verificables, los metadatos CSV y las tres alternativas en ambos tamaños de pantalla. Guarda `live-report.json` y dos capturas reales.

La autenticación usa una fixture autorizada exclusivamente para la integración; no verifica el login de producción ni usuarios de la BD. Chromium omite los bytes de archivos multipart en la inspección de peticiones: el interceptor reconstruye el multipart con la misma imagen seleccionada y lo envía a Nest. No simula predicciones ni conecta la aplicación directamente con Python. La imagen de prueba conocida verifica integración, no mide generalización del modelo.
