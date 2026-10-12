import sharp from 'sharp';
import * as ort from 'onnxruntime-node';
import { FaceDetector } from './face-detector';

jest.mock('onnxruntime-node', () => ({
  Tensor: jest
    .fn()
    .mockImplementation((type: string, data: Float32Array, dims: number[]) => ({
      type,
      data,
      dims,
    })),
  InferenceSession: { create: jest.fn() },
}));

describe('SCRFD: letterbox del modelo fijo 640x640', () => {
  afterEach(() => jest.restoreAllMocks());

  it('conserva proporción y coordenadas de cajas y landmarks de una foto rectangular', async () => {
    jest.spyOn(FaceDetector, 'rutaModelo').mockReturnValue(__filename);
    const nombres = [
      'score_8',
      'score_16',
      'score_32',
      'bbox_8',
      'bbox_16',
      'bbox_32',
      'kps_8',
      'kps_16',
      'kps_32',
    ];
    const salida: Record<string, { data: Float32Array }> = {};
    for (const stride of [8, 16, 32]) {
      const anclas = (640 / stride) ** 2 * 2;
      salida[`score_${stride}`] = { data: new Float32Array(anclas) };
      salida[`bbox_${stride}`] = { data: new Float32Array(anclas * 4) };
      salida[`kps_${stride}`] = { data: new Float32Array(anclas * 10) };
    }
    const i = (20 * 80 + 20) * 2;
    salida.score_8.data[i] = 0.99;
    salida.bbox_8.data.set([4, 6, 4, 6], i * 4);
    salida.kps_8.data.set([-2, -2, 2, -2, 0, 0, -1, 3, 1, 3], i * 10);
    const run = jest.fn().mockResolvedValue(salida);
    jest.spyOn(ort.InferenceSession, 'create').mockResolvedValue({
      inputNames: ['input.1'],
      outputNames: nombres,
      run,
    } as never);

    const foto = await sharp({
      create: { width: 800, height: 600, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    const rostros = await FaceDetector.detectar(foto);

    expect(rostros).toHaveLength(1);
    expect(rostros[0].caja).toEqual({ x1: 160, y1: 140, x2: 240, y2: 260 });
    expect(rostros[0].landmarks[0]).toEqual([180, 180]);
    expect(rostros[0].landmarks[1]).toEqual([220, 180]);
    const tensor = (
      run.mock.calls[0] as [
        { 'input.1': { dims: number[]; data: Float32Array } },
      ]
    )[0]['input.1'];
    expect(tensor.dims).toEqual([1, 3, 640, 640]);
    expect(tensor.data[479 * 640 + 639]).toBeCloseTo((255 - 127.5) / 128);
    expect(tensor.data[480 * 640]).toBeCloseTo(-127.5 / 128);
  });
});
