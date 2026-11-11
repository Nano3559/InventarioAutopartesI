# Configuración del modelo de predicción de viabilidad comercial

Este documento describe el modelo que analiza la **rotación y viabilidad comercial de un repuesto** en AutoParts Pro: un `RandomForestClassifier` entrenado con scikit-learn y exportado a ONNX para ejecutarse dentro de NestJS. La configuración se contrastó con el código y los metadatos locales disponibles el **10 de noviembre de 2026**.

El reconocimiento de autopartes por fotografía usa otro modelo, YOLO11n-cls, documentado en [ai-service](../ai-service/README.md). El reconocimiento facial usa ArcFace. Los parámetros de esos modelos son independientes de los descritos aquí.

## 1. Objetivo y funcionamiento

El clasificador recibe características financieras y comerciales de un repuesto y estima una de tres clases de rotación. El backend combina esa clasificación con reglas de margen y saturación del catálogo para entregar el análisis comercial.

```text
dataset_entrenamiento.csv
    → validación y preparación de variables
    → evaluación Random Forest con partición 80/20
    → ajuste final con todos los registros
    → exportación del pipeline a ONNX
    → DemandPredictionService en NestJS
    → probabilidad de alta rotación + reglas comerciales
    → respuesta al formulario de análisis
```

Es un modelo de aprendizaje supervisado sobre datos tabulares. No utiliza un modelo de lenguaje ni requiere prompts, temperatura, tokens o una API externa de IA. Tampoco se vuelve a entrenar al recibir una consulta.

## 2. Archivos y responsabilidades

| Archivo | Función |
| :--- | :--- |
| [dataset_entrenamiento.csv](../dataset_entrenamiento.csv) | Datos tabulares y etiquetas de entrenamiento |
| [Notebook original](../notebooks/entrenamiento_exito_autopartes.ipynb) | Desarrollo del entrenamiento original para Colab |
| [train_predictive_model.py](../notebooks/train_predictive_model.py) | Entrenamiento local, evaluación, exportación y comprobación Python/ONNX |
| [requirements-predictive.txt](../notebooks/requirements-predictive.txt) | Versiones de las dependencias Python |
| `backend/models/modelo_exito_autopartes.onnx` | Pipeline entrenado que consume NestJS |
| `backend/models/modelo_exito_autopartes.json` | Parámetros, categorías, clases, métricas, versiones y hash del dataset |
| [demand-prediction.service.ts](../backend/src/products/demand-prediction.service.ts) | Carga ONNX, prepara tensores, ejecuta inferencia y arma la respuesta |
| [product-guardrails.ts](../backend/src/products/product-guardrails.ts) | Coherencia de datos, validación financiera e índice comercial |
| [predict-success.dto.ts](../backend/src/products/dto/predict-success.dto.ts) | Validación de entradas de la API |

Los artefactos de `backend/models/` están ignorados por Git. Un clon nuevo necesita recibir el ONNX y su JSON o generarlos mediante el script de entrenamiento.

## 3. Dataset y variable objetivo

La fuente predeterminada es `dataset_entrenamiento.csv`, ubicado en la raíz. El snapshot local contiene **37 registros**, distribuidos así:

| Clase | Significado | Registros |
| :--- | :--- | ---: |
| `0` | Baja rotación / riesgo | 12 |
| `1` | Rotación media | 12 |
| `2` | Alta rotación | 13 |

La variable objetivo es `clase_exito`. El script utiliza las etiquetas ya presentes en el CSV: no las calcula a partir de las ventas durante el entrenamiento. El archivo también conserva `etiqueta_exito` y columnas históricas como ventas netas, devoluciones, demanda diaria y días de rotación, pero estas **no se incluyen como entradas del clasificador**.

El script comprueba que existan las siete variables de entrada y la etiqueta, que no tengan datos vacíos, que las variables numéricas sean finitas, que costo y precio sean positivos y que estén presentes las clases `{0, 1, 2}`. Estas comprobaciones no sustituyen la revisión de la procedencia y calidad de las etiquetas.

