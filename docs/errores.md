# Errores y correcciones del análisis predictivo de autopartes

Registro del reporte recibido el **10/11/2026 a las 12:37**, las correcciones que se observan en el código y los prompts disponibles. Revisión documental: **11/11/2026**.

## Prompt original disponible

Prompt:

> actualmente el modelo no valida la relacion de los campos, se puede llenar como ejemplo, radiador en categoria de cerrajeria, pero no corresponde a esa categoria, el precio unitario puede ser alto y en precio de venta puede ser bajo y no dice que no es conveniente la venta, no hay control de alertas en los precios. El modelo no ayuda a predecir de una buena forma lo que conviene en temas de ventas y compra de autopartes

El texto que acompaña ese reporte propone tres correcciones: validación semántica de categoría y desgaste, bloqueo financiero y ponderación comercial de rotación/margen/saturación con pesos 40%/40%/20%. Es una **propuesta recibida**, no evidencia de que cada detalle se hubiera implementado ni un prompt adicional del usuario. Su cierre dice:

> ¿Quieres que apliquemos estos *Guardrails Financieros y Semánticos* tanto en el backend (demand-prediction.service.ts) como en el frontend (PredictSuccessModal.tsx) para que la predicción sea 100% confiable, coherente y a prueba de errores lógicos?

La expresión «100% confiable» pertenece a esa propuesta: las reglas actuales no garantizan la exactitud de las predicciones.

## Paso 1. Relación incoherente entre repuesto, categoría y desgaste

**Error reportado:** era posible indicar `Radiador` en `Cerrajería`, incluso con desgaste `colision`, y obtener un análisis sin advertir la contradicción.

**Corrección observada:** `validarSemantica` infiere la categoría mediante palabras clave y contrasta la categoría y el desgaste declarados. Para `Radiador`, la categoría inferida es `Refrigeración`; admite `correctivo`, `desgaste_medio` y `preventivo`, y sugiere `correctivo`. No existe un tipo literal `temperatura` en esta regla, aunque se mencionaba en la propuesta.

En el endpoint predictivo, las incoherencias detectadas se rechazan con `400` antes de cargar o ejecutar ONNX. Por tanto, la implementación exige corregir la entrada; no se limita a preguntar si se desea continuar. El frontend calcula advertencias durante la edición y permite aplicar sugerencias.

**Prompt sugerido para solicitar la corrección (no es una cita histórica):**

> Estoy poniendo radiador en la categoría cerrajería y con desgaste por colisión, pero el sistema igual me deja analizarlo. Revisa que el nombre del repuesto tenga relación con la categoría y el desgaste. Si los datos no corresponden, muestra qué debo corregir y sugiere los valores adecuados. Valídalo tanto en el frontend como en el backend para que no se ejecute el modelo con esos datos.

**Evidencia:** [reglas del backend](../backend/src/products/product-guardrails.ts), [servicio predictivo](../backend/src/products/demand-prediction.service.ts), [reglas del frontend](../frontend/src/utils/product-guardrails.ts) y prueba «detecta categoría incoherente y protege la entrada del modelo» en [product-guardrails.spec.ts](../backend/src/products/product-guardrails.spec.ts).

## Paso 2. Venta a pérdida y ausencia de alertas de margen

**Error reportado:** un precio de venta menor al costo no impedía recomendar una compra; tampoco se advertía un margen demasiado pequeño.

**Corrección observada:** `validarFinanzas` calcula el margen sobre costo:

```text
margen (%) = (precio de mostrador - costo) / costo × 100
```

| Situación | Comportamiento actual |
| --- | --- |
| Precio de mostrador menor o igual al costo | Error financiero con pérdida por unidad |
| Precio mayorista menor o igual al costo | Error financiero con pérdida por unidad |
| Mayorista superior al precio de mostrador | Error financiero |
| Costos o precios no positivos o no finitos | Error financiero |
| Margen positivo menor al 15% | Advertencia; score máximo 45 y lote máximo 3 |
| Margen superior al 500% | Advertencia para revisar costo y precio |

