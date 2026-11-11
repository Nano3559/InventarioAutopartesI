import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import * as ort from 'onnxruntime-node';
import { PredictSuccessDto } from './dto/predict-success.dto';
import { Product } from '../entities/product.entity';
import {
  calcularScorePonderado,
  normalizarMetadataCatalogo,
  validarFinanzas,
  validarSemantica,
} from './product-guardrails';

const CATEGORIAS_MODELO_POR_DEFECTO = [
  'Iluminación',
  'Refrigeración',
  'Cerrajería',
  'Carrocería',
] as const;
const DESGASTES_MODELO_POR_DEFECTO = [
  'colision',
  'desgaste_medio',
  'desgaste_frecuente',
  'correctivo',
] as const;
const SEGMENTOS_MODELO_POR_DEFECTO = ['Alto', 'Medio', 'Nicho'] as const;

interface QueryCountRow {
  stock?: string | number;
  total_vendido?: string | number;
  total_devuelto?: string | number;
  count?: string | number;
}

interface SimilarProductRow {
  id: number;
  producto: string;
  marca: string;
  modelo: string;
  fabricante: string | null;
  categoriaRepuesto: string;
  tipoDesgaste: string;
  costo: string | number;
  precio1: string | number;
  total_vendido: string | number;
  num_ventas: string | number;
}

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

export interface PredictionGuardrails {
  margenPorcentaje: number;
  margenRelativo: number;
  margenSalud: number;
  pvpMinimoSugerido: number;
  pvpRecomendado: number;
  errores: string[];
  advertencias: string[];
  coherenciaSemantica: {
    coherente: boolean;
    categoriaDeclarada: string | null;
    categoriaInferida: string | null;
    categoriaUsada: string;
    tipoDesgasteDeclarado: string | null;
    tipoDesgasteSugerido: string | null;
    tipoDesgasteUsado: string;
    segmentoUsado: string;
  };
}

