export type UserRole = 'admin' | 'tienda' | 'inventario';

export const USER_ROLES: UserRole[] = ['admin', 'tienda', 'inventario'];

export const METODOS_PAGO = ['efectivo', 'transferencia', 'qr', 'credito'] as const;
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