import * as ort from 'onnxruntime-node';

const ruta = process.argv[2] ?? 'spike/models/scrfd_2.5g_bnkps.onnx';
const sesion = await ort.InferenceSession.create(ruta, {
  executionProviders: ['cpu'],
  graphOptimizationLevel: 'all',
});

console.log('inputNames', sesion.inputNames);
console.log('outputNames', sesion.outputNames);

const tam = 640;
const blob = new Float32Array(3 * tam * tam);
const tensor = new ort.Tensor('float32', blob, [1, 3, tam, tam]);
const salida = await sesion.run({ [sesion.inputNames[0]]: tensor });
for (const nombre of sesion.outputNames) {
  const t = salida[nombre];
  console.log(nombre, t.dims.join('x'), t.type);
}