El SHA-256 de dataset registrado por el entrenamiento local es:

```text
938d039f1c8e42dcb4cb27be927a087fb69ef48d859754ee4d720ae1d59824e7
```

## 4. Variables de entrada

| Entrada ONNX | Tipo | Preparación en el backend |
| :--- | :--- | :--- |
| `costo` | `float32` | Costo unitario recibido |
| `precio1` | `float32` | Precio de mostrador recibido |
| `margen_relativo` | `float32` | `(precio1 - costo) / costo`, redondeado a cuatro decimales por la validación financiera |
| `ratio_precio_mayor` | `float32` | `precioMayor / precio1`; si no hay precio mayorista, usa `0.85` |
| `categoria_repuesto` | `string` | Categoría resultante de la validación semántica |
| `tipo_desgaste` | `string` | Tipo resultante de la validación semántica |
| `segmento_parque` | `string` | Segmento resultante de la validación semántica |

El margen se calcula **sobre el costo**, no sobre el precio de venta. Por ejemplo, costo 100 y precio 135 producen `margen_relativo = 0.35`, equivalente al 35% sobre el costo.

El modelo local aprendió estos dominios:

| Variable | Valores presentes en el entrenamiento |
| :--- | :--- |
| Categoría | `Carrocería`, `Cerrajería`, `Iluminación`, `Refrigeración` |
| Desgaste | `colision`, `correctivo`, `desgaste_frecuente`, `desgaste_medio` |
| Segmento | `Alto`, `Medio`, `Nicho` |

Nombre, marca, modelo del vehículo, fabricante, año, identificador y ubicación pueden intervenir en validaciones o consultas complementarias. No se envían como variables adicionales al bosque. En particular, `locationId` no filtra las consultas de similares y saturación de `predictSuccess`.

## 5. Preprocesamiento

El pipeline contiene un `ColumnTransformer` seguido del clasificador:

1. Las cuatro variables numéricas se convierten a `float32` y pasan sin escalar.
2. Las tres variables categóricas se transforman con `OneHotEncoder(handle_unknown='ignore', sparse_output=False, dtype=np.float32)`.
3. El bosque recibe las columnas numéricas y la representación OneHot concatenadas.

Con los dominios del ajuste final, la transformación produce 15 columnas: cuatro numéricas y once indicadores categóricos. Una categoría desconocida genera ceros en el bloque correspondiente; el backend además incorpora una advertencia si un valor usado no pertenece a los dominios del JSON.

La exportación local omite el `StandardScaler` del notebook original. Los árboles no requieren escalado y esta decisión evita diferencias por redondeo entre los umbrales de scikit-learn y ONNX. Para reproducir el artefacto conectado se debe usar el script local y no asumir que cualquier exportación del notebook tiene el mismo contrato.

## 6. Hiperparámetros del Random Forest

El entrenamiento establece explícitamente estos cuatro parámetros:

```python
RandomForestClassifier(
    n_estimators=100,
    max_depth=5,
    class_weight='balanced',
    random_state=42,
)
```

| Parámetro efectivo | Valor | Efecto |
| :--- | :--- | :--- |
| `n_estimators` | `100` | Cantidad de árboles |
| `max_depth` | `5` | Limita la profundidad para controlar complejidad |
| `class_weight` | `balanced` | Ajusta el peso de cada clase según su frecuencia en los datos del ajuste |
| `random_state` | `42` | Semilla del bosque |
| `criterion` | `gini` | Criterio para elegir divisiones |
| `max_features` | `sqrt` | Selección aleatoria de variables candidatas por división |
| `bootstrap` | `true` | Cada árbol usa una muestra con reemplazo |
| `min_samples_split` | `2` | Mínimo de muestras para dividir un nodo |
| `min_samples_leaf` | `1` | Mínimo de muestras por hoja |
| `max_leaf_nodes`, `max_samples` | `null` | Sin límites adicionales de esos parámetros |
| `min_impurity_decrease`, `ccp_alpha` | `0.0` | Sin umbral adicional de mejora ni poda por complejidad |
| `min_weight_fraction_leaf` | `0.0` | Sin mínimo adicional de peso por hoja |
| `n_jobs` | `null` | Paralelismo predeterminado de scikit-learn |
| `oob_score`, `warm_start` | `false` | No calcula evaluación out-of-bag ni reutiliza árboles de ajustes anteriores |
| `monotonic_cst` | `null` | Sin restricciones de monotonía |
| `verbose` | `0` | Sin salida detallada del estimador |

