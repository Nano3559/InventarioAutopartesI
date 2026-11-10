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
  evaluateDemandGuardrails,
  inferTaxonomyFromPart,
  inferVehicleKnowledge,
  normalizeText,
  type GuardrailEvaluation,
  type GuardrailIssue,
  type ParqueSegment,
  type WearType,
} from './demand-guardrails';

export interface SimilarProductResult {
  id: number;
  producto: string;
  marca: string;
  modelo: string;
  fabricante: string;
  similitud: number;
  ventasMensualesNetas: number;
  gmroiReal: number;
  precio1?: number;
}

export type PurchaseAction =
  | 'COMPRAR_LOTE'
  | 'COMPRA_MODERADA'
  | 'BAJO_PEDIDO'
  | 'AJUSTAR_PRECIO'
  | 'NO_IMPORTAR';

export interface PredictionSuccessResponse {
  scoreExito: number;
  categoria: string;
  probabilidadExito: number;
  diasRotacionEstimados: number;
  loteSugeridoCompra: number;
  bloqueadoFinanciero: boolean;
  desgloseScore: {
    factorRotacionIA: number;
    saludMargen: number;
    saludCatalogo: number;
    penalizacionRiesgo: number;
  };
  metricasProyectadas: {
    demandaMensualEstimada: number;
    gmroiProyectado: number;
    margenRelativo: number;
    margenPorcentaje: number;
    utilidadUnitaria: number;
    inversionLoteEstimada: number;
    gananciaProyectadaLote: number;
  };
  recomendacionCompra: {
    accion: PurchaseAction;
    titulo: string;
    pvpMinimoRentable: number;
    pvpRecomendado: number;
    precioMayorSugerido: number;
  };
  alertas: {
    saturacionCatalogo: boolean;
    cantidadCompetidoresCatalogo: number;
    nivelAlerta: 'critica' | 'advertencia' | 'saludable';
    mensaje: string;
    advertencias: GuardrailIssue[];
  };
  productosSimilares: SimilarProductResult[];
}

export interface DemandSummaryResponse {
  productoId: number;
  productId: number;
  producto: string;
  marca: string;
  modelo: string;
  stockTotal: number;
  stockActual: number;
  stockMinimo: number;
  categoriaRepuesto: string;
  tipoDesgaste: string;
  segmentoParque: string;
  totalVendidoHistorico: number;
  ventasUltimos30Dias: number;
  ventasUltimos90Dias: number;
  ventasPromedioMensual: number;
  devolucionesUltimos30Dias: number;
  diasAgotamientoEstimados: number;
  diasParaAgotamiento: number;
  rotacionClasificacion: string;
  estadoRotacion: string;
  tasaDevolucionPorcentaje: number;
  alertaStock: string;
  alertaReabastecimiento: boolean;
  demandaDiaria: number;
  nivelRiesgo: 'critico' | 'atencion' | 'bajo';
}

interface OnnxClassProbabilities {
  p0: number;
  p1: number;
  p2: number;
  fromModelProbabilities: boolean;
}

interface RawStockRow {
  stock: string | number;
}

interface RawSalesAggRow {
  sold_30: string | number;
  sold_90: string | number;
  sold_total: string | number;
}

interface RawDevAggRow {
  dev_30: string | number;
  dev_total: string | number;
}

interface RawCountRow {
  count: string | number;
}

interface RawSimilarProductRow {
  id: string | number;
  producto: string;
  marca: string;
  modelo: string;
  fabricante: string;
  categoriaRepuesto: string | null;
  tipoDesgaste: string | null;
  costo: string | number;
  precio1: string | number | null;
  total_vendido: string | number;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function roundTwo(val: number): number {
  return Math.round(val * 100) / 100;
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
          __dirname,
          '..',
          '..',
          'models',
          'modelo_exito_autopartes.onnx',
        ),
        path.resolve(
          __dirname,
          '..',
          '..',
          'src',
          'models',
          'modelo_exito_autopartes.onnx',
        ),
        path.resolve(
          process.cwd(),
          'backend',
          'models',
          'modelo_exito_autopartes.onnx',
        ),
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

