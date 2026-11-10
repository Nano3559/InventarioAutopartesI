import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { PredictSuccessDto } from './dto/predict-success.dto';
import { Product } from '../entities/product.entity';

// onnxruntime-node
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ort = require('onnxruntime-node');

export interface SimilarProductResult {
  id: number;
  producto: string;
  marca: string;
  modelo: string;
  fabricante: string;
  similitud: number;
  ventasMensualesNetas: number;
  gmroiReal: number;
}

export interface PredictionSuccessResponse {
  scoreExito: number;
  categoria: string;
  probabilidadExito: number;
  diasRotacionEstimados: number;
  loteSugeridoCompra: number;
  metricasProyectadas: {
    demandaMensualEstimada: number;
    gmroiProyectado: number;
    margenRelativo: number;
  };
  alertas: {
    saturacionCatalogo: boolean;
    mensaje: string;
  };
  productosSimilares: SimilarProductResult[];
}

export interface DemandSummaryResponse {
  productId: number;
  producto: string;
  marca: string;
  modelo: string;
  stockActual: number;
  stockMinimo: number;
  estadoRotacion: string;
  diasParaAgotamiento: number;
  alertaReabastecimiento: boolean;
  demandaDiaria: number;
  ventasUltimos30Dias: number;
  devolucionesUltimos30Dias: number;
}

@Injectable()
export class DemandPredictionService implements OnModuleInit {
  private readonly logger = new Logger(DemandPredictionService.name);
  private session: any = null;
  private metadata: any = null;

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async onModuleInit() {
    await this.initModel();
  }

  private async initModel() {
    try {
      const candidates = [
        path.resolve(process.cwd(), 'models', 'modelo_exito_autopartes.onnx'),
        path.resolve(__dirname, '..', '..', 'models', 'modelo_exito_autopartes.onnx'),
        path.resolve(process.cwd(), 'backend', 'models', 'modelo_exito_autopartes.onnx'),
      ];

      let modelPath = candidates.find((p) => fs.existsSync(p));
      if (!modelPath) {
        this.logger.warn(`Modelo ONNX no encontrado en: ${candidates.join(', ')}`);
        return;
      }

      this.session = await ort.InferenceSession.create(modelPath);
      this.logger.log(`Modelo ONNX cargado exitosamente desde: ${modelPath}`);

      const metaPath = modelPath.replace('.onnx', '.json');
      if (fs.existsSync(metaPath)) {
        this.metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      }
    } catch (err: any) {
      this.logger.error(`Error al inicializar sesión ONNX: ${err.message}`);
    }
  }

