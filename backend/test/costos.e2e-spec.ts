import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Product } from '../src/entities/product.entity';
import { Inventory } from '../src/entities/inventory.entity';
import { Factura } from '../src/entities/factura.entity';
import { Proveedor } from '../src/entities/proveedor.entity';
import { createApp, db, login, bearer, TEST_USERS } from './test-utils';

describe('Costos (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let adminToken: string;

  const suffix = Date.now().toString(36);
  const codigoFabrica = `E2E-${suffix}-FAC`;
  let almacenId: number;
  let proveedorId: number | null = null;
  let facturaId: number | null = null;
  let facturaArchivo: string | null = null;
  let productId: number | null = null;

  beforeAll(async () => {
    app = await createApp();
    ds = db(app);
    adminToken = await login(
      app,
      TEST_USERS.admin.email,
      TEST_USERS.admin.password,
    );

    const locations = (
      await request(app.getHttpServer())
        .get('/api/locations')
        .set(bearer(adminToken))
        .expect(200)
    ).body as Array<{ id: number; codigo: string }>;
    almacenId = locations.find((l) => l.codigo === 'ALM-1')!.id;

    const prov = await request(app.getHttpServer())
      .post('/api/proveedores')
      .set(bearer(adminToken))
      .send({ nombre: `Proveedor Costos E2E ${suffix}` })
      .expect(201);
    proveedorId = prov.body.id as number;
  });

  afterAll(async () => {
    if (facturaArchivo) {
      const full = path.join(
        process.cwd(),
        'uploads',
        path.basename(facturaArchivo),
      );
      if (fs.existsSync(full)) fs.unlinkSync(full);
    }
    if (facturaId) {
      await ds.getRepository(Factura).delete({ id: facturaId });
    }
    if (productId) {
      await ds.getRepository(Inventory).delete({ productId });
      await ds.getRepository(Product).delete({ id: productId });
    }
    if (proveedorId) {
      await ds.getRepository(Proveedor).delete({ id: proveedorId });
    }
    await app.close();
  });

  it('GET /api/costos/facturas devuelve la lista', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/costos/facturas')
      .set(bearer(adminToken))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/costos/facturas crea la factura con ítems y archivo', async () => {
    const items = [
      {
        codigoFabrica,
        producto: 'Radiador probador e2e',
        marca: 'Toyota',
        modelo: 'Hilux',
        anio: '2018',
        costo: 320,
        cantidad: 5,
        almacenId,
      },
    ];

    const res = await request(app.getHttpServer())
      .post('/api/costos/facturas')
      .set(bearer(adminToken))
      .field('proveedorId', String(proveedorId))
      .field('numero', `FAC-${suffix}`)
      .field('tipoCambio', '6.96')
      .field('porcentaje', '10')
      .field('monto', '1600')
      .field('items', JSON.stringify(items))
      .attach('archivo', Buffer.from('pdf-e2e-fake'), {
        filename: `factura-${suffix}.pdf`,
        contentType: 'application/pdf',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.numero).toBe(`FAC-${suffix}`);
    expect(res.body.tipoCambio).toBe(6.96);
    expect(res.body.proveedor.id).toBe(proveedorId);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].codigoFabrica).toBe(codigoFabrica);
    expect(res.body.items[0].cantidad).toBe(5);
    expect(res.body.archivo).toContain('/uploads/factura-');
    facturaId = res.body.id as number;
    facturaArchivo = res.body.archivo as string;

    const created = await request(app.getHttpServer())
      .get(`/api/products?codigoFabrica=${encodeURIComponent(codigoFabrica)}`)
      .set(bearer(adminToken))
      .expect(200);
    expect(created.body.length).toBe(1);
    productId = (created.body[0] as { id: number }).id;

    const stock = await request(app.getHttpServer())
      .get(`/api/products/${productId}/stock`)
      .set(bearer(adminToken))
      .expect(200);
    const total = (stock.body as Array<{ cantidad: number }>).reduce(
      (a, s) => a + s.cantidad,
      0,
    );
    expect(total).toBe(5);
  });

  it('POST /api/costos/facturas sin ítems devuelve 400', async () => {
    await request(app.getHttpServer())
      .post('/api/costos/facturas')
      .set(bearer(adminToken))
      .field('proveedorId', String(proveedorId))
      .field('numero', `FAC-${suffix}-VACIA`)
      .field('items', '[]')
      .expect(400);
  });

  it('POST /api/costos/facturas con proveedor inexistente devuelve 404', async () => {
    await request(app.getHttpServer())
      .post('/api/costos/facturas')
      .set(bearer(adminToken))
      .field('proveedorId', '999999')
      .field('numero', 'FAC-NF')
      .field(
        'items',
        JSON.stringify([
          {
            codigoFabrica: `E2E-${suffix}-NOPE`,
            producto: 'X',
            marca: 'X',
            modelo: 'Y',
            costo: 1,
            cantidad: 1,
            almacenId,
          },
        ]),
      )
      .expect(404);
  });

  it('POST /api/costos/facturas con almacén inválido devuelve 400', async () => {
    await request(app.getHttpServer())
      .post('/api/costos/facturas')
      .set(bearer(adminToken))
      .field('proveedorId', String(proveedorId))
      .field('numero', `FAC-${suffix}-ALM`)
      .field(
        'items',
        JSON.stringify([
          {
            codigoFabrica: `E2E-${suffix}-ALM`,
            producto: 'X',
            marca: 'X',
            modelo: 'Y',
            costo: 1,
            cantidad: 1,
            almacenId: 999999,
          },
        ]),
      )
      .expect(400);
  });

  it('GET /api/costos/facturas/:id devuelve la factura con ítems', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/costos/facturas/${facturaId}`)
      .set(bearer(adminToken))
      .expect(200);

    expect(res.body.id).toBe(facturaId);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.proveedor.id).toBe(proveedorId);
  });

  it('GET /api/costos/facturas/:id inexistente devuelve 404', async () => {
    await request(app.getHttpServer())
      .get('/api/costos/facturas/999999')
      .set(bearer(adminToken))
      .expect(404);
  });

  it('No permite eliminar un proveedor con facturas asociadas', async () => {
    await request(app.getHttpServer())
      .delete(`/api/proveedores/${proveedorId}`)
      .set(bearer(adminToken))
      .expect(400);
  });

  it('DELETE /api/costos/facturas/:id elimina la factura', async () => {
    await request(app.getHttpServer())
      .delete(`/api/costos/facturas/${facturaId}`)
      .set(bearer(adminToken))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/costos/facturas/${facturaId}`)
      .set(bearer(adminToken))
      .expect(404);
    facturaId = null;
    facturaArchivo = null;

    await request(app.getHttpServer())
      .delete(`/api/proveedores/${proveedorId}`)
      .set(bearer(adminToken))
      .expect(200);
    proveedorId = null;
  });
});
