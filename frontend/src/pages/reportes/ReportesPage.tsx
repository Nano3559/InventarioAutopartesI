import { useState, useEffect, useCallback } from 'react';
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
    let isMounted = true;
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const data = await reportesService.getDashboard();
        if (isMounted) setDashboardData(data);
      } catch (err) {
        console.error('Error al cargar datos del dashboard:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="reportes-page-container">
      {/* Cabecera Principal */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes, Analíticas y Estadísticas Avanzadas</h1>
          <p className="page-subtitle">
            Métricas consolidadas de facturación, rendimiento por sucursal, marcas automotrices y compras
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
            onClick={handlePrint}
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

        <button
          type="button"
          className={`reportes-tab-btn ${activeTab === 'tiendas' ? 'active' : ''}`}
          onClick={() => setActiveTab('tiendas')}
        >
          <Store size={16} />
          <span>Rendimiento por Tienda</span>
        </button>

        <button
          type="button"
          className={`reportes-tab-btn ${activeTab === 'marcas' ? 'active' : ''}`}
          onClick={() => setActiveTab('marcas')}
        >
          <Car size={16} />
          <span>Marcas y Vehículos</span>
        </button>

        <button
          type="button"
          className={`reportes-tab-btn ${activeTab === 'proveedores' ? 'active' : ''}`}
          onClick={() => setActiveTab('proveedores')}
        >
          <Building2 size={16} />
          <span>Compras a Proveedores</span>
        </button>
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
