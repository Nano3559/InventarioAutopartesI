import { createContext } from 'react';
import type { AppNotification } from '../types/notificacion.types';

export interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
}

export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);
