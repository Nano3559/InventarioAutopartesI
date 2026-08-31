import { Car, Award, BarChart2 } from 'lucide-react';
import type { VentasPorMarca, VentasPorVehiculo, TopProducto } from '../../types/reporte.types';

interface MarcasVehiculosViewProps {
  porMarca: VentasPorMarca[];
  porVehiculo: VentasPorVehiculo[];
  topProductos: TopProducto[];
}

export function MarcasVehiculosView({
  porMarca,
  porVehiculo,
  topProductos,
}: MarcasVehiculosViewProps) {
  const maxMarcaTotal = Math.max(...porMarca.map((m) => m.total), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="ranking-grid-2cols">
        {/* Ranking por Marca Automotriz */}
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Car size={20} color="#38bdf8" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-strong)' }}>
              Ventas por Marca de Vehículo
            </h3>
          </div>

          <div>
            {porMarca.map((m, idx) => {
              const percentage = maxMarcaTotal > 0 ? (m.total / maxMarcaTotal) * 100 : 0;

              return (
                <div key={m.marca} className="ranking-item-card">
                  <div className="ranking-item-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {idx === 0 && <Award size={16} color="#fbbf24" />}
                      <strong style={{ color: 'var(--text-strong)', fontSize: '0.92rem' }}>
                        {m.marca}
                      </strong>
                    </div>
                    <span style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
                      Bs. {m.total.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="ranking-progress-track">
                    <div
                      className="ranking-progress-fill"
                      style={{
                        width: `${percentage}%`,
                        background: idx === 0 ? 'linear-gradient(90deg, #38bdf8, #3b82f6)' : 'linear-gradient(90deg, #818cf8, #c084fc)',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>{m.unidades} repuestos vendidos</span>
                    <span>Ranking #{idx + 1}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ranking por Modelo Específico */}
        <div className="chart-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <BarChart2 size={20} color="#34d399" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-strong)' }}>
              Modelos con Mayor Rotación
            </h3>
          </div>

          <div>
            {porVehiculo.slice(0, 6).map((v) => (
              <div key={`${v.marca}-${v.modelo}`} className="ranking-item-card">
                <div className="ranking-item-header">
                  <strong style={{ color: 'var(--text-strong)', fontSize: '0.88rem' }}>
                    {v.marca} {v.modelo}
                  </strong>
                  <span style={{ fontWeight: 700, color: '#34d399', fontFamily: 'monospace' }}>
                    {v.unidades} uds.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Facturado: <strong>Bs. {v.total.toFixed(2)}</strong></span>
                  <span>Líder de venta</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Productos Específicos */}
      <div className="chart-card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '1rem' }}>
          Top 5 Repuestos Estrella Más Vendidos
        </h3>

        <div className="table-responsive-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Ranking</th>
                <th>Repuesto</th>
                <th>Vehículo Compatible</th>
                <th>Unidades Vendidas</th>
                <th style={{ textAlign: 'right' }}>Total Facturado (Bs.)</th>
              </tr>
            </thead>
            <tbody>
              {topProductos.map((p, idx) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 700, color: idx === 0 ? '#fbbf24' : 'var(--text-muted)' }}>
                    #{idx + 1}
                  </td>
                  <td>
                    <strong style={{ color: 'var(--text-strong)' }}>{p.producto}</strong>
                  </td>
                  <td>
                    <span className="brand-pill">
                      {p.marca} {p.modelo}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: '#34d399' }}>{p.unidadesVendidas} uds.</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
                    Bs. {p.totalVendido.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
