import sharp from 'sharp';
import { FaceDetector } from '../src/face/face-detector';

async function main() {
  console.log('SCRFD:', FaceDetector.rutaModelo());
  const sesion = await FaceDetector.obtenerSesion();
  if (!sesion) throw new Error('No se pudo cargar SCRFD');
  console.log('Entradas:', sesion.inputNames, 'Salidas:', sesion.outputNames);
  for (const [width, height] of [[640, 640], [480, 640], [640, 481]]) {
    const foto = await sharp({ create: { width, height, channels: 3, background: '#ffffff' } }).png().toBuffer();
    const rostros = await FaceDetector.detectar(foto);
    console.log(`${width}x${height}: ${rostros.length} rostros (fondo vacío)`);
    if (rostros.length) throw new Error('El fondo vacío no debe identificar un rostro');
  }
  console.log('Contrato SCRFD OK; no mide precisión con rostros reales.');
}
main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
