import { useState } from 'react';
import { useAuth, useNotifications } from '../context';
import { LogOut, Menu, Store, Warehouse, Shield, Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { NotificationDrawer } from '../components/notifications/NotificationDrawer';
import '../styles/notifications.css';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
}

export function Navbar({ onToggleMobileSidebar }: NavbarProps) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const location = useLocation();

  // Generar título o breadcrumb a partir del pathname
  const getPageTitle = (path: string) => {
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0 || segments[0] === 'dashboard') return 'Dashboard General';
    
    const titles: Record<string, string> = {
      inventario: 'Gestión de Inventario (M2)',
      ventas: 'Punto de Venta (R3)',
      'ventas-mayor': 'Ventas por Mayor (R7)',
      movimientos: 'Movimientos y Traslados (M5)',
      solicitudes: 'Solicitudes a Almacén (M6/R4)',
      precios: 'Gestión de Precios (M8)',
      costos: 'Costos y Proveedores (M7)',
      reportes: 'Reportes y Métricas (M9)',
      devoluciones: 'Devoluciones de Clientes (R4)',
    };

    return titles[segments[0]] || segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
  };

  const getRoleIcon = () => {
    if (user?.rol === 'admin') return <Shield size={14} color="#38bdf8" />;
    if (user?.rol === 'tienda') return <Store size={14} color="#60a5fa" />;
    return <Warehouse size={14} color="#a78bfa" />;
  };

  return (
    <header className="app-navbar">
      <div className="navbar-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onToggleMobileSidebar}
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>

        <nav className="breadcrumbs" aria-label="Ruta de navegación">
          <span>Sistema</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{getPageTitle(location.pathname)}</span>
        </nav>
      </div>

      <div className="navbar-right">
        {user?.tienda ? (
          <div className="location-indicator" title="Ubicación asignada">
            <span className="location-dot" />
            <span>{user.tienda.nombre}</span>
          </div>
        ) : (
          <div className="location-indicator" title="Acceso Global">
            {getRoleIcon()}
            <span>Vista Centralizada</span>
          </div>
        )}

        {/* Campana de Notificaciones */}
        <div className="notifications-menu-wrapper">
          <button
            type="button"
            className="notification-bell-btn"
            onClick={() => setNotificationsOpen((prev) => !prev)}
            title="Alertas y Notificaciones"
            aria-label="Notificaciones"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notification-badge-pill">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <NotificationDrawer
            isOpen={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
          />
        </div>

        <button
          type="button"
          className="btn-logout"
          onClick={logout}
          title="Cerrar sesión"
        >
          <LogOut size={15} />
          <span>Salir</span>
        </button>
      </div>
    </header>
  );
}
