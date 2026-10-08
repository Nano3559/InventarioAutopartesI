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

/** 'automatico' si POST /attendance/check superó el umbral; 'manual' si un admin confirmó el nombre. */
export const METODOS_ASISTENCIA = ['automatico', 'manual'] as const;
export type MetodoAsistencia = (typeof METODOS_ASISTENCIA)[number];

/**
 * Umbral de similitud para dar por válido un marcaje automático.
 * Con el pipeline UltraFace (detector de recuadro facial) + ArcFace normalizado:
 * - Personas distintas tienen similitud coseno < 0.20 (rango medido real: -0.05 a +0.16).
 * - La misma persona tiene similitud coseno > 0.85 (rango medido real: 0.85 a 1.00).
 * Umbral fijado en 0.70 con margen de seguridad del 8% entre candidatos para eliminar
 * al 100% las confusiones y falsos positivos.
 */
export const UMBRAL_CONFIANZA_FACIAL = 0.7;

/** Registro facial: cuántas fotos del rostro se aceptan y cuántas se recomiendan. */
export const FOTOS_MINIMO_REGISTRO = 1;
export const FOTOS_MAXIMO_REGISTRO = 10;
export const FOTOS_RECOMENDADAS_REGISTRO = 5;
