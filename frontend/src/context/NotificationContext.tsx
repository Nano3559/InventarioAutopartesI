import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { AppNotification } from '../types/notificacion.types';
import { NotificationContext } from './notification.context';

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    type: 'stock_agotado',
    title: 'Repuesto Agotado en Almacén',
    message: 'Radiador de aluminio (Hyundai Tucson 2016-2020) no tiene stock disponible.',
    timestamp: 'Hace 15 min',
    read: false,
    severity: 'error',
    link: '/inventario?search=Radiador',
  },
  {
    id: 'notif-2',
    type: 'solicitud',
    title: 'Solicitud de Abastecimiento',
    message: 'Tienda 2 solicita 5 unidades de Pastillas de freno delanteras (Toyota Corolla).',
    timestamp: 'Hace 45 min',
    read: false,
    severity: 'warning',
    link: '/solicitudes',
  },
  {
    id: 'notif-3',
    type: 'stock_critico',
    title: 'Nivel de Stock Crítico',
    message: 'Bomba de agua con empaque (Suzuki Grand Vitara) tiene solo 2 unidades restantes.',
    timestamp: 'Hace 2 horas',
    read: false,
    severity: 'warning',
    link: '/inventario?search=Bomba',
  },
  {
    id: 'notif-4',
    type: 'movimiento',
    title: 'Traslado Completado',
    message: 'Movimiento #MOV-004 de 10 Faroles delanteros fue recibido en Tienda 1.',
    timestamp: 'Hoy 10:15',
    read: true,
    severity: 'success',
    link: '/movimientos',
  },
  {
    id: 'notif-5',
    type: 'costo',
    title: 'Factura de Compra Registrada',
    message: 'Se registraron 50 unidades de faroles y luces del proveedor Depo Auto Lamps.',
    timestamp: 'Ayer 18:30',
    read: true,
    severity: 'info',
    link: '/costos',
  },
];

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('app_notifications');
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignorar error de parsing
    }
    return INITIAL_NOTIFICATIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_notifications', JSON.stringify(notifications));
    } catch {
      // Ignorar error de storage
    }
  }, [notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const addNotification = useCallback(
    (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
      const newNotif: AppNotification = {
        ...notif,
        id: `notif-${Date.now()}`,
        timestamp: 'Justo ahora',
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev]);
    },
    []
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      clearAll,
      addNotification,
    }),
    [notifications, unreadCount, markAsRead, markAllAsRead, clearAll, addNotification]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
