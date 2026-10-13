import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import sharp from 'sharp';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { PartRecognitionController } from '../src/part-recognition/part-recognition.controller';
import { PartRecognitionService } from '../src/part-recognition/part-recognition.service';
import { ProductsController } from '../src/products/products.controller';
import { ProductsService } from '../src/products/products.service';
import { SalesController } from '../src/sales/sales.controller';
import { SalesService } from '../src/sales/sales.service';
import { SolicitudesController } from '../src/solicitudes/solicitudes.controller';
import { SolicitudesService } from '../src/solicitudes/solicitudes.service';
import { CostosController } from '../src/costos/costos.controller';
import { CostosService } from '../src/costos/costos.service';
import { DevolucionesController } from '../src/devoluciones/devoluciones.controller';
import { DevolucionesService } from '../src/devoluciones/devoluciones.service';
import { PreciosController } from '../src/precios/precios.controller';
import { PreciosService } from '../src/precios/precios.service';
import { ProveedoresController } from '../src/proveedores/proveedores.controller';
import { ProveedoresService } from '../src/proveedores/proveedores.service';
import { MovimientosController } from '../src/movimientos/movimientos.controller';
import { MovimientosService } from '../src/movimientos/movimientos.service';
import { ReportesController } from '../src/reportes/reportes.controller';
import { ReportesService } from '../src/reportes/reportes.service';
import { LocationsController } from '../src/locations/locations.controller';
import { LocationsService } from '../src/locations/locations.service';

// HTTP, multipart, real JWT/Passport and guards; no database, users or model are changed.
describe('Part recognition and cliente isolation (e2e)', () => {
  let app: INestApplication;
  let png: Buffer;
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  const jwt = new JwtService({
    secret: process.env.JWT_SECRET || 'unifranz-inventario-secret',
  });
  const authorization = (rol: string) =>
    `Bearer ${jwt.sign({ sub: 1, email: 'fixture@example.test', rol, tiendaId: null })}`;
  const legacy = [
    [ProductsController, ProductsService, '/products'],
    [SalesController, SalesService, '/sales'],
    [SolicitudesController, SolicitudesService, '/solicitudes'],
    [CostosController, CostosService, '/costos/facturas'],
    [DevolucionesController, DevolucionesService, '/devoluciones'],
    [PreciosController, PreciosService, '/precios'],
    [ProveedoresController, ProveedoresService, '/proveedores'],
    [MovimientosController, MovimientosService, '/movimientos'],
    [ReportesController, ReportesService, '/reportes/dashboard'],
    [LocationsController, LocationsService, '/locations'],
  ] as const;

  beforeAll(async () => {
    const fixture = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [
        PartRecognitionController,
        ...legacy.map(([controller]) => controller),
      ],
      providers: [
        JwtStrategy,
        PartRecognitionService,
        { provide: ConfigService, useValue: new ConfigService() },
        ...legacy.map(([, service]) => ({
          provide: service,
          useValue: { findAll: () => [], dashboard: () => ({}) },
        })),
      ],
    }).compile();
    app = fixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
  });
  beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => app.close());

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/part-recognition/health')
      .expect(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(['admin', 'tienda', 'inventario'])(
    'denies recognition to %s',
    async (rol) => {
      await request(app.getHttpServer())
        .get('/api/part-recognition/health')
        .set('Authorization', authorization(rol))
        .expect(403);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
  it('exposes controlled model readiness to cliente', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ status: 'model_unavailable', model_available: false }),
    );
    const response = await request(app.getHttpServer())
      .get('/api/part-recognition/health')
      .set('Authorization', authorization('cliente'))
      .expect(200);
    expect(response.body.model_available).toBe(false);
  });
  it.each(legacy.map(([, , path]) => [path]))(
    'denies cliente access to %s',
    async (path) => {
      await request(app.getHttpServer())
        .get(`/api${path}`)
        .set('Authorization', authorization('cliente'))
        .expect(403);
    },
  );
  it.each(
    legacy.flatMap(([, , path]) =>
      ['admin', 'tienda', 'inventario'].map((rol) => [path, rol]),
    ),
  )('preserves %s access for %s', async (path, rol) => {
    await request(app.getHttpServer())
      .get(`/api${path}`)
      .set('Authorization', authorization(rol))
      .expect(200);
  });
  it('rejects missing, corrupt and unsupported images', async () => {
    await request(app.getHttpServer())
      .post('/api/part-recognition/predict')
      .set('Authorization', authorization('cliente'))
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/part-recognition/predict')
      .set('Authorization', authorization('cliente'))
      .attach('file', Buffer.from('fake png'), {
        filename: 'fake.png',
        contentType: 'image/png',
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/part-recognition/predict')
      .set('Authorization', authorization('cliente'))
      .attach('file', png, { filename: 'wrong.gif', contentType: 'image/gif' })
      .expect(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('returns a controlled unavailable model error for a valid upload', async () => {
    fetchMock.mockResolvedValue(
      new Response('private model path', { status: 503 }),
    );
    const response = await request(app.getHttpServer())
      .post('/api/part-recognition/predict')
      .set('Authorization', authorization('cliente'))
      .attach('file', png, { filename: 'part.png', contentType: 'image/png' })
      .expect(503);
    expect(response.body.code).toBe('model_unavailable');
    expect(response.body.message).not.toContain('private');
  });
  it('rejects oversized multipart before inference', async () => {
    await request(app.getHttpServer())
      .post('/api/part-recognition/predict')
      .set('Authorization', authorization('cliente'))
      .attach('file', Buffer.alloc(10 * 1024 * 1024 + 1), {
        filename: 'large.png',
        contentType: 'image/png',
      })
      .expect(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
