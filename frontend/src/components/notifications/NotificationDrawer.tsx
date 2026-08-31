import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  CheckCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useNotifications } from '../../context';
import type { AppNotification } from '../../types/notificacion.types';
import '../../styles/notifications.css';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabFilter = 'todas' | 'no_leidas' | 'stock' | 'solicitudes';

export function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [tab, setTab] = useState<TabFilter>('todas');
  const drawerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredNotifications: AppNotification[] = notifications.filter((n: AppNotification) => {
    if (tab === 'no_leidas') return !n.read;
    if (tab === 'stock') return n.type === 'stock_critico' || n.type === 'stock_agotado';
    if (tab === 'solicitudes') return n.type === 'solicitud';
    return true;
  });

  const handleNotificationClick = (n: AppNotification) => {
    markAsRead(n.id);
    onClose();
    if (n.link) {
      navigate(n.link);
    }
  };

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertTriangle size={16} />;
      case 'warning':
        return <AlertCircle size={16} />;
      case 'success':
        return <CheckCircle2 size={16} />;
      default:
        return <Info size={16} />;
    }
  };

  return (
    <div className="notification-dropdown" ref={drawerRef} role="dialog" aria-label="Centro de Notificaciones">
      {/* Header */}
      <div className="notification-dropdown-header">
        <div className="notification-dropdown-title">
          <Bell size={16} color="#38bdf8" />
          <span>Centro de Alertas</span>
          {unreadCount > 0 && (
            <span style={{ fontSize: '0.72rem', background: '#ef4444', color: '#fff', padding: '0.1rem 0.45rem', borderRadius: '999px', fontWeight: 700 }}>
              {unreadCount} nuevas
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          title="Cerrar"
        >
          <X size={18} />
        </button>
      </div>

      {/* Tabs Filter */}
      <div className="notification-tabs-bar">
        <button
          type="button"
          className={`notification-tab-chip ${tab === 'todas' ? 'active' : ''}`}
          onClick={() => setTab('todas')}
        >
          Todas ({notifications.length})
        </button>
        <button
          type="button"
          className={`notification-tab-chip ${tab === 'no_leidas' ? 'active' : ''}`}
          onClick={() => setTab('no_leidas')}
        >
          No leídas ({unreadCount})
        </button>
        <button
          type="button"
          className={`notification-tab-chip ${tab === 'stock' ? 'active' : ''}`}
          onClick={() => setTab('stock')}
        >
          Stock Crítico
        </button>
        <button
          type="button"
          className={`notification-tab-chip ${tab === 'solicitudes' ? 'active' : ''}`}
          onClick={() => setTab('solicitudes')}
        >
          Solicitudes
        </button>
      </div>

      {/* List */}
      <div className="notification-list-body">
        {filteredNotifications.length === 0 ? (
          <div className="notification-empty-state">
            <CheckCheck size={32} color="#34d399" />
            <p>No tienes alertas pendientes en esta categoría.</p>
          </div>
        ) : (
          filteredNotifications.map((n: AppNotification) => (
            <div
              key={n.id}
              className={`notification-item ${!n.read ? 'unread' : ''}`}
              onClick={() => handleNotificationClick(n)}
            >
              <div className={`notification-icon-wrapper ${n.severity}`}>
                {getIcon(n.severity)}
              </div>

              <div className="notification-content">
                <strong className="notification-item-title">{n.title}</strong>
                <span className="notification-item-msg">{n.message}</span>
                <span className="notification-item-time">{n.timestamp}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="notification-dropdown-footer">
        {unreadCount > 0 ? (
          <button
            type="button"
            className="btn-link-action"
            onClick={markAllAsRead}
          >
            Marcar todas como leídas
          </button>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>Todo al día</span>
        )}

        <button
          type="button"
          className="btn-link-action"
          style={{ color: 'var(--text-muted)' }}
          onClick={clearAll}
          title="Limpiar lista"
        >
          <Trash2 size={13} style={{ display: 'inline', marginRight: '3px' }} />
          Limpiar
        </button>
      </div>
    </div>
  );
}
