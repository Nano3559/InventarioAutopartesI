import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Product } from '../src/entities/product.entity';
import { Inventory } from '../src/entities/inventory.entity';
import { createApp, db, login, bearer, TEST_USERS } from './test-utils';

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

describe('Products (e2e)', () => {
  let app: INestApplication<App>;
  let ds: DataSource;
  let adminToken: string;
  let inventarioToken: string;
  let tiendaToken: string;

  const suffix = Date.now().toString(36);
  const codigoFabrica = `E2E-${suffix}-FRL-001`;
  let createdProductId: number | null = null;
  let uploadedImagePath: string | null = null;
  let tiendaId: number;
  let almacenId: number;

  beforeAll(async () => {
    app = await createApp();
    ds = db(app);
    adminToken = await login(
      app,
      TEST_USERS.admin.email,
      TEST_USERS.admin.password,
    );
    inventarioToken = await login(
      app,
      TEST_USERS.inventario.email,
      TEST_USERS.inventario.password,
    );
    tiendaToken = await login(
      app,
      TEST_USERS.tienda.email,
      TEST_USERS.tienda.password,
    );

    const locations = (
      await request(app.getHttpServer())
        .get('/api/locations')
        .set(bearer(adminToken))
        .expect(200)
    ).body as Array<{ id: number; codigo: string }>;
    tiendaId = locations.find((l) => l.codigo === 'TDA-1')!.id;
    almacenId = locations.find((l) => l.codigo === 'ALM-1')!.id;
  });

  afterAll(async () => {
    if (createdProductId) {
      await ds.getRepository(Inventory).delete({ productId: createdProductId });
      await ds.getRepository(Product).delete({ id: createdProductId });
    }
    if (uploadedImagePath) {
      const full = path.join(
        process.cwd(),
        'uploads',
        path.basename(uploadedImagePath),
      );
      if (fs.existsSync(full)) fs.unlinkSync(full);
    }
    await app.close();
  });

  it('GET /api/products devuelve el catálogo', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/products')
      .set(bearer(adminToken))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(37);
  });

  it('POST /api/products crea producto con stock por ubicación', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/products')
      .set(bearer(adminToken))
      .send({
        producto: 'Farol delantero probador',
        fabricante: 'Toyota',
        empresaFabricante: 'Tyc',
        marca: 'Toyota',
        modelo: 'Hilux',
        anio: '2018',
        detalle: 'Producto creado en e2e',
        codigoOem: `OEM-${suffix}`,
        codigoFabrica,
        costo: 120,
        precio1: 210,
        precio2: 190,
        precioMayor: 180,
        stockMinimo: 3,
        stock: { [tiendaId]: 15, [almacenId]: 10 },
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.codigoFabrica).toBe(codigoFabrica);
    expect(res.body.stockTotal).toBe(25);
    expect(res.body.stockByLocation[tiendaId]).toBe(15);
    expect(res.body.stockByLocation[almacenId]).toBe(10);
    createdProductId = res.body.id as number;
  });

  it('POST /api/products con código de fábrica duplicado devuelve 400', async () => {
    await request(app.getHttpServer())
      .post('/api/products')
      .set(bearer(adminToken))
      .send({
        producto: 'Duplicado',
        fabricante: 'Toyota',
        marca: 'Toyota',
        modelo: 'Hilux',
        codigoFabrica,
      })
      .expect(400);
  });

  it('POST /api/products sin campos obligatorios devuelve 400', async () => {
    await request(app.getHttpServer())
      .post('/api/products')
      .set(bearer(adminToken))
      .send({ producto: 'Incompleto' })
      .expect(400);
  });

  it('POST /api/products con costo negativo devuelve 400', async () => {
    await request(app.getHttpServer())
      .post('/api/products')
      .set(bearer(adminToken))
      .send({
        producto: 'Costo negativo',
        fabricante: 'Toyota',
        marca: 'Toyota',
        modelo: 'Hilux',
        codigoFabrica: `E2E-${suffix}-NEG`,
        costo: -5,
      })
      .expect(400);
  });

  it('POST /api/products con rol tienda devuelve 403', async () => {
    await request(app.getHttpServer())
      .post('/api/products')
      .set(bearer(tiendaToken))
      .send({
        producto: 'No permitido',
        fabricante: 'Toyota',
        marca: 'Toyota',
        modelo: 'Hilux',
        codigoFabrica: `E2E-${suffix}-FORB`,
      })
      .expect(403);
  });

  it('POST /api/products con rol inventario está permitido', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/products')
      .set(bearer(inventarioToken))
      .send({
        producto: 'Creado por inventario',
        fabricante: 'Nissan',
        marca: 'Nissan',
        modelo: 'Navara',
        codigoFabrica: `E2E-${suffix}-INV`,
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/products/${res.body.id}`)
      .set(bearer(adminToken))
      .expect(200);
    await ds.getRepository(Product).delete({ id: res.body.id as number });
  });

  it('GET /api/products devuelve el producto por código fábrica (filtro)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/products?codigoFabrica=${encodeURIComponent(codigoFabrica)}`)
      .set(bearer(adminToken))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect((res.body[0] as { id: number }).id).toBe(createdProductId);
  });

  it('GET /api/products/:id devuelve el producto con su stock', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/products/${createdProductId}`)
      .set(bearer(adminToken))
      .expect(200);

    expect(res.body.id).toBe(createdProductId);
    expect(res.body.stockTotal).toBe(25);
    expect(Array.isArray(res.body.stock)).toBe(true);
  });

  it('GET /api/products/:id/stock devuelve el detalle por ubicación', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/products/${createdProductId}/stock`)
      .set(bearer(adminToken))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    const total = (
      res.body as Array<{ ubicacion: string; cantidad: number }>
    ).reduce((a, s) => a + s.cantidad, 0);
    expect(total).toBe(25);
  });

  it('GET /api/products/:id inexistente devuelve 404', async () => {
    await request(app.getHttpServer())
      .get('/api/products/999999')
      .set(bearer(adminToken))
      .expect(404);
  });

  it('PATCH /api/products/:id actualiza costos y precios', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/products/${createdProductId}`)
      .set(bearer(adminToken))
      .send({ costo: 130, precio1: 220, detalle: 'Detalle actualizado' })
      .expect(200);

    expect(res.body.costo).toBe(130);
    expect(res.body.precio1).toBe(220);
    expect(res.body.detalle).toBe('Detalle actualizado');
  });

  it('PATCH /api/products/:id con costo negativo devuelve 400', async () => {
    await request(app.getHttpServer())
      .patch(`/api/products/${createdProductId}`)
      .set(bearer(adminToken))
      .send({ costo: -1 })
      .expect(400);
  });

  it('POST /api/products/:id/image carga una imagen', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/products/${createdProductId}/image`)
      .set(bearer(adminToken))
      .attach('file', PNG_1PX, {
        filename: 'farol.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(res.body.imagen).toBeDefined();
    expect(res.body.imagenHash).toBeDefined();
    uploadedImagePath = res.body.imagen as string;
  });

  it('DELETE /api/products/:id desactiva (soft delete) el producto', async () => {
    await request(app.getHttpServer())
      .delete(`/api/products/${createdProductId}`)
      .set(bearer(adminToken))
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/api/products?codigoFabrica=${encodeURIComponent(codigoFabrica)}`)
      .set(bearer(adminToken))
      .expect(200);
    expect(res.body.length).toBe(0);

    const byId = await request(app.getHttpServer())
      .get(`/api/products/${createdProductId}`)
      .set(bearer(adminToken))
      .expect(200);
    expect((byId.body as { activo: boolean }).activo).toBe(false);
  });
});
