import { useState, useEffect } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';
import type { ReporteMensualItem } from '../../types/reporte.types';
import { reportesService } from '../../services/reportes.service';

interface VentasMensualesViewProps {
  selectedYear: number;
}

export function VentasMensualesView({ selectedYear }: VentasMensualesViewProps) {
  const [data, setData] = useState<ReporteMensualItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchMensual = async () => {
      setLoading(true);
      try {
        const res = await reportesService.getReporteMensual(selectedYear);
        if (isMounted) setData(res);
      } catch (err) {
        console.error('Error al cargar reporte mensual:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchMensual();
    return () => {
      isMounted = false;
    };
  }, [selectedYear]);

  const maxTotal = Math.max(...data.map((d) => d.total), 1);
  const totalAnual = data.reduce((acc, d) => acc + d.total, 0);
  const promedioMensual = data.filter((d) => d.total > 0).length > 0
    ? totalAnual / data.filter((d) => d.total > 0).length
    : 0;

  if (loading) {
    return (
      <div className="chart-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px', gap: '0.75rem', color: 'var(--text-muted)' }}>
        <Loader2 size={24} className="animate-spin" color="#38bdf8" />
        <span>Cargando evolución mensual {selectedYear}...</span>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-strong)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} color="#38bdf8" />
            <span>Evolución Mensual de Facturación ({selectedYear})</span>
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Comparativa de ingresos por ventas mes a mes en bolivianos (Bs.)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>
              Facturación Anual
            </span>
            <strong style={{ fontSize: '1.1rem', color: '#38bdf8', fontFamily: 'monospace' }}>
              Bs. {totalAnual.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>
              Promedio Activo
            </span>
            <strong style={{ fontSize: '1.1rem', color: '#34d399', fontFamily: 'monospace' }}>
              Bs. {promedioMensual.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>
        </div>
      </div>

      {/* Gráfico de Barras Mensuales */}
      <div className="monthly-bars-grid">
        {data.map((item) => {
          const heightPercent = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
          const isZero = item.total === 0;

          return (
            <div key={item.mes} className="month-bar-col">
              {!isZero && (
                <span className="month-bar-amount">
                  {(item.total / 1000).toFixed(1)}k
                </span>
              )}
              <div
                className="month-bar-pillar"
                style={{
                  height: isZero ? '4px' : `${Math.max(8, heightPercent)}%`,
                  opacity: isZero ? 0.25 : 1,
                  background: item.total === maxTotal ? 'linear-gradient(180deg, #34d399, #059669)' : undefined,
                }}
                title={`${item.nombreMes}: Bs. ${item.total.toFixed(2)} (${item.cantidad} ventas)`}
              />
              <span className="month-bar-label">
                {item.nombreMes.slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Resumen Detallado en Tabla */}
      <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
        {data.filter((d) => d.total > 0).map((d) => (
          <div key={d.mes} style={{ padding: '0.75rem', background: 'var(--bg-alt)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-strong)' }}>{d.nombreMes}</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
                Bs. {d.total.toFixed(2)}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {d.cantidad} ventas
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
