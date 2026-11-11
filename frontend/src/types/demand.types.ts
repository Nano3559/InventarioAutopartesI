export interface PredictSuccessDto {
  productId?: number;
  producto: string;
  marca: string;
  modelo: string;
  anio?: string;
  fabricante?: string;
  costo: number;
  precio1: number;
  precioMayor?: number;
  categoriaRepuesto?: string;
  tipoDesgaste?: string;
  segmentoParque?: string;
  locationId?: number;
}

export interface SimilarProduct {
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
  /** Commercial viability index displayed as a percentage. */
  scoreExito: number;
  categoria: string;
  /** Model probability of the successful class, independent of the commercial index. */
  probabilidadExito: number;
  diasRotacionEstimados: number;
  loteSugeridoCompra: number;
  viabilidad?: 'viable' | 'riesgo' | 'inviable';
  bloqueado?: boolean;
  metricasProyectadas: {
    demandaMensualEstimada: number;
    gmroiProyectado: number;
    margenRelativo: number;
  };
  guardrails?: PredictionGuardrails;
  alertas: {
    saturacionCatalogo: boolean;
    critica?: boolean;
    mensaje: string;
  };
  productosSimilares: SimilarProduct[];
}

export interface DemandSummaryResponse {
  productoId: number;
  producto: string;
  stockTotal: number;
  stockMinimo: number;
  categoriaRepuesto?: string;
  tipoDesgaste?: string;
  segmentoParque?: string;
  totalVendidoHistorico: number;
  ventasUltimos30Dias: number;
  ventasUltimos90Dias: number;
  ventasPromedioMensual: number;
  diasAgotamientoEstimados: number;
  rotacionClasificacion: string;
  tasaDevolucionPorcentaje: number;
  alertaStock: string;
  nivelRiesgo: 'critico' | 'atencion' | 'bajo';
}

export type DemandSummary = DemandSummaryResponse;
