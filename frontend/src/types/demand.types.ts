export interface PredictSuccessDto {
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
  precio1?: number;
  similitud: number;
  ventasMensualesNetas: number;
  gmroiReal: number;
}

export type GuardrailSeverity = 'blocker' | 'warning' | 'info';

export type GuardrailField =
  | 'producto'
  | 'marca'
  | 'modelo'
  | 'costo'
  | 'precio1'
  | 'precioMayor'
  | 'categoriaRepuesto'
  | 'tipoDesgaste'
  | 'segmentoParque'
  | 'general';

export interface GuardrailSuggestions {
  categoriaRepuesto?: string;
  tipoDesgaste?: 'colision' | 'desgaste_medio' | 'desgaste_frecuente' | 'correctivo';
  segmentoParque?: 'Alto' | 'Medio' | 'Nicho';
  marca?: string;
  precio1?: number;
  precioMayor?: number;
}

export interface GuardrailIssue {
  code: string;
  field: GuardrailField;
  severity: GuardrailSeverity;
  message: string;
  suggestion?: string;
  suggestedField?: keyof GuardrailSuggestions;
  suggestedValue?: string | number;
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
  bloqueadoFinanciero?: boolean;
  desgloseScore?: {
    factorRotacionIA: number;
    saludMargen: number;
    saludCatalogo: number;
    penalizacionRiesgo: number;
  };
  metricasProyectadas: {
    demandaMensualEstimada: number;
    gmroiProyectado: number;
    margenRelativo: number;
    margenPorcentaje?: number;
    utilidadUnitaria?: number;
    inversionLoteEstimada?: number;
    gananciaProyectadaLote?: number;
  };
  recomendacionCompra?: {
    accion: PurchaseAction;
    titulo: string;
    pvpMinimoRentable: number;
    pvpRecomendado: number;
    precioMayorSugerido: number;
  };
  alertas: {
    saturacionCatalogo: boolean;
    cantidadCompetidoresCatalogo?: number;
    nivelAlerta?: 'critica' | 'advertencia' | 'saludable';
    mensaje: string;
    advertencias?: GuardrailIssue[];
  };
  productosSimilares: SimilarProduct[];
}

export interface DemandSummaryResponse {
  productoId: number;
  productId?: number;
  producto: string;
  marca?: string;
  modelo?: string;
  stockTotal: number;
  stockActual?: number;
  stockMinimo: number;
  categoriaRepuesto?: string;
  tipoDesgaste?: string;
  segmentoParque?: string;
  totalVendidoHistorico: number;
  ventasUltimos30Dias: number;
  ventasUltimos90Dias: number;
  ventasPromedioMensual: number;
  devolucionesUltimos30Dias?: number;
  diasAgotamientoEstimados: number;
  rotacionClasificacion: string;
  tasaDevolucionPorcentaje: number;
  alertaStock: string;
  alertaReabastecimiento?: boolean;
  demandaDiaria?: number;
  nivelRiesgo: 'critico' | 'atencion' | 'bajo';
}

export type DemandSummary = DemandSummaryResponse;
