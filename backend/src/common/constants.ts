export type UserRole = 'admin' | 'tienda' | 'inventario';

export const USER_ROLES: UserRole[] = ['admin', 'tienda', 'inventario'];

export const METODOS_PAGO = [
  'efectivo',
  'transferencia',
  'qr',
  'credito',
] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];

export const ESTADOS_SOLICITUD = [
  'Pendiente',
  'En preparación',
  'Enviado',
  'Recibido',
  'Cancelado',
] as const;
export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[number];

export const PORCENTAJES = [20, 30, 40, 50, 60, 70, 80] as const;

export const TIPOS_ASISTENCIA = ['entrada', 'salida'] as const;
export type TipoAsistencia = (typeof TIPOS_ASISTENCIA)[number];

/** 'automatico' si /face/match superó el umbral; 'manual' si un usuario confirmó el nombre. */
export const METODOS_ASISTENCIA = ['automatico', 'manual'] as const;
export type MetodoAsistencia = (typeof METODOS_ASISTENCIA)[number];

/**
 * Umbral de similitud para dar por válido un marcaje automático.
 * ⚠️ 0.55 venía del scoring de InsightFace: con **similitud coseno sobre embeddings
 * ArcFace normalizados** el rango típico de "misma persona" es 0.28-0.45, así que
 * este valor provisional da falsos negativos. Se recalibra en B4 con los rostros
 * reales de R5 (ver la nota de calibración de `Plan Hito 3.md`).
 */
export const UMBRAL_CONFIANZA_FACIAL = 0.35;

/** Registro facial: cuántas fotos del rostro se aceptan y cuántas se recomiendan. */
export const FOTOS_MINIMO_REGISTRO = 1;
export const FOTOS_MAXIMO_REGISTRO = 10;
export const FOTOS_RECOMENDADAS_REGISTRO = 5;