      const metaPath = modelPath.replace('.onnx', '.json');
      if (fs.existsSync(metaPath)) {
        this.metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as Record<
          string,
          unknown
        >;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error al inicializar sesión ONNX: ${msg}`);
    }
  }

  async predictSuccess(
    dto: PredictSuccessDto,
  ): Promise<PredictionSuccessResponse> {
    const guardrails = evaluateDemandGuardrails(dto);

    // Bloqueo estricto ante incoherencia semántica o datos numéricos inválidos
    if (guardrails.hasBlockers) {
      throw new BadRequestException({
        statusCode: 400,
        blocked: true,
        error: 'Incoherencia en los campos de evaluación',
        message: guardrails.blockers.map((b) => b.message).join(' | '),
        blockers: guardrails.blockers,
        warnings: guardrails.warnings,
        suggestions: guardrails.suggestions,
      });
    }

    const costo = Number(dto.costo);
    const precio1 = Number(dto.precio1);
    const hasPrecioMayor =
      dto.precioMayor !== undefined &&
      dto.precioMayor !== null &&
      Number(dto.precioMayor) > 0;
    const precioMayor = hasPrecioMayor
      ? Number(dto.precioMayor)
      : roundTwo(precio1 * 0.85);

    const categoriaRepuesto = guardrails.resolvedCategoria;
    const tipoDesgaste = guardrails.resolvedWear;
    const segmentoParque = guardrails.resolvedParque;
    const margenRelativo = guardrails.financial.margenRelativo;
    const ratioPrecioMayor = precio1 > 0 ? precioMayor / precio1 : 0.85;

    const [similares, saturacion] = await Promise.all([
      this.findSimilarProducts(dto, categoriaRepuesto, margenRelativo),
      this.checkCatalogSaturation(dto.producto, dto.modelo, categoriaRepuesto),
    ]);

    const advertencias: GuardrailIssue[] = [
      ...guardrails.warnings,
      ...guardrails.infos,
    ];
    if (saturacion > 3) {
      advertencias.push({
        code: 'CATALOG_SATURATION',
        field: 'general',
        severity: 'warning',
        message: `Saturación de catálogo: ya existen ${saturacion} repuestos activos similares en "${categoriaRepuesto}" para "${dto.modelo}". Importar más puede canibalizar ventas.`,
        suggestion:
          'Reducir el lote inicial al 50% o diferenciar por marca/precio.',
      });
    }

    // Guardrail Financiero Inquebrantable: Venta a pérdida o margen cero
    if (guardrails.financial.bloqueadoFinanciero) {
      const perdida = roundTwo(costo - precio1);
      const isZero = precio1 === costo;
      const mensajeInviable = isZero
        ? `INVIABLE: El precio mostrador (Bs. ${roundTwo(precio1)}) es igual al costo (Bs. ${roundTwo(costo)}). Con margen 0% no cubres fletes ni gastos operativos. PVP mínimo recomendado: Bs. ${guardrails.financial.pvpMinimoRentable} (+15%) o Bs. ${guardrails.financial.pvpRecomendado} (+35%).`
        : `INVIABLE FINANCIERAMENTE: Pierdes Bs. ${perdida} por cada unidad vendida (Costo Bs. ${roundTwo(costo)} vs. PVP Bs. ${roundTwo(precio1)}). Lote sugerido: 0 unidades. Fija un PVP mínimo de Bs. ${guardrails.financial.pvpMinimoRentable} (recomendado Bs. ${guardrails.financial.pvpRecomendado}).`;

      return {
        scoreExito: 0,
        categoria: isZero
          ? 'INVIABLE — Margen Nulo (0%)'
          : 'INVIABLE — Venta a Pérdida',
        probabilidadExito: 0,
        diasRotacionEstimados: 0,
        loteSugeridoCompra: 0,
        bloqueadoFinanciero: true,
        desgloseScore: {
          factorRotacionIA: 0,
          saludMargen: 0,
          saludCatalogo: this.scoreCatalogHealth(saturacion),
          penalizacionRiesgo: 100,
        },
        metricasProyectadas: {
          demandaMensualEstimada: 0,
          gmroiProyectado: roundTwo(margenRelativo * 12),
          margenRelativo: roundTwo(margenRelativo),
          margenPorcentaje: guardrails.financial.margenPorcentaje,
          utilidadUnitaria: guardrails.financial.utilidadUnitaria,
          inversionLoteEstimada: 0,
          gananciaProyectadaLote: 0,
        },
        recomendacionCompra: {
          accion: 'NO_IMPORTAR',
          titulo: isZero
            ? 'Compra bloqueada: sube el precio de venta para obtener rentabilidad positiva'
            : `Compra bloqueada: venta a pérdida de Bs. ${perdida} por unidad`,
          pvpMinimoRentable: guardrails.financial.pvpMinimoRentable,
          pvpRecomendado: guardrails.financial.pvpRecomendado,
          precioMayorSugerido: guardrails.financial.precioMayorSugerido,
        },
        alertas: {
          saturacionCatalogo: saturacion > 3,
          cantidadCompetidoresCatalogo: saturacion,
          nivelAlerta: 'critica',
          mensaje: mensajeInviable,
          advertencias,
        },
        productosSimilares: similares,
      };
    }

    // Inferencia ONNX real
    if (!this.session) {
      await this.initModel();
      if (!this.session) {
        throw new ServiceUnavailableException(
          'El modelo de predicción ONNX no está disponible en el servidor.',
        );
      }
    }

    const feeds: Record<string, ort.Tensor> = {
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

    const { predictedClass, probabilities } = await this.runOnnxInference(
      feeds,
      this.session,
    );

    const factorRotacionIA = this.computeRotationFactor(
      predictedClass,
      probabilities,
      tipoDesgaste,
      segmentoParque,
      guardrails,
    );
    const saludMargen = guardrails.financial.saludMargen;
    const saludCatalogo = this.scoreCatalogHealth(saturacion);

    const nonFinancialWarnings = guardrails.warnings.filter(
      (w) => w.field !== 'precio1' && w.field !== 'precioMayor',
    );
    const penalizacionRiesgo = nonFinancialWarnings.length * 6;

    let scoreWeighted =
      factorRotacionIA * 0.4 +
      saludMargen * 0.4 +
      saludCatalogo * 0.2 -
      penalizacionRiesgo;

    // Topes duros de negocio según rentabilidad y riesgos
    if (guardrails.financial.status === 'insufficient') {
      scoreWeighted = Math.min(scoreWeighted, 38);
    } else if (guardrails.financial.status === 'overpriced') {
      scoreWeighted = Math.min(scoreWeighted, 54);
    }
    if (guardrails.financial.wholesaleLoss) {
      scoreWeighted = Math.min(scoreWeighted, 58);
    }

    const scoreExito = Math.round(clamp(scoreWeighted, 0, 98) * 10) / 10;
    const probabilidadExito = roundTwo(scoreExito / 100);

    const demandaMensualEstimada = this.estimateMonthlyDemand(
      factorRotacionIA,
      segmentoParque,
      tipoDesgaste,
      saturacion,
      margenRelativo,
    );

    const loteSugeridoCompra = this.computeSuggestedLot(
      scoreExito,
      demandaMensualEstimada,
      costo,
      saturacion,
      guardrails,
    );

    const diasRotacionEstimados = Math.max(
      7,
      Math.round(
        loteSugeridoCompra / Math.max(0.08, demandaMensualEstimada / 30),
      ),
    );
    const gmroiProyectado = roundTwo(
      margenRelativo * (365 / diasRotacionEstimados),
    );
    const inversionLoteEstimada = roundTwo(loteSugeridoCompra * costo);
    const gananciaProyectadaLote = roundTwo(
      loteSugeridoCompra * guardrails.financial.utilidadUnitaria,
    );

    const { categoria, accion, nivelAlerta, titulo, mensaje } =
      this.buildVerdict(scoreExito, saturacion, guardrails, loteSugeridoCompra);

    return {
      scoreExito,
      categoria,
      probabilidadExito,
      diasRotacionEstimados,
      loteSugeridoCompra,
      bloqueadoFinanciero: false,
      desgloseScore: {
        factorRotacionIA: Math.round(factorRotacionIA),
        saludMargen,
        saludCatalogo,
        penalizacionRiesgo,
      },
      metricasProyectadas: {
        demandaMensualEstimada,
        gmroiProyectado,
        margenRelativo: roundTwo(margenRelativo),
        margenPorcentaje: guardrails.financial.margenPorcentaje,
        utilidadUnitaria: guardrails.financial.utilidadUnitaria,
        inversionLoteEstimada,
        gananciaProyectadaLote,
      },
      recomendacionCompra: {
        accion,
        titulo,
        pvpMinimoRentable: guardrails.financial.pvpMinimoRentable,
        pvpRecomendado: guardrails.financial.pvpRecomendado,
        precioMayorSugerido: guardrails.financial.precioMayorSugerido,
      },
      alertas: {
        saturacionCatalogo: saturacion > 3,
        cantidadCompetidoresCatalogo: saturacion,
        nivelAlerta,
        mensaje,
        advertencias,
      },
      productosSimilares: similares,
    };
  }

  private async runOnnxInference(
    feeds: ort.InferenceSession.OnnxValueMapType,
    session: ort.InferenceSession,
  ): Promise<{
    predictedClass: number;
    probabilities: OnnxClassProbabilities;
  }> {
    try {
      const results = await session.run(feeds, [
        'output_label',
        'output_probability',
      ]);
      const labelData = results.output_label?.data as
        ArrayLike<number | bigint> | undefined;
      const predictedClass = Number(labelData?.[0] ?? 1);
      const parsedProbs = this.extractProbabilities(
        results.output_probability,
        predictedClass,
      );
      return { predictedClass, probabilities: parsedProbs };
    } catch {
      // skl2onnx con zipmap=True puede emitir Seq<Map> incompatible en algunas versiones de onnxruntime-node
      const fallbackRes = await session.run(feeds, ['output_label']);
      const labelData = fallbackRes.output_label?.data as
        ArrayLike<number | bigint> | undefined;
      const predictedClass = Number(labelData?.[0] ?? 1);
      return {
        predictedClass,
        probabilities: this.defaultProbabilitiesFromClass(predictedClass),
      };
    }
  }

  private extractProbabilities(
    probOutput: unknown,
    predictedClass: number,
  ): OnnxClassProbabilities {
    if (!probOutput) {
      return this.defaultProbabilitiesFromClass(predictedClass);
    }

    // Caso Tensor plano [p0, p1, p2]
    if (
      typeof probOutput === 'object' &&
      'data' in probOutput &&
      probOutput.data &&
      typeof (probOutput.data as ArrayLike<number>).length === 'number' &&
      (probOutput.data as ArrayLike<number>).length >= 3
    ) {
      const arr = probOutput.data as ArrayLike<number>;
      return {
        p0: Number(arr[0]) || 0,
        p1: Number(arr[1]) || 0,
        p2: Number(arr[2]) || 0,
        fromModelProbabilities: true,
      };
    }

    // Caso Seq<Map> [{ '0': p0, '1': p1, '2': p2 }] o [Map]
    const first: unknown = Array.isArray(probOutput)
      ? probOutput[0]
      : undefined;
    if (first instanceof Map) {
      return {
        p0: Number(first.get(0) ?? first.get('0') ?? 0),
        p1: Number(first.get(1) ?? first.get('1') ?? 0),
        p2: Number(first.get(2) ?? first.get('2') ?? 0),
        fromModelProbabilities: true,
      };
    }
    if (first && typeof first === 'object') {
      const rec = first as Record<string, unknown>;
      return {
        p0: Number(rec[0] ?? rec['0'] ?? 0),
        p1: Number(rec[1] ?? rec['1'] ?? 0),
        p2: Number(rec[2] ?? rec['2'] ?? 0),
        fromModelProbabilities: true,
      };
    }

    return this.defaultProbabilitiesFromClass(predictedClass);
  }

  private defaultProbabilitiesFromClass(
    predictedClass: number,
  ): OnnxClassProbabilities {
    if (predictedClass === 2) {
      return { p0: 0.08, p1: 0.22, p2: 0.7, fromModelProbabilities: false };
    }
    if (predictedClass === 0) {
      return { p0: 0.7, p1: 0.22, p2: 0.08, fromModelProbabilities: false };
    }
    return { p0: 0.18, p1: 0.62, p2: 0.2, fromModelProbabilities: false };
  }

  private computeRotationFactor(
    predictedClass: number,
    probs: OnnxClassProbabilities,
    wear: WearType,
    parque: ParqueSegment,
    guardrails: GuardrailEvaluation,
  ): number {
    let base = probs.fromModelProbabilities
      ? probs.p2 * 96 + probs.p1 * 58 + probs.p0 * 20
      : predictedClass === 2
        ? 84
        : predictedClass === 0
          ? 24
          : 56;

    const wearDelta: Record<WearType, number> = {
      desgaste_frecuente: 7,
      desgaste_medio: 2,
      correctivo: -2,
      colision: -4,
    };

    const parqueDelta: Record<ParqueSegment, number> = {
      Alto: 6,
      Medio: 0,
      Nicho: -8,
    };

    if (guardrails.isExtendedCategory) {
      const priorBase =
        50 +
        (parque === 'Alto' ? 22 : parque === 'Medio' ? 5 : -18) +
        (wear === 'desgaste_frecuente'
          ? 16
          : wear === 'desgaste_medio'
            ? 8
            : wear === 'correctivo'
              ? 0
              : -6);
      base = base * 0.45 + priorBase * 0.55;
    } else {
      base += wearDelta[wear] + parqueDelta[parque];
    }

    if (guardrails.financial.margenRelativo > 1.5) {
      base -= Math.min(35, (guardrails.financial.margenRelativo - 1.5) * 18);
    }

    return clamp(base, 10, 98);
  }

  private scoreCatalogHealth(competitorCount: number): number {
    if (competitorCount <= 0) return 100;
    if (competitorCount === 1) return 90;
    if (competitorCount === 2) return 78;
    if (competitorCount === 3) return 64;
    return Math.max(15, 52 - (competitorCount - 3) * 12);
  }

  private estimateMonthlyDemand(
    factorRotacionIA: number,
    parque: ParqueSegment,
    wear: WearType,
    saturacion: number,
    margenRelativo: number,
  ): number {
    const parqueMult =
      parque === 'Alto' ? 1.15 : parque === 'Medio' ? 0.92 : 0.62;
    const wearMult =
      wear === 'desgaste_frecuente'
        ? 1.15
        : wear === 'desgaste_medio'
          ? 1.0
          : wear === 'correctivo'
            ? 0.88
            : 0.8;
    const satMult = saturacion > 3 ? 0.65 : saturacion >= 2 ? 0.88 : 1.0;
    const priceMult =
      margenRelativo > 1.5
        ? Math.max(0.35, 1 - (margenRelativo - 1.5) * 0.25)
        : 1.0;

    const raw =
      (factorRotacionIA / 100) *
      26 *
      parqueMult *
      wearMult *
      satMult *
      priceMult;
    return Math.round(clamp(raw, 2, 38));
  }

  private computeSuggestedLot(
    scoreExito: number,
    demandaMensual: number,
    costo: number,
    saturacion: number,
    guardrails: GuardrailEvaluation,
  ): number {
    const coverageMonths =
      scoreExito >= 75 ? 1.15 : scoreExito >= 52 ? 0.85 : 0.45;
    let lote = Math.round(demandaMensual * coverageMonths);

    if (costo >= 1000) {
      lote = Math.min(lote, scoreExito >= 75 ? 8 : 4);
    } else if (costo >= 500) {
      lote = Math.min(lote, scoreExito >= 75 ? 16 : 8);
    }

    if (saturacion > 3) {
      lote = Math.max(3, Math.round(lote * 0.55));
    }
    if (guardrails.financial.status === 'insufficient') {
      lote = Math.min(lote, 4);
    } else if (guardrails.financial.status === 'overpriced') {
      lote = Math.min(lote, 5);
    }

    return Math.max(2, lote);
  }

  private buildVerdict(
    scoreExito: number,
    saturacion: number,
    guardrails: GuardrailEvaluation,
    loteSugerido: number,
  ): {
    categoria: string;
    accion: PurchaseAction;
    nivelAlerta: 'critica' | 'advertencia' | 'saludable';
    titulo: string;
    mensaje: string;
  } {
    if (guardrails.financial.status === 'insufficient') {
      return {
        categoria: 'Margen Insuficiente / Riesgo Financiero',
        accion: 'AJUSTAR_PRECIO',
        nivelAlerta: 'critica',
        titulo: `No comprar aún: sube el PVP al menos a Bs. ${guardrails.financial.pvpMinimoRentable}`,
        mensaje: `Aunque exista movimiento de mercado, el margen de ${guardrails.financial.margenPorcentaje}% no cubre fletes ni costos operativos. Recomendamos fijar PVP en Bs. ${guardrails.financial.pvpRecomendado} antes de importar.`,
      };
    }

    if (guardrails.financial.status === 'overpriced') {
      return {
        categoria: 'Sobreprecio / Riesgo de Estancamiento',
        accion: 'AJUSTAR_PRECIO',
        nivelAlerta: 'advertencia',
        titulo: `Ajustar PVP a rango competitivo (ideal ~Bs. ${guardrails.financial.pvpRecomendado})`,
        mensaje: `El margen de ${guardrails.financial.margenPorcentaje}% está muy por encima del estándar del rubro. Reducir el PVP hacia Bs. ${guardrails.financial.pvpRecomendado} mejorará la velocidad de salida.`,
      };
    }

    if (scoreExito >= 75) {
      return {
        categoria: 'Viabilidad Alta / Compra Recomendada',
        accion: 'COMPRAR_LOTE',
        nivelAlerta: saturacion > 3 ? 'advertencia' : 'saludable',
        titulo: `Compra recomendada (${loteSugerido} uds. para ~1 mes de cobertura)`,
        mensaje:
          saturacion > 3
            ? `Buen margen y parque demandante, pero existen ${saturacion} competidores similares en catálogo. Lote ajustado a ${loteSugerido} uds.`
            : 'Excelente equilibrio entre demanda del parque vehicular, rentabilidad financiera y baja saturación en catálogo.',
      };
    }

    if (scoreExito >= 52) {
      return {
        categoria: 'Viabilidad Media / Compra Moderada',
        accion: 'COMPRA_MODERADA',
        nivelAlerta: 'advertencia',
        titulo: `Compra moderada (${loteSugerido} uds.) con seguimiento de precios`,
        mensaje: guardrails.financial.wholesaleLoss
          ? `Rotación aceptable, pero el precio mayorista actual genera pérdida. Ajusta mayorista a Bs. ${guardrails.financial.precioMayorSugerido} antes de vender a talleres.`
          : 'Balance moderado entre rotación y rentabilidad. Conviene iniciar con lote controlado y medir salida en los primeros 30 días.',
      };
    }

    return {
      categoria: 'Baja Rotación / Alto Riesgo',
      accion: 'BAJO_PEDIDO',
      nivelAlerta: 'critica',
      titulo: `Alto riesgo de inmovilización: comprar solo bajo pedido (${loteSugerido} uds. máx.)`,
      mensaje:
        'Baja rotación proyectada para este segmento vehicular o alta competencia interna. Se sugiere adquirir solo bajo pedido confirmado.',
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
    const stockParams: unknown[] = [productId];
    if (locationId) {
      stockQuery += ` AND "locationId" = $2`;
      stockParams.push(locationId);
    }

    let salesQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN s.fecha >= NOW() - INTERVAL '30 days' THEN si.cantidad ELSE 0 END), 0) as sold_30,
        COALESCE(SUM(CASE WHEN s.fecha >= NOW() - INTERVAL '90 days' THEN si.cantidad ELSE 0 END), 0) as sold_90,
        COALESCE(SUM(si.cantidad), 0) as sold_total
      FROM sale_items si
      JOIN sales s ON s.id = si."saleId"
      WHERE si."productId" = $1
    `;
    const salesParams: unknown[] = [productId];
    if (locationId) {
      salesQuery += ` AND s."locationId" = $2`;
      salesParams.push(locationId);
    }

    let devQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN fecha >= NOW() - INTERVAL '30 days' THEN cantidad ELSE 0 END), 0) as dev_30,
        COALESCE(SUM(cantidad), 0) as dev_total
      FROM devoluciones
      WHERE "productId" = $1
    `;
    const devParams: unknown[] = [productId];
    if (locationId) {
      devQuery += ` AND "locationId" = $2`;
      devParams.push(locationId);
    }

    const [stockRes, salesRes, devRes] = await Promise.all([
      this.dataSource.query<RawStockRow[]>(stockQuery, stockParams),
      this.dataSource.query<RawSalesAggRow[]>(salesQuery, salesParams),
      this.dataSource.query<RawDevAggRow[]>(devQuery, devParams),
    ]);

    const stockActual = Number(stockRes[0]?.stock) || 0;
    const ventasUltimos30Dias = Number(salesRes[0]?.sold_30) || 0;
    const ventasUltimos90Dias = Number(salesRes[0]?.sold_90) || 0;
    const totalVendidoHistorico = Number(salesRes[0]?.sold_total) || 0;
    const devolucionesUltimos30Dias = Number(devRes[0]?.dev_30) || 0;
    const totalDevueltoHistorico = Number(devRes[0]?.dev_total) || 0;

    const tasaDevolucionPorcentaje =
      totalVendidoHistorico > 0
        ? Math.round((totalDevueltoHistorico / totalVendidoHistorico) * 1000) /
          10
        : 0;

    const ventasPromedioMensual =
      ventasUltimos90Dias > 0
        ? Math.round((ventasUltimos90Dias / 3) * 10) / 10
        : ventasUltimos30Dias;
    const demandaDiaria =
      ventasUltimos90Dias > 0
        ? roundTwo(ventasUltimos90Dias / 90)
        : roundTwo(ventasUltimos30Dias / 30);

    const diasParaAgotamiento =
      demandaDiaria > 0 ? Math.round(stockActual / demandaDiaria) : 999;

    let estadoRotacion = 'Rotación Media';
    if (demandaDiaria >= 0.45) estadoRotacion = 'Alta Rotación';
    else if (demandaDiaria <= 0.15) estadoRotacion = 'Baja Rotación';

    let nivelRiesgo: 'critico' | 'atencion' | 'bajo' = 'bajo';
    let alertaStock = `Stock saludable: cobertura aproximada de ${diasParaAgotamiento > 900 ? '+3 años' : `${diasParaAgotamiento} días`}.`;

    if (stockActual <= 0) {
      nivelRiesgo = 'critico';
      alertaStock = 'Sin stock disponible: requiere reposición inmediata.';
    } else if (stockActual <= prod.stockMinimo || diasParaAgotamiento < 15) {
      nivelRiesgo = 'critico';
      alertaStock = `Quiebre inminente: el stock (${stockActual} uds.) cubre aprox. ${diasParaAgotamiento} días.`;
    } else if (tasaDevolucionPorcentaje > 5) {
      nivelRiesgo = 'atencion';
      alertaStock = `Atención en calidad: tasa de devolución del ${tasaDevolucionPorcentaje}% superando el umbral del 5%.`;
    } else if (diasParaAgotamiento < 35) {
      nivelRiesgo = 'atencion';
      alertaStock = `Planificar reabastecimiento: cobertura estimada para ${diasParaAgotamiento} días.`;
    }

    const inferredTax = inferTaxonomyFromPart(prod.producto);
    const inferredVehicle = inferVehicleKnowledge(prod.marca, prod.modelo);

    const categoriaRepuesto =
      prod.categoriaRepuesto && prod.categoriaRepuesto !== 'General'
        ? prod.categoriaRepuesto
        : inferredTax.categoria;
    const tipoDesgaste = prod.tipoDesgaste || inferredTax.defaultWear;
    const segmentoParque =
      prod.segmentoParque || inferredVehicle.expectedParque || 'Medio';

    return {
      productoId: prod.id,
      productId: prod.id,
      producto: prod.producto,
      marca: prod.marca,
      modelo: prod.modelo,
      stockTotal: stockActual,
      stockActual,
      stockMinimo: prod.stockMinimo,
      categoriaRepuesto,
      tipoDesgaste,
      segmentoParque,
      totalVendidoHistorico,
      ventasUltimos30Dias,
      ventasUltimos90Dias,
      ventasPromedioMensual,
      devolucionesUltimos30Dias,
      diasAgotamientoEstimados: diasParaAgotamiento,
      diasParaAgotamiento,
      rotacionClasificacion: estadoRotacion,
      estadoRotacion,
      tasaDevolucionPorcentaje,
      alertaStock,
      alertaReabastecimiento:
        stockActual <= prod.stockMinimo || diasParaAgotamiento < 15,
      demandaDiaria,
      nivelRiesgo,
    };
  }

  private async findSimilarProducts(
    dto: PredictSuccessDto,
    categoria: string,
    margen: number,
  ): Promise<SimilarProductResult[]> {
    const rawProds = await this.dataSource.query<RawSimilarProductRow[]>(`
      SELECT 
        p.id, p.producto, p.marca, p.modelo, p.fabricante, p."categoriaRepuesto", p."tipoDesgaste",
        p.costo, p.precio1,
        COALESCE(SUM(CASE WHEN s.id IS NOT NULL THEN si.cantidad ELSE 0 END), 0) as total_vendido
      FROM products p
      LEFT JOIN sale_items si ON si."productId" = p.id
      LEFT JOIN sales s ON s.id = si."saleId" AND s.fecha >= NOW() - INTERVAL '90 days'
      WHERE p.activo = true
      GROUP BY p.id
      LIMIT 500;
    `);

    const normInputProd = normalizeText(dto.producto);
    const normInputModel = normalizeText(dto.modelo);
    const normInputBrand = normalizeText(dto.marca);

    const scored: SimilarProductResult[] = rawProds.map((p) => {
      let sim = 0.05;
      const pName = normalizeText(p.producto);
      const pModel = normalizeText(p.modelo);
      const pBrand = normalizeText(p.marca);

      if (
        normInputProd &&
        (pName === normInputProd ||
          pName.includes(normInputProd) ||
          normInputProd.includes(pName))
      ) {
        sim += 0.3;
      }
      if (
        normalizeText(p.categoriaRepuesto ?? '') === normalizeText(categoria)
      ) {
        sim += 0.25;
      }
      if (
        normInputModel &&
        (pModel.includes(normInputModel) || normInputModel.includes(pModel))
      ) {
        sim += 0.22;
      }
      if (
        normInputBrand &&
        (pBrand.includes(normInputBrand) || normInputBrand.includes(pBrand))
      ) {
        sim += 0.13;
      }

      const pCosto = Number(p.costo) || 1;
      const pPrecio = Number(p.precio1) || pCosto * 1.35;
      const pMargen = (pPrecio - pCosto) / pCosto;
      const diffMargen = Math.abs(pMargen - margen);
      sim += Math.max(0, 0.05 * (1 - Math.min(1, diffMargen)));

      const ventasMes = Math.round((Number(p.total_vendido) / 3) * 10) / 10;
      const gmroi = roundTwo(Math.max(0, pMargen) * ((ventasMes * 12) / 10));

      return {
        id: Number(p.id),
        producto: p.producto,
        marca: p.marca,
        modelo: p.modelo,
        fabricante: p.fabricante,
        precio1: Number(p.precio1) || undefined,
        similitud: Math.min(0.99, roundTwo(sim)),
        ventasMensualesNetas: ventasMes,
        gmroiReal: gmroi,
      };
    });

    scored.sort((a, b) => b.similitud - a.similitud);
    return scored.filter((s) => s.similitud >= 0.25).slice(0, 3);
  }

  private async checkCatalogSaturation(
    producto: string,
    modelo: string,
    categoria: string,
  ): Promise<number> {
    const firstWord = producto.trim().split(' ')[0] ?? producto;
    const res = await this.dataSource.query<RawCountRow[]>(
      `
      SELECT COUNT(*) as count 
      FROM products 
      WHERE activo = true
        AND LOWER(modelo) LIKE LOWER($1)
        AND ("categoriaRepuesto" = $2 OR LOWER(producto) LIKE LOWER($3));
      `,
      [`%${modelo.trim()}%`, categoria, `%${firstWord}%`],
    );
    return Number(res[0]?.count) || 0;
  }
}