export interface PredictionSuccessResponse {
  scoreExito: number;
  categoria: string;
  probabilidadExito: number;
  diasRotacionEstimados: number;
  loteSugeridoCompra: number;
  viabilidad: 'viable' | 'riesgo' | 'inviable';
  bloqueado: boolean;
  metricasProyectadas: {
    demandaMensualEstimada: number;
    gmroiProyectado: number;
    margenRelativo: number;
  };
  guardrails: PredictionGuardrails;
  alertas: {
    saturacionCatalogo: boolean;
    critica: boolean;
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
  private session: ort.InferenceSession | null = null;
  private metadata: Record<string, unknown> | null = null;

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async onModuleInit() {
    await this.initModel();
  }

  private async initModel() {
    try {
      const candidates = [
        path.resolve(process.cwd(), 'models', 'modelo_exito_autopartes.onnx'),
        path.resolve(
          process.cwd(),
          'backend',
          'models',
          'modelo_exito_autopartes.onnx',
        ),
        // Compatibilidad con la ubicación indicada por el notebook de entrenamiento.
        path.resolve(
          process.cwd(),
          'src',
          'models',
          'modelo_exito_autopartes.onnx',
        ),
        path.resolve(
          process.cwd(),
          'backend',
          'src',
          'models',
          'modelo_exito_autopartes.onnx',
        ),
        path.resolve(
          process.cwd(),
          'notebooks',
          'modelo_exito_autopartes.onnx',
        ),
        path.resolve(
          process.cwd(),
          '..',
          'notebooks',
          'modelo_exito_autopartes.onnx',
        ),
        // Rutas relativas al código compilado, al final para no tapar fixtures de tests.
        path.resolve(
          __dirname,
          '..',
          '..',
          'models',
          'modelo_exito_autopartes.onnx',
        ),
        path.resolve(__dirname, '..', 'models', 'modelo_exito_autopartes.onnx'),
      ];

      const modelPath = candidates.find((p) => fs.existsSync(p));
      if (!modelPath) {
        this.logger.warn(
          `Modelo ONNX no encontrado en: ${candidates.join(', ')}`,
        );
        return;
      }

      this.session = await ort.InferenceSession.create(modelPath);
      this.logger.log(`Modelo ONNX cargado exitosamente desde: ${modelPath}`);

      const metaPath = [
        modelPath.replace('.onnx', '.json'),
        path.join(path.dirname(modelPath), 'modelo_metadata.json'),
      ].find((candidate) => fs.existsSync(candidate));
      if (metaPath) {
        this.metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as Record<
          string,
          unknown
        >;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error al inicializar sesión ONNX: ${message}`);
    }
  }

  private leerDominioModelo(
    clave: string,
    porDefecto: readonly string[],
  ): readonly string[] {
    const valor: unknown = this.metadata?.[clave];
    if (Array.isArray(valor)) {
      const lista: string[] = valor.filter(
        (item: unknown): item is string => typeof item === 'string',
      );
      if (lista.length > 0) return lista;
    }
    return porDefecto;
  }

  async predictSuccess(
    dto: PredictSuccessDto,
  ): Promise<PredictionSuccessResponse> {
    const productoCatalogo =
      dto.productId === undefined
        ? null
        : await this.dataSource
            .getRepository(Product)
            .findOne({ where: { id: dto.productId, activo: true } });
    if (dto.productId !== undefined && !productoCatalogo) {
      throw new NotFoundException(
        'El repuesto seleccionado ya no está disponible en el catálogo.',
      );
    }
    if (productoCatalogo) {
      // Solo se normalizan metadatos reales que siguen intactos; el ID no exime una edición.
      const campos = [
        'producto',
        'marca',
        'modelo',
        'categoriaRepuesto',
        'tipoDesgaste',
        'segmentoParque',
      ] as const;
      if (
        campos.every(
          (campo) => (dto[campo] ?? '') === (productoCatalogo[campo] ?? ''),
        )
      ) {
        const metadata = normalizarMetadataCatalogo(productoCatalogo);
        dto = {
          ...dto,
          categoriaRepuesto: metadata.categoriaRepuesto ?? undefined,
          tipoDesgaste: metadata.tipoDesgaste ?? undefined,
          segmentoParque: metadata.segmentoParque ?? undefined,
        };
      }
    }
    const costo = Number(dto.costo);
    const precio1 = Number(dto.precio1);
    const precioMayor =
      dto.precioMayor == null ? undefined : Number(dto.precioMayor);

    const semantica = validarSemantica({
      producto: dto.producto,
      marca: dto.marca,
      modelo: dto.modelo,
      categoriaRepuesto: dto.categoriaRepuesto,
      tipoDesgaste: dto.tipoDesgaste,
      segmentoParque: dto.segmentoParque,
    });
    const finanzas = validarFinanzas({ costo, precio1, precioMayor });
    const errores = [...semantica.advertencias];
    const finanzasOriginales =
      productoCatalogo !== null &&
      costo === Number(productoCatalogo.costo) &&
      precio1 === Number(productoCatalogo.precio1) &&
      precioMayor ===
        (productoCatalogo.precioMayor == null
          ? undefined
          : Number(productoCatalogo.precioMayor)) &&
      [costo, precio1, precioMayor].every(
        (valor) => valor === undefined || (Number.isFinite(valor) && valor > 0),
      );
    if (finanzas.bloqueado && !finanzasOriginales) {
      errores.push(
        'Revise los costos y precios: deben ser positivos, los precios de venta deben superar al costo y el mayorista no debe superar al de mostrador.',
      );
    }
    if (
      [costo, precio1, precioMayor].some(
        (valor) => valor !== undefined && valor > 1_000_000,
      )
    ) {
      errores.push(
        'Los importes ingresados están fuera del rango admitido. Verifique los costos y precios.',
      );
    }
    if (dto.anio) {
      const partes = dto.anio.split('-').map(Number);
      const limite = new Date().getFullYear() + 1;
      if (
        !/^\d{4}(-\d{4})?$/.test(dto.anio) ||
        partes.some((anio) => anio < 1886 || anio > limite) ||
        (partes.length === 2 && partes[0] > partes[1])
      ) {
        errores.push(
          'El año o rango de años del vehículo es incoherente. Revise la información ingresada.',
        );
      }
    }
    if (errores.length > 0) {
      throw new BadRequestException({
        message:
          'Datos incoherentes: revise la información del repuesto y vuelva a introducir los datos para realizar el análisis.',
        errores,
      });
    }

    if (!this.session) {
      await this.initModel();
      if (!this.session) {
        throw new ServiceUnavailableException(
          'El modelo de análisis predictivo no está disponible en este servidor. Los datos ingresados son válidos; solicite al administrador que configure el modelo para obtener el análisis.',
        );
      }
    }

    const dominioCategorias = this.leerDominioModelo(
      'categorias_validas',
      CATEGORIAS_MODELO_POR_DEFECTO,
    );
    const dominioDesgastes = this.leerDominioModelo(
      'tipos_desgaste',
      DESGASTES_MODELO_POR_DEFECTO,
    );
    const dominioSegmentos = this.leerDominioModelo(
      'segmentos_parque',
      SEGMENTOS_MODELO_POR_DEFECTO,
    );

    const advertenciasModelo: string[] = [];
    if (!dominioCategorias.includes(semantica.categoriaUsada)) {
      advertenciasModelo.push(
        `La categoría «${semantica.categoriaUsada}» no fue parte del entrenamiento del modelo; la rotación estimada es menos precisa.`,
      );
    }
    if (!dominioDesgastes.includes(semantica.tipoDesgasteUsado)) {
      advertenciasModelo.push(
        `El tipo de desgaste «${semantica.tipoDesgasteUsado}» no fue parte del entrenamiento del modelo; la rotación estimada es menos precisa.`,
      );
    }
    if (!dominioSegmentos.includes(semantica.segmentoUsado)) {
      advertenciasModelo.push(
        `El segmento de parque «${semantica.segmentoUsado}» no fue parte del entrenamiento del modelo.`,
      );
    }

    const categoriaRepuesto = semantica.categoriaUsada;
    const tipoDesgaste = semantica.tipoDesgasteUsado;
    const segmentoParque = semantica.segmentoUsado;
    const margenRelativo = finanzas.margenRelativo;
    const ratioPrecioMayor =
      precioMayor !== undefined ? precioMayor / precio1 : 0.85;

    const feeds = {
      costo: new ort.Tensor('float32', Float32Array.from([costo]), [1, 1]),
      precio1: new ort.Tensor('float32', Float32Array.from([precio1]), [1, 1]),
      margen_relativo: new ort.Tensor(
        'float32',
        Float32Array.from([margenRelativo]),
        [1, 1],
      ),
      ratio_precio_mayor: new ort.Tensor(
        'float32',
        Float32Array.from([ratioPrecioMayor]),
        [1, 1],
      ),
      categoria_repuesto: new ort.Tensor('string', [categoriaRepuesto], [1, 1]),
      tipo_desgaste: new ort.Tensor('string', [tipoDesgaste], [1, 1]),
      segmento_parque: new ort.Tensor('string', [segmentoParque], [1, 1]),
    };

    const results = await this.session.run(feeds);
    const outputLabel = results.output_label;
    const predictedClass = Number(outputLabel?.data[0]);
    const probabilities = results.probabilities ?? results.output_probability;
    const classOrder = Array.isArray(this.metadata?.class_order)
      ? this.metadata.class_order.map(Number)
      : [0, 1, 2];
    const highIndex = classOrder.indexOf(2);
    const values = probabilities ? Array.from(probabilities.data, Number) : [];
    if (
      ![0, 1, 2].includes(predictedClass) ||
      highIndex < 0 ||
      values.length !== classOrder.length ||
      values.some(
        (value) => !Number.isFinite(value) || value < 0 || value > 1,
      ) ||
      Math.abs(values.reduce((sum, value) => sum + value, 0) - 1) > 0.001
    ) {
      throw new ServiceUnavailableException(
        'El modelo predictivo no proporciona probabilidades válidas. Solicite al administrador que revise la exportación del modelo.',
      );
    }
    const probabilidadAltaRotacion = values[highIndex];

    let categoria = 'Rotación Media';
    let scoreRotacion = 65.0;
    let diasRotacionEstimados = 55;
    let loteBase = 15;
    let demandaMensualEstimada = 14;

    if (predictedClass === 2) {
      categoria = 'Alta Rotación';
      scoreRotacion = 88.5;
      diasRotacionEstimados = 32;
      loteBase = 28;
      demandaMensualEstimada = 26;
    } else if (predictedClass === 0) {
      categoria = 'Baja Rotación / Riesgo';
      scoreRotacion = 32.0;
      diasRotacionEstimados = 110;
      loteBase = 5;
      demandaMensualEstimada = 4;
    }

    const similares = await this.findSimilarProducts(
      dto,
      categoriaRepuesto,
      margenRelativo,
    );
    const saturacion = await this.checkCatalogSaturation(
      dto.modelo,
      categoriaRepuesto,
    );

    const { score: scorePonderado } = calcularScorePonderado({
      scoreRotacion,
      saludMargen: finanzas.margenSalud,
      saturacionCatalogo: saturacion,
    });

    const bloqueado = finanzas.bloqueado;
    let scoreExito = scorePonderado;
    if (bloqueado) {
      scoreExito = 0;
    } else if (finanzas.margenPorcentaje < 15) {
      scoreExito = Math.min(scoreExito, 45);
    }
    if (!semantica.coherente && !bloqueado) {
      scoreExito = Math.max(0, scoreExito - 5);
    }
    scoreExito = Math.round(scoreExito * 10) / 10;

    let loteSugeridoCompra = loteBase;
    if (bloqueado) {
      loteSugeridoCompra = 0;
    } else {
      const factorSaturacion = Math.max(0.2, 1 - saturacion * 0.15);
      loteSugeridoCompra = Math.max(1, Math.round(loteBase * factorSaturacion));
      if (finanzas.margenPorcentaje < 15) {
        loteSugeridoCompra = Math.min(loteSugeridoCompra, 3);
      }
    }

    if (bloqueado) {
      categoria = 'Inviable comercialmente';
    } else if (finanzas.margenPorcentaje < 15) {
      categoria = `${categoria} · margen crítico`;
    }

    const gmroiProyectado = bloqueado
      ? 0
      : Math.round(margenRelativo * (365 / diasRotacionEstimados) * 100) / 100;

    let mensaje = 'Estimación balanceada de rotación.';
    if (bloqueado) {
      mensaje = finanzas.errores[0];
    } else if (finanzas.margenPorcentaje < 15) {
      mensaje = `Margen insuficiente (${finanzas.margenPorcentaje.toFixed(1)}%). PVP mínimo sugerido: Bs. ${finanzas.pvpMinimoSugerido.toFixed(2)}.`;
    } else if (saturacion > 3) {
      mensaje = `Catálogo saturado: ya existen ${saturacion} repuestos similares activos. Se redujo el lote sugerido.`;
    } else if (!semantica.coherente) {
      mensaje = semantica.advertencias[0];
    } else if (advertenciasModelo.length > 0) {
      mensaje = advertenciasModelo[0];
    } else if (predictedClass === 2) {
      mensaje =
        'Excelente balance de margen y alta demanda en parque vehicular.';
    } else if (predictedClass === 0) {
      mensaje =
        'Atención: baja rotación histórica en repuestos de este tipo o segmento de nicho. Se sugiere comprar bajo pedido.';
    }

    let viabilidad: 'viable' | 'riesgo' | 'inviable' = 'viable';
    if (bloqueado) {
      viabilidad = 'inviable';
    } else if (
      finanzas.margenPorcentaje < 15 ||
      saturacion > 3 ||
      !semantica.coherente ||
      advertenciasModelo.length > 0 ||
      scoreExito < 50
    ) {
      viabilidad = 'riesgo';
    }

    return {
      scoreExito,
      categoria,
      probabilidadExito: Math.round(probabilidadAltaRotacion * 10_000) / 10_000,
      diasRotacionEstimados,
      loteSugeridoCompra,
      viabilidad,
      bloqueado,
      metricasProyectadas: {
        demandaMensualEstimada,
        gmroiProyectado,
        margenRelativo: Math.round(margenRelativo * 100) / 100,
      },
      guardrails: {
        margenPorcentaje: finanzas.margenPorcentaje,
        margenRelativo: finanzas.margenRelativo,
        margenSalud: finanzas.margenSalud,
        pvpMinimoSugerido: finanzas.pvpMinimoSugerido,
        pvpRecomendado: finanzas.pvpRecomendado,
        errores: finanzas.errores,
        advertencias: [...finanzas.advertencias, ...advertenciasModelo],
        coherenciaSemantica: {
          coherente: semantica.coherente,
          categoriaDeclarada: semantica.categoriaDeclarada,
          categoriaInferida: semantica.categoriaInferida,
          categoriaUsada: semantica.categoriaUsada,
          tipoDesgasteDeclarado: semantica.tipoDesgasteDeclarado,
          tipoDesgasteSugerido: semantica.tipoDesgasteSugerido,
          tipoDesgasteUsado: semantica.tipoDesgasteUsado,
          segmentoUsado: semantica.segmentoUsado,
        },
      },
      alertas: {
        saturacionCatalogo: saturacion > 3,
        critica: bloqueado,
        mensaje,
      },
      productosSimilares: similares,
    };
  }

  async getDemandSummary(
    productId: number,
    locationId?: number,
  ): Promise<DemandSummaryResponse> {
    const prod = await this.dataSource
      .getRepository(Product)
      .findOne({ where: { id: productId } });
    if (!prod) {
      throw new NotFoundException(`Producto con ID ${productId} no encontrado`);
    }

    let stockQuery = `SELECT COALESCE(SUM(cantidad), 0) as stock FROM inventory WHERE "productId" = $1`;
    const stockParams: number[] = [productId];
    if (locationId) {
      stockQuery += ` AND "locationId" = $2`;
      stockParams.push(locationId);
    }
    const stockRes = await this.dataSource.query<QueryCountRow[]>(
      stockQuery,
      stockParams,
    );
    const stockActual = Number(stockRes[0]?.stock) || 0;

    let salesQuery = `
      SELECT COALESCE(SUM(si.cantidad), 0) as total_vendido
      FROM sale_items si
      JOIN sales s ON s.id = si."saleId"
      WHERE si."productId" = $1 AND s.fecha >= NOW() - INTERVAL '30 days'
    `;
    const salesParams: number[] = [productId];
    if (locationId) {
      salesQuery += ` AND s."locationId" = $2`;
      salesParams.push(locationId);
    }
    const salesRes = await this.dataSource.query<QueryCountRow[]>(
      salesQuery,
      salesParams,
    );
    const ventasUltimos30Dias = Number(salesRes[0]?.total_vendido) || 0;

    const devRes = await this.dataSource.query<QueryCountRow[]>(
      `
      SELECT COALESCE(SUM(cantidad), 0) as total_devuelto
      FROM devoluciones
      WHERE "productId" = $1 AND fecha >= NOW() - INTERVAL '30 days'
    `,
      [productId],
    );
    const devolucionesUltimos30Dias = Number(devRes[0]?.total_devuelto) || 0;

    const demandaDiaria = Math.round((ventasUltimos30Dias / 30) * 100) / 100;
    const diasParaAgotamiento =
      demandaDiaria > 0 ? Math.round(stockActual / demandaDiaria) : 999;

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
      alertaReabastecimiento:
        stockActual <= prod.stockMinimo || diasParaAgotamiento < 15,
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
    const rawProds = await this.dataSource.query<SimilarProductRow[]>(`
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

    const scored = rawProds.map((p) => {
      let sim = 0.2;
      if (p.categoriaRepuesto === categoria) sim += 0.35;
      if (p.modelo?.toLowerCase().includes(dto.modelo?.toLowerCase()))
        sim += 0.25;
      if (p.marca?.toLowerCase().includes(dto.marca?.toLowerCase()))
        sim += 0.15;

      const costo = Number(p.costo) || 1;
      const precio1 = Number(p.precio1) || costo * 1.3;
      const pMargen = (precio1 - costo) / costo;
      const diffMargen = Math.abs(pMargen - margen);
      sim += Math.max(0, 0.05 * (1 - diffMargen));

      const ventasMes = Math.round((Number(p.total_vendido) / 3) * 10) / 10;
      const gmroi = Math.round(((pMargen * (ventasMes * 12)) / 10) * 100) / 100;

      return {
        id: p.id,
        producto: p.producto,
        marca: p.marca,
        modelo: p.modelo,
        fabricante: p.fabricante ?? '',
        similitud: Math.min(0.99, Math.round(sim * 100) / 100),
        ventasMensualesNetas: Math.max(1, ventasMes),
        gmroiReal: Math.max(0.5, gmroi),
      };
    });

    scored.sort((a, b) => b.similitud - a.similitud);
    return scored.slice(0, 3);
  }

  private async checkCatalogSaturation(
    modelo: string,
    categoria: string,
  ): Promise<number> {
    const res = await this.dataSource.query<QueryCountRow[]>(
      `
      SELECT COUNT(*) as count 
      FROM products 
      WHERE "categoriaRepuesto" = $1 AND LOWER(modelo) LIKE LOWER($2) AND activo = true;
    `,
      [categoria, `%${modelo}%`],
    );
    return Number(res[0]?.count) || 0;
  }
}