Se propone un PVP mínimo de `costo × 1.15` y uno recomendado de `costo × 1.35`. Son reglas del sistema, no valores aprendidos por el modelo.

**Distinción aplicada:** una entrada nueva o editada con finanzas incoherentes recibe `400`, sin predicción ni porcentajes. Si se consulta un producto existente con sus precios originales, positivos e intactos, el servicio permite auditarlo y devuelve `inviable`, score `0` y lote `0` cuando está bloqueado. El backend vuelve a leer el producto: enviar `productId` no permite eludir la validación de una edición.

**Prompt sugerido para solicitar la corrección (no es una cita histórica):**

> Si pongo que compro una pieza a Bs. 200 y la vendo a Bs. 150, el sistema no me avisa que estoy perdiendo dinero. Corrige las validaciones de costo, precio de venta y precio mayorista. No permitas analizar precios ingresados que sean incoherentes. Si el margen es menor al 15% sobre el costo, muestra una alerta, recomienda un precio mínimo y reduce la recomendación de compra. Para los productos que ya están guardados con pérdida, quiero poder ver que son inviables, con score y lote en cero.

**Evidencia:** `validarFinanzas` en [product-guardrails.ts](../backend/src/products/product-guardrails.ts), límites de score/lote en [demand-prediction.service.ts](../backend/src/products/demand-prediction.service.ts) y caso «distingue una pérdida real registrada de datos editados incorrectamente» en [demand-prediction.service.spec.ts](../backend/src/products/demand-prediction.service.spec.ts).

## Paso 3. Score alto por rotación sin considerar rentabilidad y saturación

**Error reportado:** la clasificación de alta rotación podía traducirse en un éxito comercial alto aun cuando la venta no convenía económicamente.

**Corrección observada:** el servicio combina un valor de rotación asignado según la clase del modelo con salud del margen y saturación:

```text
scoreSaturacion = max(0, 100 - cantidadSimilares × 20)
scoreExito = 0.40 × scoreRotacion
           + 0.40 × saludMargen
           + 0.20 × scoreSaturacion
```

La clase de rotación usa valores base de `88.5`, `65` o `32`; ese componente no es directamente la probabilidad del modelo. `probabilidadExito` representa la probabilidad de alta rotación, mientras que `scoreExito` es un índice comercial con reglas.

El bloqueo financiero fuerza score y lote a cero. Con margen menor al 15% se aplican los límites del paso 2. La saturación reduce el lote mediante `max(0.2, 1 - cantidadSimilares × 0.15)`, con redondeo y mínimo de una unidad si no hay bloqueo. Por sí sola, la saturación no lleva el lote a cero.

**Prompt sugerido para solicitar la corrección (no es una cita histórica):**

> La predicción sigue dando un éxito alto solo porque el repuesto tiene buena rotación, pero eso no significa que convenga comprarlo. Haz que el resultado considere 40% de rotación, 40% de salud del margen y 20% de saturación del catálogo. Si ya tenemos muchos productos similares, baja el lote sugerido. Si se vende a pérdida, no recomiendes comprar, y si el margen es muy pequeño, limita el score y la cantidad. Diferencia la probabilidad de alta rotación del índice de viabilidad comercial.

**Evidencia:** `calcularScorePonderado` en [product-guardrails.ts](../backend/src/products/product-guardrails.ts), cálculo de lote en [demand-prediction.service.ts](../backend/src/products/demand-prediction.service.ts) y casos de margen/saturación en [product-guardrails.spec.ts](../backend/src/products/product-guardrails.spec.ts).

## Paso 4. Datos ilógicos y resultados visibles después de una entrada inválida

**Error registrado en la versión previa de esta bitácora:** nombres como `Pizza` o importes absurdos podían generar porcentajes; la interfaz podía mostrar `null%` o conservar resultados que ya no correspondían a los datos editados.