Los valores adicionales son los parámetros efectivos registrados por scikit-learn 1.7.2 en el JSON local. Este modelo no usa épocas, batch size, learning rate ni early stopping. No hay una búsqueda automática de hiperparámetros implementada en el script.

## 7. Entrenamiento, evaluación y ajuste final

Primero se separa una partición estratificada con `train_test_split(test_size=0.20, random_state=42, stratify=y)`. Para los 37 registros actuales, se ajusta con **29** y se evalúa con **8**. Se guardan accuracy, reporte por clase y matriz de confusión.

Después de esa evaluación, el pipeline se ajusta nuevamente con los **37 registros** y se exporta. Por tanto, las métricas guardadas pertenecen al ajuste previo con 29 registros; no son una evaluación independiente posterior del modelo final con 37.

El metadato local registra entrenamiento en `2026-11-10T20:47:38.756751+00:00` y estos resultados:

| Métrica del holdout | Valor |
| :--- | ---: |
| Accuracy | 75% (6 de 8) |
| Precisión macro | 80.56% |
| Recall macro | 77.78% |
| F1 macro | 71.90% |
| Recall de alta rotación | 33.33% (1 de 3) |

Matriz de confusión, con filas reales y columnas predichas en el orden `[0, 1, 2]`:

| Real / Predicha | Baja `0` | Media `1` | Alta `2` |
| :--- | ---: | ---: | ---: |
| Baja `0` | 3 | 0 | 0 |
| Media `1` | 0 | 2 | 0 |
| Alta `2` | 1 | 1 | 1 |

La muestra de evaluación es pequeña y falla en dos de los tres casos de alta rotación. El 75% no debe presentarse como precisión garantizada sobre compras futuras. Estos valores se transcriben del artefacto local; la creación de este documento no implicó volver a entrenar ni ejecutar una nueva evaluación.

## 8. Exportación y contrato ONNX

Se exporta **todo el pipeline**, incluido OneHotEncoder, con `skl2onnx`, `target_opset=12` y `zipmap=False`. Esto entrega probabilidades como tensor, sin mapas ZipMap.

| Elemento | Contrato |
| :--- | :--- |
| Entradas numéricas | Cuatro tensores `float32`, cada uno `[N, 1]` |
| Entradas categóricas | Tres tensores `string`, cada uno `[N, 1]` |
| Entrada de una consulta NestJS | `N = 1` |
| `output_label` | Clase predicha |
| `probabilities` | Probabilidades por clase en orden `[0, 1, 2]` |

El exportador verifica la estructura ONNX y ejecuta el modelo con `CPUExecutionProvider`. Compara las clases y probabilidades de todos los registros contra scikit-learn. Rechaza clases distintas o diferencia máxima superior a `1e-5`. El artefacto local registra una diferencia máxima de **`6.582260132503848e-7`**.

El backend acepta `probabilities` y, por compatibilidad, `output_probability`; usa `class_order` del JSON o `[0, 1, 2]` como alternativa. Comprueba clase válida, tamaño, probabilidades finitas entre 0 y 1 y suma con tolerancia `0.001`. Si el contrato falla, devuelve `503`.

## 9. Uso dentro de NestJS

