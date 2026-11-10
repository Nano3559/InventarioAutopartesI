import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { ProductsController } from '../src/products/products.controller';
import { ProductsService } from '../src/products/products.service';
import { DemandPredictionService } from '../src/products/demand-prediction.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';

jest.mock('onnxruntime-node', () => ({}));

describe('Prediction validation (HTTP, without database)', () => {
  let app: INestApplication;
  const query = jest.fn();

  beforeAll(async () => {
    const service = new DemandPredictionService({
      query,
    } as unknown as DataSource);
    jest.spyOn(service, 'onModuleInit').mockResolvedValue(undefined);
    jest
      .spyOn(service as unknown as { initModel(): Promise<void> }, 'initModel')
      .mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: {} },
        { provide: DemandPredictionService, useValue: service },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns correction instructions without predictions for inconsistent data', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/products/predict-success')
      .send({
        producto: 'Radiador',
        marca: 'Toyota',
        modelo: 'Hilux',
        costo: 200,
        precio1: 300,
        categoriaRepuesto: 'Cerrajer\u00eda',
        tipoDesgaste: 'colision',
      })
      .expect(400);
    const body = response.body as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(['errores', 'message']);
    expect(body.message).toContain('vuelva a introducir los datos');
    expect(Array.isArray(body.errores)).toBe(true);
    expect(query).not.toHaveBeenCalled();
  });

  it('returns service unavailable rather than blaming valid input when model is missing', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/products/predict-success')
      .send({
        producto: 'Radiador',
        marca: 'Toyota',
        modelo: 'Hilux',
        costo: 200,
        precio1: 300,
        categoriaRepuesto: 'Refrigeración',
        tipoDesgaste: 'correctivo',
        anio: '2012-2020',
        fabricante: 'Denso',
      })
      .expect(503);
    const body = response.body as Record<string, unknown>;
    expect(body.message).toContain('Los datos ingresados son válidos');
    expect(body).not.toHaveProperty('scoreExito');
    expect(body).not.toHaveProperty('probabilidadExito');
  });
});
