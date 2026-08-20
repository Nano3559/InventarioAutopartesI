import { useAuth } from '../../context';
import { NavLink } from 'react-router-dom';
import {
  Boxes,
  ShoppingCart,
  ClipboardList,
  DollarSign,
  ShieldCheck,
  Store,
  Warehouse,
  Sparkles,
} from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <div className="dashboard-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {getGreeting()}, {user?.nombre || 'Usuario'}
          </h1>
          <p className="page-subtitle">
            Panel de control centralizado • Sistema AutoRepuestos Pro
          </p>
        </div>

        <div className="assigned-badge">
          {user?.rol === 'admin' && <ShieldCheck size={16} />}
          {user?.rol === 'tienda' && <Store size={16} />}
          {user?.rol === 'inventario' && <Warehouse size={16} />}
          <span>Rol: <strong>{user?.rol?.toUpperCase()}</strong></span>
        </div>
      </div>

      {/* Grid de Métricas Principales */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <Boxes size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Productos</span>
            <span className="stat-value">1,420</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <ShoppingCart size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Ventas del Día</span>
            <span className="stat-value">Bs. 8,450</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <ClipboardList size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Solicitudes Pendientes</span>
            <span className="stat-value">5</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Margen Promedio</span>
            <span className="stat-value">35.4%</span>
          </div>
        </div>
      </div>

      {/* Accesos Directos a Módulos del Plan */}
      <div className="card-section">
        <div className="card-section-header">
          <h2 className="card-section-title">
            <Sparkles size={18} style={{ display: 'inline', marginRight: '8px', color: '#38bdf8' }} />
            Módulos del Sistema
          </h2>
        </div>

        <div className="quick-actions-grid">
          {user?.rol === 'admin' && (
            <>
              <NavLink to="/inventario" className="quick-action-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Boxes size={20} color="#38bdf8" />
                  <span className="nav-link-badge">M2</span>
                </div>
                <span className="quick-action-title">Inventario Global</span>
                <span className="quick-action-desc">
                  Gestión de catálogo, stock en 4 almacenes y 3 tiendas con filtros avanzados.
                </span>
              </NavLink>

              <NavLink to="/precios" className="quick-action-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <DollarSign size={20} color="#38bdf8" />
                  <span className="nav-link-badge">M8</span>
                </div>
                <span className="quick-action-title">Precios y Márgenes</span>
                <span className="quick-action-desc">
                  Cálculo automático de Precio 1 y 2 a partir del costo y exportación Excel.
                </span>
              </NavLink>
            </>
          )}

          {(user?.rol === 'admin' || user?.rol === 'tienda') && (
            <NavLink to="/ventas" className="quick-action-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <ShoppingCart size={20} color="#60a5fa" />
                <span className="nav-link-badge">R3</span>
              </div>
              <span className="quick-action-title">Punto de Venta</span>
              <span className="quick-action-desc">
                Carrito de compras, cobro multimétodo y emisión de notas de venta.
              </span>
            </NavLink>
          )}

          {(user?.rol === 'admin' || user?.rol === 'inventario') && (
            <NavLink to="/solicitudes" className="quick-action-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <ClipboardList size={20} color="#a78bfa" />
                <span className="nav-link-badge">M6</span>
              </div>
              <span className="quick-action-title">Solicitudes a Almacén</span>
              <span className="quick-action-desc">
                Atención y despacho de pedidos de mercadería desde tiendas.
              </span>
            </NavLink>
          )}
        </div>
      </div>
    </div>
  );
}
