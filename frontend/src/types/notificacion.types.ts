export type NotificationType =
  | 'stock_critico'
  | 'stock_agotado'
  | 'solicitud'
  | 'movimiento'
  | 'costo'
  | 'sistema';

export type NotificationSeverity = 'error' | 'warning' | 'info' | 'success';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string; // ISO string o formato legible
  read: boolean;
  link?: string;
  severity: NotificationSeverity;
  metadata?: Record<string, unknown>;
}