  async predictSuccess(dto: PredictSuccessDto): Promise<PredictionSuccessResponse> {
    if (!this.session) {
      await this.initModel();
      if (!this.session) {
        throw new Error('El modelo de predicción ONNX no está disponible.');
      }
    }

    const costo = Number(dto.costo) || 1;
    const precio1 = Number(dto.precio1) || costo * 1.35;
    const precioMayor = Number(dto.precioMayor) || precio1 * 0.85;

    const margenRelativo = (precio1 - costo) / costo;
    const ratioPrecioMayor = precioMayor / precio1;

    // Clasificación inferida o por defecto si no vienen
    const categoriaRepuesto = dto.categoriaRepuesto || this.inferCategory(dto.producto);
    const tipoDesgaste = dto.tipoDesgaste || this.inferTipoDesgaste(categoriaRepuesto);
    const segmentoParque = dto.segmentoParque || this.inferSegmentoParque(dto.modelo);

    // Preparar feeds para ONNX
    const feeds = {
      costo: new ort.Tensor('float32', Float32Array.from([costo]), [1, 1]),
      precio1: new ort.Tensor('float32', Float32Array.from([precio1]), [1, 1]),
      margen_relativo: new ort.Tensor('float32', Float32Array.from([margenRelativo]), [1, 1]),
      ratio_precio_mayor: new ort.Tensor('float32', Float32Array.from([ratioPrecioMayor]), [1, 1]),
      categoria_repuesto: new ort.Tensor('string', [categoriaRepuesto], [1, 1]),
      tipo_desgaste: new ort.Tensor('string', [tipoDesgaste], [1, 1]),
      segmento_parque: new ort.Tensor('string', [segmentoParque], [1, 1]),
    };

    const results = await this.session.run(feeds, ['output_label']);
    const predictedClass = Number(results.output_label.data[0]); // 0, 1 o 2

    // Mapear resultado
    let categoria = 'Rotación Media';
    let scoreExito = 65.0;
    let probExito = 0.65;
    let diasRotacionEstimados = 55;
    let loteSugeridoCompra = 15;
    let demandaMensualEstimada = 14;

    if (predictedClass === 2) {
      categoria = 'Alta Rotación';
      scoreExito = 88.5;
      probExito = 0.88;
      diasRotacionEstimados = 32;
      loteSugeridoCompra = 28;
      demandaMensualEstimada = 26;
    } else if (predictedClass === 0) {
      categoria = 'Baja Rotación / Riesgo';
      scoreExito = 32.0;
      probExito = 0.32;
      diasRotacionEstimados = 110;
      loteSugeridoCompra = 5;
      demandaMensualEstimada = 4;
    }

    const gmroiProyectado = Math.round(margenRelativo * (365 / diasRotacionEstimados) * 100) / 100;

    // Buscar productos similares con k-NN determinista
    const similares = await this.findSimilarProducts(dto, categoriaRepuesto, margenRelativo);

    // Verificar saturación del catálogo
    const saturacion = await this.checkCatalogSaturation(dto.modelo, categoriaRepuesto);

    let mensaje = 'Estimación balanceada de rotación.';
    if (predictedClass === 2) {
      mensaje = 'Excelente balance de margen y alta demanda en parque vehicular.';
    } else if (predictedClass === 0) {
      mensaje = 'Atención: baja rotación histórica en repuestos de este tipo o segmento de nicho. Se sugiere comprar bajo pedido.';
    }

    return {
      scoreExito,
      categoria,
      probabilidadExito: probExito,
      diasRotacionEstimados,
      loteSugeridoCompra,
      metricasProyectadas: {
        demandaMensualEstimada,
        gmroiProyectado,
        margenRelativo: Math.round(margenRelativo * 100) / 100,
      },
      alertas: {
        saturacionCatalogo: saturacion > 3,
        mensaje,
      },
      productosSimilares: similares,
    };
  }

  async getDemandSummary(productId: number, locationId?: number): Promise<DemandSummaryResponse> {
    const prod = await this.dataSource.getRepository(Product).findOne({ where: { id: productId } });
    if (!prod) {
      throw new NotFoundException(`Producto con ID ${productId} no encontrado`);
    }

    let stockQuery = `SELECT COALESCE(SUM(cantidad), 0) as stock FROM inventory WHERE "productId" = $1`;
    const stockParams: any[] = [productId];
    if (locationId) {
      stockQuery += ` AND "locationId" = $2`;
      stockParams.push(locationId);
    }
    const stockRes = await this.dataSource.query(stockQuery, stockParams);
    const stockActual = Number(stockRes[0]?.stock) || 0;

    let salesQuery = `
      SELECT COALESCE(SUM(si.cantidad), 0) as total_vendido
      FROM sale_items si
      JOIN sales s ON s.id = si."saleId"
      WHERE si."productId" = $1 AND s.fecha >= NOW() - INTERVAL '30 days'
    `;
    const salesParams: any[] = [productId];
    if (locationId) {
      salesQuery += ` AND s."locationId" = $2`;
      salesParams.push(locationId);
    }
    const salesRes = await this.dataSource.query(salesQuery, salesParams);
    const ventasUltimos30Dias = Number(salesRes[0]?.total_vendido) || 0;

    const devRes = await this.dataSource.query(`
      SELECT COALESCE(SUM(cantidad), 0) as total_devuelto
      FROM devoluciones
      WHERE "productId" = $1 AND fecha >= NOW() - INTERVAL '30 days'
    `, [productId]);
    const devolucionesUltimos30Dias = Number(devRes[0]?.total_devuelto) || 0;

    const demandaDiaria = Math.round((ventasUltimos30Dias / 30) * 100) / 100;
    const diasParaAgotamiento = demandaDiaria > 0 ? Math.round(stockActual / demandaDiaria) : 999;

    let estadoRotacion = 'Rotación Media';
    if (demandaDiaria >= 0.8) estadoRotacion = 'Alta Rotación';
    else if (demandaDiaria <= 0.2) estadoRotacion = 'Baja Rotación';

    return {
      productId: prod.id,
      producto: prod.producto,
      marca: prod.marca,
      modelo: prod.modelo,
      stockActual,
      stockMinimo: prod.stockMinimo,
      estadoRotacion,
      diasParaAgotamiento,
      alertaReabastecimiento: stockActual <= prod.stockMinimo || diasParaAgotamiento < 15,
      demandaDiaria,
      ventasUltimos30Dias,
      devolucionesUltimos30Dias,
    };
  }

