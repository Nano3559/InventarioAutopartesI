import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DemandPredictionService } from './demand-prediction.service';
import { PredictSuccessDto } from './dto/predict-success.dto';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import * as ort from 'onnxruntime-node';

jest.mock('onnxruntime-node', () => ({
  Tensor: jest.fn(),
  InferenceSession: { create: jest.fn() },
}));

const entrada: PredictSuccessDto = {
  producto: 'Radiador',
  marca: 'Toyota',
  modelo: 'Hilux',
  costo: 200,
  precio1: 300,
  categoriaRepuesto: 'Refrigeración',
  tipoDesgaste: 'correctivo',
  segmentoParque: 'Alto',
};

describe('DemandPredictionService: datos incoherentes', () => {
  it.each(['src/models', 'notebooks'])(
    'carga una exportación existente en %s y el metadata del notebook',
    async (folder) => {
      const root = fs.mkdtempSync(path.join(tmpdir(), 'prediction-loader-'));
      const directory = path.join(root, folder);
      fs.mkdirSync(directory, { recursive: true });
      const model = path.join(directory, 'modelo_exito_autopartes.onnx');
      const metadata = path.join(directory, 'modelo_metadata.json');
      // Doble de inferencia: no se genera ni se utiliza un modelo real en Jest.
      fs.writeFileSync(model, 'test fixture, not an ONNX model');
      fs.writeFileSync(
        metadata,
        JSON.stringify({ categorias_validas: ['Refrigeración'] }),
      );
      const cwd = jest.spyOn(process, 'cwd').mockReturnValue(root);
      const create = jest
        .spyOn(ort.InferenceSession, 'create')
        .mockResolvedValue({} as ort.InferenceSession);
      try {
        const service = new DemandPredictionService({} as DataSource);
        await service.onModuleInit();
        expect(create).toHaveBeenLastCalledWith(model);
        expect((service as unknown as { metadata: unknown }).metadata).toEqual({
          categorias_validas: ['Refrigeración'],
        });
      } finally {
        cwd.mockRestore();
        fs.unlinkSync(model);
        fs.unlinkSync(metadata);
        fs.rmdirSync(directory);
        if (folder === 'src/models') fs.rmdirSync(path.join(root, 'src'));
        fs.rmdirSync(root);
        create.mockReset();
      }
    },
  );
  it('distingue un modelo ausente de datos incorrectos y no inventa resultados', async () => {
    const service = new DemandPredictionService({} as DataSource);
    jest
      .spyOn(service as unknown as { initModel(): Promise<void> }, 'initModel')
      .mockResolvedValue(undefined);
    await expect(service.predictSuccess(entrada)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
  const catalogo = {
    ...entrada,
    id: 22,
    categoriaRepuesto: 'General',
    tipoDesgaste: 'preventivo',
    segmentoParque: 'Medio',
    precioMayor: 250,
  };
  function servicioCatalogo(producto = catalogo) {
    const service = new DemandPredictionService({
      getRepository: () => ({ findOne: () => Promise.resolve(producto) }),
      query: () => Promise.resolve([]),
    } as unknown as DataSource);
    Object.defineProperty(service, 'session', {
      value: {
        run: () =>
          Promise.resolve({
            output_label: { data: [2] },
            probabilities: { data: [0.1, 0.2, 0.7] },
          }),
      },
    });
    return service;
  }

  it('analiza datos reales legacy sin exigir corregir defaults de BD', async () => {
    const response = await servicioCatalogo().predictSuccess({
      ...catalogo,
      productId: catalogo.id,
    });
    expect(response.guardrails.coherenciaSemantica.categoriaUsada).toBe(
      'Refrigeración',
    );
    expect(response.guardrails.coherenciaSemantica.tipoDesgasteUsado).toBe(
      'correctivo',
    );
    expect(response.scoreExito).toBeGreaterThan(0);
    expect(response.probabilidadExito).toBe(0.7);
    expect(response.probabilidadExito).not.toBe(response.scoreExito / 100);
  });

  it('acepta el mismo preset ya normalizado por el frontend', async () => {
    const response = await servicioCatalogo().predictSuccess({
      ...entrada,
      productId: catalogo.id,
      precioMayor: 250,
    });
    expect(response.guardrails.coherenciaSemantica.coherente).toBe(true);
  });

  it.each([{ precio1: 150 }, { categoriaRepuesto: 'Cerrajería' }])(
    'el ID no permite una edición incoherente: %j',
    async (cambio) => {
      await expect(
        servicioCatalogo().predictSuccess({
          ...entrada,
          productId: catalogo.id,
          precioMayor: 250,
          ...cambio,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('distingue una pérdida real registrada de datos editados incorrectamente', async () => {
    const producto = { ...catalogo, precio1: 150, precioMayor: 140 };
    const response = await servicioCatalogo(producto).predictSuccess({
      ...producto,
      productId: producto.id,
    });
    expect(response.viabilidad).toBe('inviable');
    expect(response.bloqueado).toBe(true);
  });

  it.each([
    { categoriaRepuesto: 'Cerrajería' },
    { tipoDesgaste: 'colision' },
    { producto: 'Pizza' },
    { marca: 'asdf' },
    { costo: -1 },
    { precio1: 150 },
    { precioMayor: 350 },
    { costo: 2_000_000, precio1: 3_000_000 },
    { anio: '2020-2010' },
    { anio: '9999' },
  ])('rechaza %j antes de cargar ONNX o consultar datos', async (cambio) => {
    const query = jest.fn();
    const service = new DemandPredictionService({
      query,
    } as unknown as DataSource);
    const initModel = jest.spyOn(
      service as unknown as { initModel(): Promise<void> },
      'initModel',
    );
    try {
      await service.predictSuccess({ ...entrada, ...cambio });
      throw new Error('Se esperaba rechazo de los datos');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse();
      expect(response).toEqual({
        message: expect.stringContaining(
          'vuelva a introducir los datos',
        ) as unknown,
        errores: expect.any(Array) as unknown,
      });
      expect(response).not.toHaveProperty('scoreExito');
      expect(response).not.toHaveProperty('metricasProyectadas');
      expect(response).not.toHaveProperty('loteSugeridoCompra');
    }
    expect(initModel).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
});
