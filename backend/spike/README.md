# Spike B2 — ArcFace int8 dentro de NestJS

Mide si el reconocimiento facial **in-process** (`onnxruntime-node`, sin microservicio
Python) cabe en los 512 MB del plan gratuito de Render, y cuánto tarda cada inferencia.

## Uso

1. Instalar la dependencia (ya está en `package.json`):

   ```bash
   npm install
   ```

2. Descargar el modelo (63 MB, **no** se versiona — está en `.gitignore`):

   ```bash
   curl -L -o spike/models/arcfaceresnet100-11-int8.onnx \
     https://huggingface.co/onnxmodelzoo/arcfaceresnet100-11-int8/resolve/main/arcfaceresnet100-11-int8.onnx
   ```

3. Correr:

   ```bash
   npm run spike:arcface
   ```

## Qué mide

| Métrica | Cómo |
| --- | --- |
| Tiempo de carga de la `InferenceSession` | `performance.now()` alrededor de `InferenceSession.create` |
| RSS base / tras cargar el modelo | `process.memoryUsage().rss` con `global.gc()` |
| RSS con 1 y con 5 embeddings en memoria | Los embeddings se retienen a propósito (peor caso del índice) |
| Latencia 1 embedding | 2 de warmup + 20 corridas; media, p50, p95 |
| Tanda de 5 | 5 inferencias en `Promise.all` (el registro promedia N fotos) |

El input es determinista (PRNG con semilla fija) para que las corridas sean comparables
entre máquinas.

## Contrato del modelo

- Licencia **Apache-2.0** (`onnxmodelzoo/arcfaceresnet100-11-int8`).
- Entrada: `data`, `float32` `[1, 3, 112, 112]`, NCHW, RGB, preprocesado `(x - 127.5) / 128`.
- Salida: `fc1`, `float32` `[1, 512]`. Hay que **normalizar a norma 1** antes de comparar
  por similitud coseno.
- No lleva detector: el recorte 112×112 con guía oval lo hace la app.

## Resultados medidos

Hardware de la medición: Intel Core i7-5500U @ 2.40 GHz (2 núcleos / 4 hilos),
Windows, Node v24.13.0, `onnxruntime-node` 1.30.0, CPU EP con `graphOptimizationLevel: all`.

| Métrica | Valor |
| --- | --- |
| Carga de la session | 561 ms |
| RSS base (Node sin modelo) | 73.4 MB |
| RSS tras cargar el modelo | 165.9 MB (**+92.5 MB**) |
| RSS tras 2 inferencias (arenas de ORT) | 192.9 MB (**+27 MB**) |
| RSS con 5 embeddings retenidos | 199.2 MB (**+0.1 MB**) |
| Overhead total del modelo | **125.9 MB** |
| Latencia 1 embedding | media 246.8 ms · p50 233.2 ms · p95 367.6 ms |
| Tanda de 5 embeddings | ~1234 ms |
| Ritmo | 4.1 embeddings/s |
| Embedding | 512 floats; ‖v‖ sin normalizar = 5.21 |

**Conclusión: entra en 512 MB.** El peso es casi todo el modelo (92.5 MB); los embeddings
son Negligibles (5 × 2 KB). El presupuesto real no es la RAM sino la **latencia**: 5 fotos
en el registro son ~1.2 s, aceptable, pero el reconocimiento en vivo debe ir con 1 sola foto.

Los 125.9 MB son solo el proceso Node con ORT: en Render hay que sumar el resto del backend
NestJS (TypeORM, Supabase, etc.) y Render free da 0.5 GB de RAM, así que el margen real es
menor que 386 MB. Repetir la medición en la instancia de Render antes de cerrar B4.