  private async findSimilarProducts(
    dto: PredictSuccessDto,
    categoria: string,
    margen: number,
  ): Promise<SimilarProductResult[]> {
    const rawProds = await this.dataSource.query(`
      SELECT 
        p.id, p.producto, p.marca, p.modelo, p.fabricante, p."categoriaRepuesto", p."tipoDesgaste",
        p.costo, p.precio1,
        COALESCE(SUM(si.cantidad), 0) as total_vendido,
        COUNT(DISTINCT s.id) as num_ventas
      FROM products p
      LEFT JOIN sale_items si ON si."productId" = p.id
      LEFT JOIN sales s ON s.id = si."saleId" AND s.fecha >= NOW() - INTERVAL '90 days'
      WHERE p.activo = true
      GROUP BY p.id
      LIMIT 37;
    `);

    const scored = rawProds.map((p: any) => {
      let sim = 0.2;
      if (p.categoriaRepuesto === categoria) sim += 0.35;
      if (p.modelo?.toLowerCase().includes(dto.modelo?.toLowerCase())) sim += 0.25;
      if (p.marca?.toLowerCase().includes(dto.marca?.toLowerCase())) sim += 0.15;

      const pMargen = ((p.precio1 || p.costo * 1.3) - p.costo) / (p.costo || 1);
      const diffMargen = Math.abs(pMargen - margen);
      sim += Math.max(0, 0.05 * (1 - diffMargen));

      const ventasMes = Math.round((Number(p.total_vendido) / 3) * 10) / 10;
      const gmroi = Math.round(pMargen * (ventasMes * 12 / 10) * 100) / 100;

      return {
        id: p.id,
        producto: p.producto,
        marca: p.marca,
        modelo: p.modelo,
        fabricante: p.fabricante,
        similitud: Math.min(0.99, Math.round(sim * 100) / 100),
        ventasMensualesNetas: Math.max(1, ventasMes),
        gmroiReal: Math.max(0.5, gmroi),
      };
    });

    scored.sort((a: any, b: any) => b.similitud - a.similitud);
    return scored.slice(0, 3);
  }

  private async checkCatalogSaturation(modelo: string, categoria: string): Promise<number> {
    const res = await this.dataSource.query(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE "categoriaRepuesto" = $1 AND LOWER(modelo) LIKE LOWER($2) AND activo = true;
    `, [categoria, `%${modelo}%`]);
    return Number(res[0]?.count) || 0;
  }

  private inferCategory(producto: string): string {
    const p = producto.toLowerCase();
    if (p.includes('farol') || p.includes('guiñador') || p.includes('stop')) return 'Iluminación';
    if (p.includes('radiador') || p.includes('condensador') || p.includes('tanque')) return 'Refrigeración';
    if (p.includes('jalador') || p.includes('manivela')) return 'Cerrajería';
    return 'Carrocería';
  }

  private inferTipoDesgaste(cat: string): string {
    if (cat === 'Iluminación') return 'desgaste_medio';
    if (cat === 'Refrigeración') return 'correctivo';
    if (cat === 'Cerrajería') return 'desgaste_frecuente';
    return 'colision';
  }

  private inferSegmentoParque(modelo: string): string {
    const m = (modelo || '').toLowerCase();
    if (m.includes('hilux') || m.includes('corolla') || m.includes('np300') || m.includes('frontier') || m.includes('rav4')) {
      return 'Alto';
    }
    if (m.includes('sentra') || m.includes('tiida') || m.includes('tucson') || m.includes('accent') || m.includes('l200')) {
      return 'Medio';
    }
    return 'Nicho';
  }
}

