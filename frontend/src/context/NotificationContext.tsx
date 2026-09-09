import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { AppNotification } from '../types/notificacion.types';
import { NotificationContext } from './notification.context';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('app_notifications');
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignorar error de parsing
    }
    return [];
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
