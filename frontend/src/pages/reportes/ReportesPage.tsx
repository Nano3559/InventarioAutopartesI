import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context';
import {
  TrendingUp,
  Store,
  Car,
  Building2,
  Printer,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { reportesService } from '../../services/reportes.service';
import type { DashboardResponse } from '../../types/reporte.types';
import { ReporteHeaderCards } from '../../components/reportes/ReporteHeaderCards';
import { VentasMensualesView } from '../../components/reportes/VentasMensualesView';
import { VentasPorTiendaView } from '../../components/reportes/VentasPorTiendaView';
import { MarcasVehiculosView } from '../../components/reportes/MarcasVehiculosView';
import { ProveedoresComprasView } from '../../components/reportes/ProveedoresComprasView';
import '../../styles/reportes.css';

type ReportTab = 'mensual' | 'tiendas' | 'marcas' | 'proveedores';

export function ReportesPage() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ReportTab>('mensual');
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reportesService.getDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error('Error al cargar datos del dashboard de reportes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const generateReportHTML = (): string => {
    if (!dashboardData) return '';
    const ven = dashboardData.ventas;
    const inv = dashboardData.inventario;
    return `
      <html><head><title>Reporte - ${user?.nombre || 'Tienda'}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        h1 { color: #0284c7; border-bottom: 2px solid #0284c7; padding-bottom: 8px; }
        h2 { color: #555; margin-top: 20px; }
        .stat { display: inline-block; width: 45%; margin: 5px 0; padding: 10px; background: #f8fafc; border-radius: 6px; }
        .stat .label { font-size: 12px; color: #777; }
        .stat .value { font-size: 18px; font-weight: bold; color: #0284c7; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
        th { background: #f1f5f9; }
        .footer { margin-top: 30px; font-size: 11px; color: #999; text-align: center; }
      </style></head><body>
        <h1>Reporte de Ventas — ${isAdmin ? 'Sistema' : user?.nombre || 'Tienda'}</h1>
        <p>Fecha: ${new Date().toLocaleDateString('es-BO')} | Año: ${selectedYear}</p>
        <div class="stat"><div class="label">Ventas del Mes</div><div class="value">Bs. ${ven?.mes?.total?.toFixed(2) || '0.00'}</div></div>
        <div class="stat"><div class="label">Ventas de Hoy</div><div class="value">Bs. ${ven?.hoy?.total?.toFixed(2) || '0.00'}</div></div>
        <div class="stat"><div class="label">Total Productos</div><div class="value">${inv?.totalProductos || 0}</div></div>
        <div class="stat"><div class="label">Sin Stock</div><div class="value" style="color:#ef4444">${inv?.sinStock || 0}</div></div>
        <h2>Ventas por Marca</h2>
        <table><thead><tr><th>Marca</th><th>Unidades</th><th>Total (Bs.)</th></tr></thead><tbody>
        ${(ven?.porMarca || []).map(m => `<tr><td>${m.marca}</td><td>${m.unidades}</td><td>${m.total.toFixed(2)}</td></tr>`).join('')}
        </tbody></table>
        <h2>Top Productos</h2>
        <table><thead><tr><th>Producto</th><th>Marca</th><th>Unidades</th><th>Total (Bs.)</th></tr></thead><tbody>
        ${(dashboardData.topProductos || []).map(p => `<tr><td>${p.producto}</td><td>${p.marca}</td><td>${p.unidadesVendidas}</td><td>${p.totalVendido.toFixed(2)}</td></tr>`).join('')}
        </tbody></table>
        <div class="footer">AutoRepuestos Pro — Reporte generado automáticamente</div>
      </body></html>`;
  };

  const handlePrintReport = () => {
    const html = generateReportHTML();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 300);
    }
  };

  return (
    <div className="reportes-page-container">
      {/* Cabecera Principal */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isAdmin ? 'Reportes, Analíticas y Estadísticas Avanzadas' : 'Reportes de Mi Tienda'}
          </h1>
          <p className="page-subtitle">
            {isAdmin
              ? 'Métricas consolidadas de facturación, rendimiento por sucursal, marcas automotrices y compras'
              : 'Resumen de ventas, productos más vendidos y evolución mensual de tu tienda'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-alt)', border: '1px solid var(--border)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <Calendar size={15} color="#38bdf8" />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Año:</span>
            <select
              style={{ background: 'transparent', border: 'none', color: 'var(--text-strong)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', outline: 'none' }}
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={loadData}
            title="Recargar datos"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={handlePrintReport}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Printer size={16} />
            <span>Imprimir Informe</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Ejecutivas */}
      <ReporteHeaderCards data={dashboardData} />

      {/* Pestañas de Navegación */}
      <div className="reportes-nav-tabs">
        <button
          type="button"
          className={`reportes-tab-btn ${activeTab === 'mensual' ? 'active' : ''}`}
          onClick={() => setActiveTab('mensual')}
        >
          <TrendingUp size={16} />
          <span>Evolución Mensual</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            className={`reportes-tab-btn ${activeTab === 'tiendas' ? 'active' : ''}`}
            onClick={() => setActiveTab('tiendas')}
          >
            <Store size={16} />
            <span>Rendimiento por Tienda</span>
          </button>
        )}

        <button
          type="button"
          className={`reportes-tab-btn ${activeTab === 'marcas' ? 'active' : ''}`}
          onClick={() => setActiveTab('marcas')}
        >
          <Car size={16} />
          <span>Marcas y Vehículos</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            className={`reportes-tab-btn ${activeTab === 'proveedores' ? 'active' : ''}`}
            onClick={() => setActiveTab('proveedores')}
          >
            <Building2 size={16} />
            <span>Compras a Proveedores</span>
          </button>
        )}
      </div>

      {/* Contenido de la Pestaña Activa */}
      {activeTab === 'mensual' && (
        <VentasMensualesView selectedYear={selectedYear} />
      )}

      {activeTab === 'tiendas' && dashboardData && (
        <VentasPorTiendaView
          tiendasVentas={dashboardData.ventas?.porTienda || []}
          tiendasStock={dashboardData.inventario?.stockPorTienda || []}
        />
      )}

      {activeTab === 'marcas' && dashboardData && (
        <MarcasVehiculosView
          porMarca={dashboardData.ventas?.porMarca || []}
          porVehiculo={dashboardData.ventas?.porVehiculo || []}
          topProductos={dashboardData.topProductos || []}
        />
      )}

      {activeTab === 'proveedores' && (
        <ProveedoresComprasView />
      )}
    </div>
  );
}