La sesión se inicializa con `onnxruntime-node` al arrancar el módulo. La ubicación recomendada es `backend/models/modelo_exito_autopartes.onnx`; el cargador también busca ubicaciones históricas en `src/models/` y `notebooks/`. Lee el JSON con el mismo nombre o, por compatibilidad, `modelo_metadata.json`.

No existe una variable de entorno específica para elegir la ruta del modelo en este servicio. La carga depende de las rutas del código y del directorio desde el cual arranca Node. El JSON es importante para conservar dominios y orden de clases, aunque el cargador admite valores predeterminados si falta.

El endpoint es **`POST /api/products/predict-success`**, protegido por JWT y roles `admin`, `tienda` o `inventario`. Recibe datos JSON, no una fotografía. Ejemplo de cuerpo:

```json
{
  "producto": "Farol",
  "marca": "Tyc",
  "modelo": "Corolla",
  "costo": 280,
  "precio1": 390,
  "precioMayor": 330,
  "categoriaRepuesto": "Iluminación",
  "tipoDesgaste": "desgaste_medio",
  "segmentoParque": "Alto"
}
```

Antes de inferir, se valida la coherencia semántica y financiera. Datos incoherentes generan `400` sin resultados numéricos. Si se indica un `productId` inexistente o inactivo, se devuelve `404`. Los precios originales, positivos e intactos de un producto del catálogo tienen una excepción: pueden analizarse incluso si las reglas financieras los consideran bloqueados; la respuesta muestra inviabilidad. Si falta una sesión válida, el servicio reintenta cargarla y devuelve `503` si sigue indisponible.

No se genera una predicción sustitutiva cuando falta el archivo ONNX.

## 10. Probabilidad, score y estimaciones comerciales

`probabilidadExito` es la probabilidad de la **clase 2, alta rotación**, redondeada a cuatro decimales. No es la probabilidad de obtener ganancias ni el porcentaje del score comercial. Las probabilidades de Random Forest proceden de la agregación de sus árboles; el script no implementa calibración adicional.

`scoreExito` combina reglas del backend:

```text
scoreSaturacion = max(0, 100 - cantidadSimilares × 20)
scoreBase = 0.40 × scoreRotacion
          + 0.40 × saludMargen
          + 0.20 × scoreSaturacion
```

Los valores iniciales asociados a cada clase son constantes del servicio:

| Clase | Score de rotación | Días estimados | Lote base | Demanda mensual estimada |
| :--- | ---: | ---: | ---: | ---: |
| Baja `0` | 32 | 110 | 5 | 4 |
| Media `1` | 65 | 55 | 15 | 14 |
| Alta `2` | 88.5 | 32 | 28 | 26 |

La salud del margen usa una función por tramos: llega a 50 con 15% de margen sobre costo, 65 con 20%, 85 con 30% y 100 desde 40%. Entre esos puntos interpola linealmente.

Si hay bloqueo financiero, score y lote sugerido quedan en cero. Un margen inferior al 15% limita el score a 45 y el lote a 3. La saturación reduce el lote con `max(0.2, 1 - cantidadSimilares × 0.15)`, con mínimo de una unidad si no está bloqueado. Se considera saturación cuando hay más de tres productos activos de la categoría y modelo consultados.

El GMROI proyectado se calcula como `margenRelativo × (365 / diasRotacionEstimados)`, redondeado a dos decimales, o cero si está bloqueado. Días, lotes, demanda y GMROI son **estimaciones heurísticas**; el Random Forest no tiene salidas de regresión entrenadas para esas magnitudes.

La respuesta incluye `viabilidad` (`viable`, `riesgo` o `inviable`), alertas, validaciones y hasta tres productos similares. Estos similares se ordenan mediante reglas de coincidencia y margen en el backend; no hay un segundo estimador k-NN entrenado dentro del pipeline exportado.

