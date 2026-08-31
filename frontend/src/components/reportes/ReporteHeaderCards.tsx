import {
  DollarSign,
  TrendingUp,
  Boxes,
  AlertTriangle,
} from 'lucide-react';
import type { DashboardResponse } from '../../types/reporte.types';

interface ReporteHeaderCardsProps {
  data: DashboardResponse | null;
}

export function ReporteHeaderCards({ data }: ReporteHeaderCardsProps) {
  if (!data) return null;

  const ventasMes = data.ventas?.mes?.total || 0;
  const transaccionesMes = data.ventas?.mes?.cantidad || 0;
  const ventasHoy = data.ventas?.hoy?.total || 0;
  const transaccionesHoy = data.ventas?.hoy?.cantidad || 0;
  const valorInventario = data.inventario?.valorInventario || 0;
  const sinStock = data.inventario?.sinStock || 0;
  const stockBajo = data.inventario?.stockBajo || 0;

  return (
    <div className="stats-grid">
      {/* Ventas del Mes */}
      <div className="stat-card">
        <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
          <DollarSign size={22} />
        </div>
        <div className="stat-info">
          <span className="stat-label">Facturación Total del Mes</span>
          <span className="stat-value">Bs. {ventasMes.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {transaccionesMes} transacciones completadas
          </span>
        </div>
      </div>

      {/* Ventas de Hoy */}
      <div className="stat-card">
        <div className="stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
          <TrendingUp size={22} />
        </div>
        <div className="stat-info">
          <span className="stat-label">Ventas Registradas Hoy</span>
          <span className="stat-value">Bs. {ventasHoy.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {transaccionesHoy} ventas en sucursales
          </span>
        </div>
      </div>

      {/* Valorización de Inventario */}
      <div className="stat-card">
        <div className="stat-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
          <Boxes size={22} />
        </div>
        <div className="stat-info">
          <span className="stat-label">Valor del Inventario en Almacén</span>
          <span className="stat-value">Bs. {valorInventario.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {data.inventario?.totalProductos || 0} repuestos en catálogo
          </span>
        </div>
      </div>

      {/* Alertas de Stock */}
      <div className="stat-card">
        <div className="stat-icon-wrapper" style={{ background: sinStock > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: sinStock > 0 ? '#f87171' : '#f59e0b' }}>
          <AlertTriangle size={22} />
        </div>
        <div className="stat-info">
          <span className="stat-label">Alertas de Reposición</span>
          <span className="stat-value" style={{ color: sinStock > 0 ? '#f87171' : 'var(--text-strong)' }}>
            {sinStock} Agotados
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {stockBajo} con stock mínimo
          </span>
        </div>
      </div>
    </div>
  );
}
