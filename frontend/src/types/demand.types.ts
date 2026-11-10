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
