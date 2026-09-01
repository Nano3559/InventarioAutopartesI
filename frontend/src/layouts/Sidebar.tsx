import { NavLink } from 'react-router-dom';
import { useAuth } from '../context';
import {
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  ArrowLeftRight,
  ClipboardList,
  Tags,
  DollarSign,
  BarChart3,
  RotateCcw,
  ShoppingBag,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Camera,
  History,
} from 'lucide-react';
import type { UserRole } from '../types/auth.types';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

interface NavSection {
  title: string;
  roles: UserRole[];
  items: NavItem[];
}

export function Sidebar({ collapsed, onToggleCollapse, onCloseMobile }: SidebarProps) {
  const { user } = useAuth();

  const sections: NavSection[] = [
    {
      title: 'Principal',
      roles: ['admin', 'tienda', 'inventario'],
      items: [
        {
          to: '/dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard size={18} />,
          roles: ['admin', 'tienda', 'inventario'],
        },
      ],
    },
    {
      title: 'Administración',
      roles: ['admin'],
      items: [
        {
          to: '/inventario',
          label: 'Inventario Global',
          icon: <Boxes size={18} />,
          roles: ['admin'],
        },
        {
          to: '/precios',
          label: 'Gestión Precios',
          icon: <Tags size={18} />,
          roles: ['admin'],
        },
        {
          to: '/costos',
          label: 'Costos y Facturas',
          icon: <DollarSign size={18} />,
          roles: ['admin'],
        },
        {
          to: '/reportes',
          label: 'Reportes y Métricas',
          icon: <BarChart3 size={18} />,
          roles: ['admin'],
        },
      ],
    },
    {
      title: 'Operación Tienda',
      roles: ['admin', 'tienda'],
      items: [
        {
          to: '/ventas',
          label: 'Punto de Venta',
          icon: <ShoppingCart size={18} />,
          roles: ['admin', 'tienda'],
        },
        {
          to: '/ventas-mayor',
          label: 'Ventas por Mayor',
          icon: <ShoppingBag size={18} />,
          roles: ['admin', 'tienda'],
        },
        {
          to: '/ventas-historial',
          label: 'Historial de Ventas',
          icon: <History size={18} />,
          roles: ['admin', 'tienda'],
        },
        {
          to: '/devoluciones',
          label: 'Devoluciones',
          icon: <RotateCcw size={18} />,
          roles: ['admin', 'tienda'],
        },
        {
          to: '/reportes',
          label: 'Reportes de Tienda',
          icon: <BarChart3 size={18} />,
          roles: ['tienda'],
        },
        {
          to: '/busqueda-imagen',
          label: 'Búsqueda por Imagen',
          icon: <Camera size={18} />,
          roles: ['admin', 'tienda'],
        },
      ],
    },
    {
      title: 'Almacén y Logística',
      roles: ['admin', 'inventario', 'tienda'],
      items: [
        {
          to: '/solicitudes',
          label: 'Solicitudes Stock',
          icon: <ClipboardList size={18} />,
          roles: ['admin', 'inventario', 'tienda'],
        },
        {
          to: '/movimientos',
          label: 'Movimientos / Traslados',
          icon: <ArrowLeftRight size={18} />,
          roles: ['admin', 'inventario'],
        },
      ],
    },
  ];

  const getRoleDisplayName = (rol?: UserRole) => {
    switch (rol) {
      case 'admin':
        return 'Administrador';
      case 'tienda':
        return 'Vendedor Tienda';
      case 'inventario':
        return 'Encargado Almacén';
      default:
        return 'Usuario';
    }
  };

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <NavLink to="/dashboard" className="sidebar-brand" onClick={onCloseMobile}>
          <div className="brand-icon-wrapper">
            <Wrench size={20} />
          </div>
          {!collapsed && (
            <div className="brand-title">
              <span>AutoRepuestos</span>
              <span className="brand-tag">PRO ADMIN</span>
            </div>
          )}
        </NavLink>

        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
          aria-label="Alternar barra lateral"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <div className="sidebar-nav">
        {sections.map((section) => {
          if (user && !section.roles.includes(user.rol)) return null;

          const visibleItems = section.items.filter(
            (item) => user && item.roles.includes(user.rol)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="nav-section">
              {!collapsed && (
                <div className="nav-section-title">{section.title}</div>
              )}
              <div className="nav-item-list">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'active' : ''}`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="nav-link-icon">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}

                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="user-card" title={user?.email}>
          <div className="user-avatar">
            {user?.nombre?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="user-info">
              <span className="user-name">{user?.nombre || 'Usuario'}</span>
              <span className="user-role-badge">
                {getRoleDisplayName(user?.rol)}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
