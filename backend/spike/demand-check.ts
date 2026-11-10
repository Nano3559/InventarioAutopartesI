import 'dotenv/config';
import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Product } from '../src/entities/product.entity';
import { DemandPredictionService } from '../src/products/demand-prediction.service';
import { PredictSuccessDto } from '../src/products/dto/predict-success.dto';
import { normalizarMetadataCatalogo } from '../src/products/product-guardrails';

/** Inferencia ONNX real fuera de Jest; la BD solo se consulta, nunca se modifica. */
async function main() {
  const host = process.env.DB_HOST ?? 'localhost';
  const ssl = process.env.DB_SSL ?? String(!/^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/.test(host));
  const db = new DataSource({
    type: 'postgres', host, port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, ssl: ssl === 'true' ? { rejectUnauthorized: false } : false,
    entities: [Product], synchronize: false,
  });
  await db.initialize();
  try {
    const service = new DemandPredictionService(db);
    await service.onModuleInit();
    const products = await db.getRepository(Product).find({ where: { activo: true }, order: { id: 'ASC' } });
    assert(products.length > 0, 'No hay productos activos para verificar.');
    const probabilities: number[] = [];
    let rejectedEdits = 0;
    for (const product of products) {
      const metadata = normalizarMetadataCatalogo(product);
      const dto: PredictSuccessDto = {
        productId: product.id, producto: product.producto, marca: product.marca,
        modelo: product.modelo, anio: product.anio ?? undefined, fabricante: product.fabricante,
        costo: product.costo, precio1: product.precio1 ?? Number.NaN,
        precioMayor: product.precioMayor ?? undefined,
        categoriaRepuesto: metadata.categoriaRepuesto ?? undefined,
        tipoDesgaste: metadata.tipoDesgaste ?? undefined,
        segmentoParque: metadata.segmentoParque ?? undefined,
      };
      const result = await service.predictSuccess(dto);
      assert(Number.isFinite(result.scoreExito));
      assert(result.probabilidadExito >= 0 && result.probabilidadExito <= 1);
      probabilities.push(result.probabilidadExito);
      for (const cambio of [{ precio1: -1 }, { producto: 'Pizza' }]) {
        try {
          await service.predictSuccess({ ...dto, ...cambio });
          assert.fail(`Edición incoherente aceptada para producto ${product.id}`);
        } catch (error: unknown) {
          assert(error instanceof BadRequestException);
          const response = error.getResponse();
          assert(typeof response === 'object' && response !== null);
          for (const key of ['scoreExito', 'probabilidadExito', 'metricasProyectadas', 'loteSugeridoCompra']) {
            assert(!(key in response), `El rechazo incluye ${key}`);
          }
          rejectedEdits += 1;
        }
      }
    }
    console.log(JSON.stringify({ products: products.length, realOnnxPredictions: probabilities.length,
      minProbability: Math.min(...probabilities), maxProbability: Math.max(...probabilities), rejectedEdits }));
  } finally {
    await db.destroy();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Falló la verificación predictiva.');
  process.exitCode = 1;
});
