import { useState, useEffect } from 'react';
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
  Loader2,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { reportesService, type DashboardData } from '../../services/reportes.service';

export function DashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await reportesService.getDashboard();
        setDashboard(data);
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setError('No se pudieron cargar los datos del panel');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const inv = dashboard?.inventario;
  const ven = dashboard?.ventas;

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

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="animate-spin" style={{ display: 'block', margin: '0 auto 0.75rem' }} />
          Cargando datos del panel...
        </div>
      ) : error ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>
          <AlertTriangle size={24} style={{ display: 'block', margin: '0 auto 0.5rem' }} />
          {error}
        </div>
      ) : (
        <>
          {/* Metricas principales - Admin ve todo, tienda/inventario ven solo lo relevante */}
          <div className="stats-grid">
            {user?.rol === 'admin' && (
              <>
                <div className="stat-card">
                  <div className="stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                    <Boxes size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Total Productos</span>
                    <span className="stat-value">{inv?.totalProductos?.toLocaleString() ?? '0'}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                    <ShoppingCart size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Ventas del Día</span>
                    <span className="stat-value">Bs. {ven?.hoy?.total?.toLocaleString() ?? '0'}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                    <ClipboardList size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Solicitudes Pendientes</span>
                    <span className="stat-value">{dashboard?.solicitudesPendientes ?? dashboard?.solicitudes?.pendientes ?? 0}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                    <TrendingUp size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Ventas del Mes</span>
                    <span className="stat-value">Bs. {ven?.mes?.total?.toLocaleString() ?? '0'}</span>
                  </div>
                </div>
              </>
            )}

            {user?.rol === 'tienda' && (
              <>
                <div className="stat-card">
                  <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                    <ShoppingCart size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Ventas del Día</span>
                    <span className="stat-value">Bs. {ven?.hoy?.total?.toLocaleString() ?? '0'}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                    <TrendingUp size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Ventas del Mes</span>
                    <span className="stat-value">Bs. {ven?.mes?.total?.toLocaleString() ?? '0'}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                    <Boxes size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Productos Disponibles</span>
                    <span className="stat-value">{inv?.totalProductos?.toLocaleString() ?? '0'}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                    <ClipboardList size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Solicitudes Pendientes</span>
                    <span className="stat-value">{dashboard?.solicitudesPendientes ?? dashboard?.solicitudes?.pendientes ?? 0}</span>
                  </div>
                </div>
              </>
            )}

            {user?.rol === 'inventario' && (
              <>
                <div className="stat-card">
                  <div className="stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                    <AlertTriangle size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Productos Sin Stock</span>
                    <span className="stat-value" style={{ color: '#ef4444' }}>{inv?.sinStock ?? 0}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                    <Boxes size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Stock Bajo</span>
                    <span className="stat-value" style={{ color: '#f59e0b' }}>{inv?.stockBajo ?? 0}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                    <ClipboardList size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Solicitudes Pendientes</span>
                    <span className="stat-value">{dashboard?.solicitudesPendientes ?? dashboard?.solicitudes?.pendientes ?? 0}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                    <Boxes size={24} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Total Productos</span>
                    <span className="stat-value">{inv?.totalProductos?.toLocaleString() ?? '0'}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Resumen Inventario */}
          {inv && (
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-card">
                <div className="stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                  <AlertTriangle size={22} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Productos Sin Stock</span>
                  <span className="stat-value" style={{ color: '#ef4444' }}>{inv.sinStock}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                  <Boxes size={22} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Stock Bajo</span>
                  <span className="stat-value" style={{ color: '#f59e0b' }}>{inv.stockBajo}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  <DollarSign size={22} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Valor Inventario</span>
                  <span className="stat-value">Bs. {inv.valorInventario?.toLocaleString() ?? '0'}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <ShoppingCart size={22} />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Ventas Mes (Unidades)</span>
                  <span className="stat-value">{ven?.mes?.cantidad ?? 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Accesos Directos a Modulos del Plan */}
          <div className="card-section">
            <div className="card-section-header">
              <h2 className="card-section-title">
                <Sparkles size={18} style={{ display: 'inline', marginRight: '8px', color: '#38bdf8' }} />
                Modulos del Sistema
              </h2>
            </div>

            <div className="quick-actions-grid">
              {user?.rol === 'admin' && (
                <>
                  <NavLink to="/inventario" className="quick-action-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Boxes size={20} color="#38bdf8" />
                    </div>
                    <span className="quick-action-title">Inventario Global</span>
                    <span className="quick-action-desc">
                      Gestion de catalogo, stock en {inv?.stockPorAlmacen?.length ?? 0} almacenes y {inv?.stockPorTienda?.length ?? 0} tiendas con filtros avanzados.
                    </span>
                  </NavLink>

                  <NavLink to="/precios" className="quick-action-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <DollarSign size={20} color="#38bdf8" />
                    </div>
                    <span className="quick-action-title">Precios y Margenes</span>
                    <span className="quick-action-desc">
                      Calculo automatico de Precio 1 y 2 a partir del costo y exportacion Excel.
                    </span>
                  </NavLink>
                </>
              )}

              {(user?.rol === 'admin' || user?.rol === 'tienda') && (
                <NavLink to="/ventas" className="quick-action-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <ShoppingCart size={20} color="#60a5fa" />
                  </div>
                  <span className="quick-action-title">Punto de Venta</span>
                  <span className="quick-action-desc">
                    Carrito de compras, cobro multimetodo y emision de notas de venta.
                  </span>
                </NavLink>
              )}

              {(user?.rol === 'admin' || user?.rol === 'inventario') && (
                <NavLink to="/solicitudes" className="quick-action-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <ClipboardList size={20} color="#a78bfa" />
                  </div>
                  <span className="quick-action-title">Solicitudes a Almacen</span>
                  <span className="quick-action-desc">
                    Atencion y despacho de pedidos de mercaderia desde tiendas.
                  </span>
                </NavLink>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