**Corrección observada:** se comprueban palabras no automotrices conocidas, importes superiores a Bs. 1.000.000 y años incoherentes. Los errores se rechazan antes de inferir, con `message` y `errores`, sin campos de predicción. La lista de palabras es finita y no detecta cualquier nombre inventado.

El modal limpia el resultado al cambiar datos y al enviar una solicitud; mantiene `result = null` ante errores y oculta resultados cuando hay errores de validación. Además, usa una revisión de solicitud para ignorar respuestas antiguas. Una entrada rechazada no debe presentar score, lote ni métricas.

**Prompts originales recuperados del historial:**

> estoy viendo que se rellena solo, me gusta
> quiero ahora poner datos ridiculos y que el modelo se de cuenta de que son datos que no corresponden

> me gusta como esta ahora, quiero mejorarlo, si son datos muy incoherentes quiero que salga un mensaje por parte del modelo que diga datos incoherentes vuelva a introducir datos y no muestre ningun % en ese caso

**Evidencia:** validación previa a ONNX en [demand-prediction.service.ts](../backend/src/products/demand-prediction.service.ts), casos de rechazo en [demand-prediction.service.spec.ts](../backend/src/products/demand-prediction.service.spec.ts) y manejo del formulario en [PredictSuccessModal.tsx](../frontend/src/components/inventory/PredictSuccessModal.tsx).

## Paso 5. Arranque local: puerto ocupado y conexión a PostgreSQL

**Prompt original:**

> enciendo el backend?

**Error histórico:** el puerto `3000` estaba ocupado por Grafana, identificado en el historial con PID `7620`. Ese PID corresponde a aquella sesión, no necesariamente a un proceso actual.

**Corrección registrada:** backend con `PORT=3001` y frontend local con `VITE_API_URL=http://localhost:3001/api`. La conexión PostgreSQL registrada era `localhost`, base `PrograA_H4`, con `DB_SSL=false`. Se aclaró la diferencia entre esa base local y Supabase Storage. Se omiten credenciales y no se afirma que esa configuración siga activa hoy.

## Paso 6. Login sin token y modelo ONNX ausente

**Error histórico de login:** apareció `tokenLen=0` porque se leía `access_token` en lugar de `token`. La corrección fue leer `respuesta.token` y usarlo como Bearer, sin registrar su contenido. El contrato actual comprobado en [auth.service.ts](../backend/src/auth/auth.service.ts) es `{ token, user }`. El historial incluye el log del usuario `loginOK` y una confirmación de HTTP 200 escrita por el asistente; son evidencias históricas distintas, no una prueba ejecutada hoy.

**Error histórico del modelo:** faltaba `modelo_exito_autopartes.onnx`. No se afirma que falte actualmente. El cargador actual busca rutas relativas al directorio de trabajo (`models`, `backend/models`, `src/models`, `backend/src/models` y `notebooks`) y después rutas relativas al código compilado. También busca el JSON junto al ONNX o como `modelo_metadata.json`. Si no consigue una sesión disponible, el endpoint responde `503`, sin inventar predicciones.

**Corrección necesaria:** provisionar el artefacto y sus metadatos en una ruta admitida. En el historial recién aportado no hay evidencia final de generación del ONNX, por lo que esa incidencia no se marca como resuelta allí. Véase [demand-prediction.service.ts](../backend/src/products/demand-prediction.service.ts).

**Prompts específicos de login y aprovisionamiento:** no aparecen como solicitudes independientes en los fragmentos recuperados; forman parte de las pruebas iniciadas con el prompt de arranque.

## Paso 7. Datos de prueba y expectativas corregidas

**Prompts originales:**

> dame los datos para probar la funcion dame datos coherentes y datos incoherentes

> dame 3 tipos de datos de prueba
> datos que den  un gran %
> datos que den un % bajo
> y datos inchoherentes donde espero que el modelo avise que esos datos no corresponden

Los siete casos siguientes provienen del historial; sus expectativas se ajustan al contrato actual. No son resultados ejecutados hoy. Los precios están en bolivianos y en orden **costo / mostrador / mayorista**.