El endpoint `GET /api/products/:id/demand-summary` pertenece al mismo servicio, pero calcula demanda y agotamiento a partir de stock y ventas de los últimos 30 días mediante reglas. No ejecuta el Random Forest.

## 11. Reproducción y comprobación

Versiones del entrenamiento local, fijadas en `requirements-predictive.txt`:

| Dependencia | Versión |
| :--- | :--- |
| NumPy | 2.2.6 |
| pandas | 2.3.3 |
| scikit-learn | 1.7.2 |
| skl2onnx | 1.20.0 |
| ONNX | 1.23.2 |
| ONNX Runtime Python | 1.23.2 |

Desde la raíz, en PowerShell:

```powershell
python -m venv notebooks/.venv-predictive
notebooks/.venv-predictive/Scripts/python.exe -m pip install -r notebooks/requirements-predictive.txt
notebooks/.venv-predictive/Scripts/python.exe notebooks/train_predictive_model.py
```

Se pueden cambiar las rutas con `--dataset` y `--output-dir`. Para conservar el modelo actual mientras se revisa otro entrenamiento, elegir un directorio de salida distinto: el script escribe los artefactos con el mismo nombre.

Para comprobar la integración real con el backend y la BD configurada:

```powershell
cd backend
npm run demand:check
```

La verificación histórica del 10/11/2026 y sus comprobaciones HTTP están registradas en [notebooks/README.md](../notebooks/README.md). No acreditan que los artefactos estén instalados en Render. El despliegue necesita disponer físicamente del ONNX; instalar dependencias o compilar NestJS no lo genera.

## 12. Límites y mantenimiento

- Los 37 registros y una sola partición de ocho casos permiten una evaluación exploratoria. No hay validación cruzada ni evaluación temporal en el script.
- El modelo usa siete características. No aprende directamente de estacionalidad, variaciones de tienda, series de ventas, nuevas devoluciones o cambios recientes del mercado.
- Los valores fuera de los dominios aprendidos producen advertencias, pero no incorporan conocimiento nuevo al bosque.
- La calidad de `clase_exito` determina lo que aprende. El script no demuestra por sí solo cómo se generaron esas etiquetas ni valida umbrales históricos de negocio.
- La comprobación Python/ONNX valida consistencia de exportación; no mide generalización comercial.
- Cambiar las variables, categorías, preprocesamiento o hiperparámetros requiere reentrenar, exportar y revisar el contrato con el backend.
- Cada versión debe conservar CSV o su trazabilidad, hash, parámetros, partición, métricas y artefactos. Tras sustituir el modelo, reiniciar el backend para cargar la nueva sesión.

## 13. Stack tecnológico del módulo predictivo

El flujo combina entrenamiento en Python, ejecución del modelo dentro del backend y una interfaz web para consultar resultados. El modelo exportado contiene el preprocesamiento y el bosque; Python se utiliza al entrenar o verificar la exportación, mientras NestJS ejecuta el ONNX durante las consultas.

### Entrenamiento y exportación

| Tecnología | Versión registrada | Uso en el módulo |
| :--- | :--- | :--- |
| Python | La versión del intérprete no está fijada en `requirements-predictive.txt` ni guardada en el JSON | Ejecuta el entrenamiento local y las herramientas de exportación |
| pandas | `2.3.3` | Lee el CSV, selecciona columnas y prepara los datos tabulares |
| NumPy | `2.2.6` | Maneja matrices `float32` y compara las probabilidades entre implementaciones |
| scikit-learn | `1.7.2` | Implementa `Pipeline`, `ColumnTransformer`, OneHotEncoder, Random Forest, partición y métricas |
| skl2onnx | `1.20.0` | Convierte el pipeline entrenado a ONNX con probabilidades sin ZipMap |
| ONNX | `1.23.2` | Representa y valida el grafo exportado; se solicita `target_opset=12` |
| ONNX Runtime Python | `1.23.2` | Ejecuta el modelo exportado en CPU para comprobar su equivalencia con scikit-learn |
| Jupyter Notebook / Google Colab | Sin versión fijada para este entorno | Conserva el entrenamiento original; la reproducción del artefacto conectado usa el script local |

