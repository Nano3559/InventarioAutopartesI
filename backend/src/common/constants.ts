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
 * Umbral de similitud (coseno sobre embeddings ArcFace normalizados, 0-1) para
 * dar por válido un marcaje automático.
 *
 * Historia de la calibración:
 * - 0.55 venía del scoring de InsightFace y con coseno ArcFace daba falsos
 *   negativos (el rango típico de "misma persona" medido era 0.28-0.45).
 * - 0.35 dejaba pasar desconocidos: una cara que **no está registrada** podía
 *   igualar con la galería y marcaba "confianza alta", registrando al empleado
 *   equivocado.
 * - 0.8 (exigido por el negocio): cualquier marcaje por debajo de esa confianza
 *   se responde como "usuario desconocido" y la app pide registrarse primero.
 *   Es deliberadamente exigente: un rostro **bien alineado** del mismo usuario
 *   suele superarlo; si un empleado registrado empieza a salir "desconocido",
 *   hay que bajar el valor (se configura con `UMBRAL_CONFIANZA_FACIAL` en el
 *   entorno, sin redeploy) y no volver a subirlo por debajo de lo que separa
 *   genuinos de impostores en la tabla de scores de R5.
 */
const umbralConfianza = Number(process.env.UMBRAL_CONFIANZA_FACIAL);
export const UMBRAL_CONFIANZA_FACIAL =
  Number.isFinite(umbralConfianza) && umbralConfianza > 0 && umbralConfianza <= 1
    ? umbralConfianza
    : 0.8;

/** Registro facial: cuántas fotos del rostro se aceptan y cuántas se recomiendan. */
export const FOTOS_MINIMO_REGISTRO = 1;
export const FOTOS_MAXIMO_REGISTRO = 10;
export const FOTOS_RECOMENDADAS_REGISTRO = 5;
