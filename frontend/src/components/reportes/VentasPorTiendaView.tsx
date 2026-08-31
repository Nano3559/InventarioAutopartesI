import { Store, ShoppingCart, Award } from 'lucide-react';
import type { VentasPorTienda, StockUbicacion } from '../../types/reporte.types';

interface VentasPorTiendaViewProps {
  tiendasVentas: VentasPorTienda[];
  tiendasStock: StockUbicacion[];
}

export function VentasPorTiendaView({
  tiendasVentas,
  tiendasStock,
}: VentasPorTiendaViewProps) {
  const totalFacturado = tiendasVentas.reduce((acc, t) => acc + t.total, 0);

  return (
    <div className="ranking-grid-2cols">
      {/* Columna 1: Facturación y Participación de Ventas */}
      <div className="chart-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Store size={20} color="#38bdf8" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-strong)' }}>
            Rendimiento en Ventas por Sucursal
          </h3>
        </div>

        <div>
          {tiendasVentas.map((tienda, idx) => {
            const percentage = totalFacturado > 0 ? (tienda.total / totalFacturado) * 100 : 0;
            const ticketPromedio = tienda.cantidad > 0 ? tienda.total / tienda.cantidad : 0;

            return (
              <div key={tienda.locationId} className="ranking-item-card">
                <div className="ranking-item-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {idx === 0 && <Award size={16} color="#fbbf24" />}
                    <strong style={{ color: 'var(--text-strong)', fontSize: '0.9rem' }}>
                      {tienda.nombre}
                    </strong>
                  </div>
                  <span style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
                    Bs. {tienda.total.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="ranking-progress-track">
                  <div
                    className="ranking-progress-fill"
                    style={{
                      width: `${percentage}%`,
                      background: idx === 0 ? 'linear-gradient(90deg, #38bdf8, #3b82f6)' : 'linear-gradient(90deg, #60a5fa, #93c5fd)',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>{tienda.cantidad} ventas • Ticket prom: Bs. {ticketPromedio.toFixed(2)}</span>
                  <strong>{percentage.toFixed(1)}% del total</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Columna 2: Existencias Físicas en Tiendas */}
      <div className="chart-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <ShoppingCart size={20} color="#34d399" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-strong)' }}>
            Nivel de Stock Disponible en Mostrador
          </h3>
        </div>

        <div>
          {tiendasStock.map((loc) => (
            <div key={loc.locationId} className="ranking-item-card">
              <div className="ranking-item-header">
                <strong style={{ color: 'var(--text-strong)', fontSize: '0.9rem' }}>
                  {loc.nombre}
                </strong>
                <span style={{ fontWeight: 700, color: '#34d399', fontFamily: 'monospace' }}>
                  {loc.totalStock} unidades
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <span>Variedad de catálogo: <strong>{loc.productos} productos</strong></span>
                <span className="stock-badge in-stock" style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem' }}>
                  Activa
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
