import { useAuth } from '../context';
import { LogOut, Menu, Store, Warehouse, Shield } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
}

export function Navbar({ onToggleMobileSidebar }: NavbarProps) {
  const { user, logout } = useAuth();
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
