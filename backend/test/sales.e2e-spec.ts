import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, In } from 'typeorm';
import * as XLSX from 'xlsx';
import { Product } from '../src/entities/product.entity';
import { Inventory } from '../src/entities/inventory.entity';
import { Sale } from '../src/entities/sale.entity';
import { SaleItem } from '../src/entities/sale-item.entity';
import { Payment } from '../src/entities/payment.entity';
import { Cliente } from '../src/entities/cliente.entity';
import { createApp, db, login, bearer, TEST_USERS } from './test-utils';

function buildExcel(rows: Array<[string, string, number, number]>): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Código Fábrica', 'Código OEM', 'Cantidad', 'Precio Mayor'],
    ...rows,
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Venta');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('Sales (e2e)', () => {
  let app: INestApplication<App>;
  let ds: DataSource;
  let adminToken: string;
  let tiendaToken: string;

  const suffix = Date.now().toString(36);
  const codigoFabrica = `E2E-${suffix}-VENTA`;
  const codigoOem = `E2E-${suffix}-OEM`;
  let productId: number | null = null;
  let tiendaId: number;
  const saleIds: number[] = [];
  const clienteIds: number[] = [];

  beforeAll(async () => {
    app = await createApp();
    ds = db(app);
    adminToken = await login(
      app,
      TEST_USERS.admin.email,
      TEST_USERS.admin.password,
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
    const almacenId = locations.find((l) => l.codigo === 'ALM-1')!.id;

    const created = await request(app.getHttpServer())
      .post('/api/products')
      .set(bearer(adminToken))
      .send({
        producto: 'Producto venta e2e',
        fabricante: 'Hyundai',
        marca: 'Hyundai',
        modelo: 'Tucson',
        detalle: 'Creado por e2e',
        codigoOem,
        codigoFabrica,
        costo: 150,
        precio1: 210,
        precio2: 195,
        precioMayor: 200,
        stock: { [tiendaId]: 20, [almacenId]: 30, 1: 30 },
      })
      .expect(201);
    productId = created.body.id as number;
  });

  afterAll(async () => {
    if (saleIds.length > 0) {
      await ds.getRepository(Payment).delete({ saleId: In(saleIds) });
      await ds.getRepository(SaleItem).delete({ saleId: In(saleIds) });
      await ds.getRepository(Sale).delete({ id: In(saleIds) });
    }
    if (clienteIds.length > 0) {
      await ds.getRepository(Cliente).delete({ id: In(clienteIds) });
    }
    if (productId) {
      await ds.getRepository(Inventory).delete({ productId });
      await ds.getRepository(Product).delete({ id: productId });
    }
    await app.close();
  });

  it('GET /api/sales devuelve ventas', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/sales')
      .set(bearer(adminToken))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/sales crea una venta menor', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/sales')
      .set(bearer(tiendaToken))
      .send({
        tipo: 'menor',
        locationId: tiendaId,
        items: [{ productId, cantidad: 2, precio: 210 }],
        pagos: [{ metodo: 'efectivo', monto: 420 }],
        cliente: { nombre: 'Cliente E2E', ciNit: '1234567' },
      })
      .expect(201);

    expect(res.body.codigo).toBeDefined();
    expect(res.body.tipo).toBe('menor');
    expect(res.body.total).toBe(420);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].product.id).toBe(productId);
    expect(res.body.items[0].cantidad).toBe(2);
    expect(res.body.pagos[0].metodo).toBe('efectivo');
    expect(res.body.cliente.nombre).toBe('Cliente E2E');
    saleIds.push(res.body.id as number);
    clienteIds.push(res.body.cliente.id as number);
  });

  it('POST /api/sales sin stock suficiente devuelve 400', async () => {
    await request(app.getHttpServer())
      .post('/api/sales')
      .set(bearer(tiendaToken))
      .send({
        items: [{ productId, cantidad: 999, precio: 210 }],
        pagos: [{ metodo: 'efectivo', monto: 999 * 210 }],
      })
      .expect(400);
  });

  it('POST /api/sales con pagos que no coinciden devuelve 400', async () => {
    await request(app.getHttpServer())
      .post('/api/sales')
      .set(bearer(tiendaToken))
      .send({
        items: [{ productId, cantidad: 1, precio: 210 }],
        pagos: [{ metodo: 'efectivo', monto: 100 }],
      })
      .expect(400);
  });

  it('POST /api/sales con cantidad inválida devuelve 400', async () => {
    await request(app.getHttpServer())
      .post('/api/sales')
      .set(bearer(tiendaToken))
      .send({
        items: [{ productId, cantidad: 0, precio: 210 }],
        pagos: [{ metodo: 'efectivo', monto: 0 }],
      })
      .expect(400);
  });

  it('GET /api/sales/:id devuelve la venta creada', async () => {
    const id = saleIds[0];
    const res = await request(app.getHttpServer())
      .get(`/api/sales/${id}`)
      .set(bearer(adminToken))
      .expect(200);

    expect(res.body.id).toBe(id);
    expect(res.body.total).toBe(420);
  });

  it('GET /api/sales/:id/nota devuelve la nota de venta en HTML', async () => {
    const id = saleIds[0];
    const res = await request(app.getHttpServer())
      .get(`/api/sales/${id}/nota`)
      .set(bearer(adminToken))
      .expect(200);

    expect(res.headers['content-type']).toContain('text/html');
    expect(String(res.text)).toContain('NOTA DE VENTA');
  });

  it('GET /api/sales/:id inexistente devuelve 404', async () => {
    await request(app.getHttpServer())
      .get('/api/sales/999999')
      .set(bearer(adminToken))
      .expect(404);
  });

  it('PATCH /api/sales/:id actualiza la venta', async () => {
    const id = saleIds[0];
    const res = await request(app.getHttpServer())
      .patch(`/api/sales/${id}`)
      .set(bearer(tiendaToken))
      .send({
        tipo: 'menor',
        locationId: tiendaId,
        items: [{ productId, cantidad: 3, precio: 210 }],
        pagos: [{ metodo: 'efectivo', monto: 630 }],
        cliente: { nombre: 'Cliente E2E', ciNit: '1234567' },
      })
      .expect(200);

    expect(res.body.total).toBe(630);
    expect(res.body.items[0].cantidad).toBe(3);
  });

  it('GET /api/sales con filtro search devuelve la venta', async () => {
    const vendidas = (
      await request(app.getHttpServer())
        .get('/api/sales')
        .set(bearer(adminToken))
        .expect(200)
    ).body as Array<{ id: number; codigo: string }>;
    const venta = vendidas.find((v) => v.id === saleIds[0]);

    const res = await request(app.getHttpServer())
      .get(`/api/sales?search=${encodeURIComponent(venta!.codigo)}`)
      .set(bearer(adminToken))
      .expect(200);

    expect((res.body as Array<{ id: number }>).map((v) => v.id)).toContain(
      saleIds[0],
    );
  });

  it('POST /api/sales/import-mayor/preview valida el Excel', async () => {
    const buffer = buildExcel([[codigoFabrica, codigoOem, 2, 200]]);
    const res = await request(app.getHttpServer())
      .post('/api/sales/import-mayor/preview')
      .set(bearer(tiendaToken))
      .attach('archivo', buffer, {
        filename: 'venta-mayor.xlsx',
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      .expect(201);

    expect(res.body.ok).toBe(true);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.total).toBe(400);
  });

  it('POST /api/sales/import-mayor/preview reporta producto inexistente', async () => {
    const buffer = buildExcel([
      ['E2E-NO-EXISTE-999', 'E2E-NO-EXISTE-999', 1, 100],
    ]);
    const res = await request(app.getHttpServer())
      .post('/api/sales/import-mayor/preview')
      .set(bearer(tiendaToken))
      .attach('archivo', buffer, {
        filename: 'venta-mayor-error.xlsx',
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      .expect(201);

    expect(res.body.ok).toBe(false);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('POST /api/sales/import-mayor crea la venta por mayor', async () => {
    const buffer = buildExcel([[codigoFabrica, codigoOem, 2, 200]]);
    const res = await request(app.getHttpServer())
      .post('/api/sales/import-mayor')
      .set(bearer(tiendaToken))
      .field('cliente', JSON.stringify({ nombre: 'Mayorista E2E' }))
      .field('pagos', JSON.stringify([{ metodo: 'transferencia', monto: 400 }]))
      .field('lugarEntrega', 'Av. Principal')
      .attach('archivo', buffer, {
        filename: 'venta-mayor.xlsx',
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      .expect(201);

    expect(res.body.tipo).toBe('mayor');
    expect(res.body.total).toBe(400);
    expect(res.body.lugarEntrega).toBe('Av. Principal');
    expect(res.body.cliente.nombre).toBe('Mayorista E2E');
    saleIds.push(res.body.id as number);
    if (res.body.cliente?.id) {
      clienteIds.push(res.body.cliente.id as number);
    }
  });
});