| Caso | Entrada histórica | Expectativa actual |
| --- | --- | --- |
| 1. Margen saludable | Farol; Toyota Corolla; año 2015-2020; fabricante Tyc; 280 / 390 / 330; Iluminación; desgaste_medio; Alto | Margen sobre costo 39,29%; entrada coherente. Con modelo disponible puede analizarse, pero no garantiza score ni probabilidad altos: influyen rotación y saturación. |
| 2. Margen crítico | Farol; Toyota Corolla; 100 / 110 / 105; Iluminación; desgaste_medio; Alto | Margen 10%; advertencia, score máximo 45 y lote máximo 3 si se obtiene el análisis. |
| 3. Categoría fuera del entrenamiento | Pastillas de freno; Toyota Corolla; 120 / 200 / 170; Frenos; desgaste_frecuente; Medio | Entrada coherente del negocio. Si Frenos no pertenece al dominio del artefacto cargado, advertencia y viabilidad de riesgo; no es por sí misma un error 400. |
| 4. Categoría incoherente | Radiador; Toyota Corolla; 300 / 450 / 380; Cerrajería; correctivo; Alto | Entrada nueva rechazada con HTTP 400, sin porcentaje. Sugerencia: Refrigeración. La expectativa histórica de analizarla como riesgo con categoría corregida quedó obsoleta. |
| 5. Venta a pérdida | Farol; Toyota Corolla; 500 / 400 / 350; Iluminación; desgaste_medio; Alto | Entrada nueva rechazada con HTTP 400. Score y lote cero corresponden a auditar precios originales guardados, no a esta entrada nueva incoherente. |
| 6. Mayorista superior al mostrador | Farol; Toyota Corolla; 300 / 450 / 500; Iluminación; desgaste_medio; Alto | Entrada nueva rechazada con HTTP 400, sin predicción. La expectativa histórica de devolver un análisis bloqueado quedó obsoleta para esta entrada. |
| 7. Datos inválidos | Producto 12345; marca vacía; modelo Corolla; costo 0; venta -10; categoría Pizza | HTTP 400, sin porcentajes. El DTO exige al menos una letra en el nombre, marca no vacía, precios positivos y categoría admitida. |

**Metadatos históricos:** el historial describe cinco productos de Hilux y tres de Corolla y un dataset de 37 registros, distribuido en 13/12/12 por clase. Son cifras del registro aportado, no una consulta nueva a la BD ni una validación actual del dataset. Para la tupla legacy intacta `General / preventivo / Medio`, `normalizarMetadataCatalogo` infiere categoría, desgaste y segmento sin modificar la BD. Una edición explícita incoherente sigue siendo rechazada.

## Paso 8. Herramientas de revisión y registro documental

**Incidencia histórica:** `rg` produjo `CommandNotFoundException` en aquella sesión. **Alternativa recomendada:** usar `Select-String` en PowerShell. No se afirma que esa alternativa llegara a ejecutarse ni que `rg` esté ausente actualmente.

**Prompt original de documentación:**

> crea un .md con lo que hiciste hasta ahora

## Verificación de este registro

Se revisaron ambos archivos `errores.md` y se consolidó aquí el registro. Se contrastaron el contrato actual de login, el cargador ONNX, las reglas comerciales y el formulario con el código y los casos de prueba existentes.

La versión previa de la bitácora registraba 8 suites y 100 tests correctos, lint/build de backend y frontend y 37 inferencias reales con 74 rechazos de ediciones incoherentes. Son **resultados históricos documentados**, no ejecuciones de esta revisión, y no demuestran que el aprovisionamiento terminara en la sesión recién pegada. Los comandos interrumpidos de esos fragmentos no se consideran completados.

**No se ejecutaron pruebas ni inferencias en esta revisión documental**, ni se afirma haber reproducido hoy los fallos originales. Los prompts recuperados se citan literalmente. Los textos de los pasos 1 a 3 son redacciones sugeridas para solicitar una corrección, no citas históricas verificadas. Se omitieron duplicaciones, contraseñas, JWT y tokens de servicios.
