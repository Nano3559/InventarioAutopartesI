import { useState, useEffect } from 'react';
import { Building2, Globe, Loader2 } from 'lucide-react';
import type { ReporteProveedorItem } from '../../types/reporte.types';
import { reportesService } from '../../services/reportes.service';

export function ProveedoresComprasView() {
  const [proveedores, setProveedores] = useState<ReporteProveedorItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchProveedores = async () => {
      setLoading(true);
      try {
        const res = await reportesService.getReporteProveedores();
        if (isMounted) setProveedores(res);
      } catch (err) {
        console.error('Error al cargar reporte de proveedores:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProveedores();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalInvertido = proveedores.reduce((acc, p) => acc + p.totalInvertido, 0);
  const totalUnidades = proveedores.reduce((acc, p) => acc + p.unidadesCompradas, 0);

  if (loading) {
    return (
      <div className="chart-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '260px', gap: '0.75rem', color: 'var(--text-muted)' }}>
        <Loader2 size={24} className="animate-spin" color="#38bdf8" />
        <span>Cargando análisis de compras a proveedores...</span>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-strong)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={20} color="#38bdf8" />
            <span>Volumen de Compras por Proveedor / Fabricante</span>
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Consolidado histórico de inversión en adquisición de stock por empresa proveedora
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>
              Inversión Total
            </span>
            <strong style={{ fontSize: '1.1rem', color: '#38bdf8', fontFamily: 'monospace' }}>
              Bs. {totalInvertido.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
            </strong>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>
              Repuestos Ingresados
            </span>
            <strong style={{ fontSize: '1.1rem', color: '#34d399', fontFamily: 'monospace' }}>
              {totalUnidades} unidades
            </strong>
          </div>
        </div>
      </div>

      {/* Tabla de Proveedores */}
      <div className="table-responsive-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Empresa Proveedora</th>
              <th>País de Origen</th>
              <th>Facturas Registradas</th>
              <th>Repuestos Comprados</th>
              <th>Participación</th>
              <th style={{ textAlign: 'right' }}>Total Invertido (Bs.)</th>
            </tr>
          </thead>
          <tbody>
            {proveedores.map((p) => {
              const percentage = totalInvertido > 0 ? (p.totalInvertido / totalInvertido) * 100 : 0;

              return (
                <tr key={p.proveedorId}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Building2 size={16} color="#38bdf8" />
                      <strong style={{ color: 'var(--text-strong)' }}>{p.nombre}</strong>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Globe size={13} />
                      <span>{p.pais}</span>
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{p.facturasCount} factura(s)</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#34d399' }}>{p.unidadesCompradas} uds.</span>
                  </td>
                  <td style={{ width: '18%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="ranking-progress-track" style={{ flex: 1 }}>
                        <div
                          className="ranking-progress-fill"
                          style={{ width: `${percentage}%`, background: 'linear-gradient(90deg, #38bdf8, #3b82f6)' }}
                        />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
                    Bs. {p.totalInvertido.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
