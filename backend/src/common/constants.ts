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

/** Umbral de similitud para dar por válido un marcaje automático. */
export const UMBRAL_CONFIANZA_FACIAL = 0.55;