Las seis librerías Python tienen versiones exactas en [requirements-predictive.txt](../notebooks/requirements-predictive.txt), también registradas por el artefacto local. La versión de la librería ONNX y el opset son conceptos distintos: el primero identifica el paquete instalado y el segundo el conjunto de operadores solicitado para exportar el grafo.

### Backend, datos e interfaz web

Los valores siguientes son **rangos declarados en los `package.json` del repositorio**, no una afirmación sobre las versiones instaladas o desplegadas. `^` y `~` permiten actualizaciones dentro de sus respectivos rangos; el archivo de bloqueo de cada subproyecto determina la resolución de una instalación reproducible.

| Tecnología | Versión o rango declarado | Responsabilidad |
| :--- | :--- | :--- |
| Node.js | No fijada en `backend/package.json` | Ejecuta la API y el binding nativo de inferencia |
| TypeScript del backend | `^5.7.3` | Define DTO, servicio predictivo y contratos de respuesta |
| NestJS (`@nestjs/common`, `@nestjs/core`) | `^11.0.1` | Expone el endpoint, valida el acceso e inicializa la sesión del modelo |
| `onnxruntime-node` | `^1.30.0` | Carga el `.onnx`, construye tensores y ejecuta inferencia dentro de Node |
| `class-validator` / `class-transformer` | `^0.15.1` / `^0.5.1` | Validan el cuerpo HTTP y convierten valores numéricos del DTO |
| TypeORM / `pg` | `^1.1.0` / `^8.23.0` | Consultan productos, saturación, stock e historial en PostgreSQL |
| PostgreSQL | Versión del servidor no fijada en los manifiestos npm | Almacena los datos comerciales que complementan el análisis; el bosque no reside en la BD |
| React / React DOM | `^19.2.8` | Renderizan el formulario y el resultado del análisis web |
| TypeScript del frontend | `~6.0.2` | Verifica los datos del formulario y el contrato consumido por la interfaz |
| Vite | `^8.2.0` | Compila y sirve la SPA durante desarrollo |

Fuentes: [backend/package.json](../backend/package.json), [frontend/package.json](../frontend/package.json) y [PredictSuccessModal.tsx](../frontend/src/components/inventory/PredictSuccessModal.tsx). El detalle del stack general del sistema está en [stack-tecnologico.md](stack-tecnologico.md).

El intercambio es JSON sobre HTTP con JWT. Para esta predicción no se llama a un servidor Python externo: el archivo ONNX se ejecuta en el proceso de NestJS. La base de datos aporta contexto comercial, pero una nueva venta no modifica automáticamente los árboles ya entrenados.

## 14. Problemas solucionados y evidencia

Esta sección reúne las correcciones de integración documentadas y los comportamientos que el código actual protege. Las evidencias enlazadas permiten revisar la solución; los resultados de ejecución citados corresponden a la verificación local del 10/11/2026, no a nuevas pruebas realizadas al ampliar este documento.

