# Modelo predictivo de viabilidad de repuestos

`entrenamiento_exito_autopartes.ipynb` contiene el entrenamiento original para
Colab. `train_predictive_model.py` entrena su Random Forest localmente y
exporta el contrato ONNX que consume NestJS, incluidas las probabilidades por
clase (sin ZipMap).

## Archivos del modelo conectado

| Archivo | Ubicación desde la raíz del proyecto | Contenido |
| :--- | :--- | :--- |
| `modelo_exito_autopartes.onnx` | `backend/models/modelo_exito_autopartes.onnx` | Modelo entrenado que ejecuta NestJS |
| `modelo_exito_autopartes.json` | `backend/models/modelo_exito_autopartes.json` | Metadatos, clases, métricas y versiones del entrenamiento |

Ubicación absoluta en este equipo:

```text
D:\Unifranz 9no semestre\Programacion Avanzada\backend\models\modelo_exito_autopartes.onnx
```

El notebook `.ipynb` es el código de entrenamiento; la API ejecuta el archivo
`.onnx` exportado. Ambos archivos del modelo deben conservarse juntos. Como
`backend/models/` está ignorado por Git, clonar el repositorio no los recupera:
hay que copiarlos del entrenamiento existente o ejecutar la exportación local.

## Entrenamiento y exportación

Conserva los parámetros del clasificador del notebook (100 árboles,
profundidad máxima 5, clases balanceadas, semilla 42). En la exportación local
se omite StandardScaler para las variables numéricas: los árboles no necesitan
escalado y los redondeos de ese operador producían diferencias de probabilidad
entre Python y ONNX. Los valores numéricos y OneHot se procesan en float32.

Desde la raíz del proyecto en PowerShell:

```powershell
python -m venv notebooks/.venv-predictive
notebooks/.venv-predictive/Scripts/python.exe -m pip install -r notebooks/requirements-predictive.txt
notebooks/.venv-predictive/Scripts/python.exe notebooks/train_predictive_model.py
```

La fuente predeterminada es `dataset_entrenamiento.csv`. Se evalúa primero con
una partición estratificada 80/20 y semilla 42. Después, como en el notebook,
se ajusta el modelo final con todos los registros. Las métricas guardadas son
las de la partición de evaluación anterior al ajuste final. El dataset actual
es pequeño: estos resultados son exploratorios, no garantizan precisión futura.

Se generan `backend/models/modelo_exito_autopartes.onnx` y su archivo `.json`
con categorías, orden de clases, métricas, versiones y hash del dataset.
Los pesos y el entorno virtual quedan fuera de Git. El script comprueba que
las clases y probabilidades ONNX coincidan con scikit-learn antes de guardar.

Para verificar inferencia real con la BD configurada, sin modificar registros:

```powershell
cd backend
npm run demand:check
```

La API entrega dos valores distintos: `probabilidadExito` es la probabilidad
del modelo para la clase de alta rotación; `scoreExito` es el índice comercial
ponderado que también considera margen y saturación. Los días y lotes son
estimaciones heurísticas, no salidas de regresión del Random Forest.

## Verificación local del 10/11/2026

Se entrenó y exportó el modelo con los 37 registros de
`dataset_entrenamiento.csv`. La evaluación separada usó 29 registros de
entrenamiento y 8 de prueba, con accuracy de 0,75. El modelo final se ajustó
después con los 37 registros. Esta muestra es pequeña y las probabilidades no
constituyen una garantía de viabilidad comercial.

La diferencia máxima de probabilidad entre scikit-learn y ONNX fue inferior
a `0.000001`. `npm run demand:check` completó 37 inferencias ONNX reales y
rechazó 74 ediciones incoherentes sin métricas. La comprobación HTTP local
completó 37 respuestas `201` con predicciones y 111 rechazos `400` por
ediciones incoherentes, sin resultados numéricos en esos rechazos.

El formulario carga los precios reales de la BD y completa los atributos
técnicos genéricos del catálogo para analizarlos. Una edición incoherente
oculta las cifras y pide corregir los datos. Si falta el modelo, la API
responde `503` y la pantalla muestra un error de servicio, no un error de datos.
Estas verificaciones corresponden al entorno local; no acreditan despliegue en Render.