| Problema | Solución implementada | Evidencia y alcance |
| :--- | :--- | :--- |
| Diferencias de probabilidad entre el pipeline Python y ONNX por redondeos del escalado | La exportación local usa numéricas sin StandardScaler y mantiene numéricas y OneHot en `float32`. Compara etiquetas y probabilidades antes de guardar | [Entrenamiento local](../notebooks/train_predictive_model.py) y [registro de verificación](../notebooks/README.md). Diferencia máxima registrada: `6.582260132503848e-7` |
| Contrato de salida incompatible con el consumidor NestJS | Se desactiva ZipMap para obtener un tensor de probabilidades y se normaliza `label` a `output_label` cuando el exportador usa ese nombre | [Exportador](../notebooks/train_predictive_model.py) y [servicio](../backend/src/products/demand-prediction.service.ts). El backend valida clase, longitud, rango y suma de probabilidades |
| Exportaciones existentes en carpetas o con nombres de metadatos anteriores no eran localizables por un único camino | El cargador busca la carpeta recomendada y ubicaciones de compatibilidad; admite el JSON con el nombre del modelo y `modelo_metadata.json` | [Pruebas del cargador](../backend/src/products/demand-prediction.service.spec.ts) para `src/models` y `notebooks`. Esta compatibilidad no instala archivos ausentes en un servidor |
| Confundir un modelo ausente con datos inválidos o continuar mostrando cifras sin una inferencia válida | El backend devuelve `503` cuando no puede cargar el modelo. La interfaz distingue errores de validación y servicio y elimina el resultado anterior | [Servicio y pruebas](../backend/src/products/demand-prediction.service.spec.ts), [formulario](../frontend/src/components/inventory/PredictSuccessModal.tsx). No existe una predicción de reemplazo |
| Obtener resultados para entradas semánticas o financieras incoherentes | Se validan nombre, categoría, desgaste, importes y año antes de inferir; el rechazo `400` no incluye score, lote ni métricas proyectadas | [Guardrails](../backend/src/products/product-guardrails.ts) y [pruebas del servicio](../backend/src/products/demand-prediction.service.spec.ts). El registro local informa 74 ediciones rechazadas en `demand:check` y 111 rechazos HTTP |
| Un identificador válido del catálogo podía tratarse como autorización para aceptar cualquier edición | Se contrastan los datos con el producto activo. La normalización se aplica a metadatos originales intactos; las ediciones incoherentes siguen rechazándose | [Pruebas del servicio](../backend/src/products/demand-prediction.service.spec.ts): cambios de precio y categoría conservando `productId` |
| Valores genéricos heredados del catálogo impedían analizar productos reales | Se normalizan los metadatos técnicos del catálogo mediante reglas compartidas. El formulario carga los precios reales del producto | [Normalización](../backend/src/products/product-guardrails.ts), [formulario](../frontend/src/components/inventory/PredictSuccessModal.tsx) y casos de catálogo legacy en las pruebas del servicio |
| Una pérdida ya registrada y una edición incorrecta recibían el mismo tratamiento | Los precios originales, positivos e intactos del catálogo pueden analizarse para mostrar `inviable`, bloqueo financiero y score/lote cero. Una edición incoherente se rechaza | [Servicio](../backend/src/products/demand-prediction.service.ts) y prueba «distingue una pérdida real registrada de datos editados incorrectamente» en su [spec](../backend/src/products/demand-prediction.service.spec.ts) |
| Confundir el score comercial con una probabilidad aprendida | `probabilidadExito` se toma de la clase de alta rotación; `scoreExito` se calcula aparte con rotación, salud del margen y saturación. La interfaz presenta ambos valores | [Servicio](../backend/src/products/demand-prediction.service.ts), [formulario](../frontend/src/components/inventory/PredictSuccessModal.tsx) y prueba que compara probabilidad con score |
| Dar por verificada la inferencia nativa usando únicamente dobles de Jest | Se dispone de `npm run demand:check`, que ejecuta ONNX real fuera de Jest contra el catálogo y comprueba rechazos sin modificar la BD | [demand-check.ts](../backend/spike/demand-check.ts). El [registro local](../notebooks/README.md) informa 37 inferencias reales; los specs unitarios usan un doble de `onnxruntime-node` |

Estas correcciones resuelven problemas de consistencia y funcionamiento de la integración. El tamaño reducido del dataset, el recall de alta rotación y la ausencia de evaluación temporal siguen siendo límites del modelo descritos en la sección 12. Tampoco se acredita con estas comprobaciones que el modelo esté instalado en Render.

Las fuentes técnicas de este documento son los archivos enlazados y el JSON local del modelo. No se cambió código de entrenamiento, configuración de ejecución ni pesos para redactarlo.
