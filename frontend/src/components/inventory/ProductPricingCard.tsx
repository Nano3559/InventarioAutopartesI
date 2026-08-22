import { DollarSign } from 'lucide-react';
import type { Product } from '../../types/product.types';

interface ProductPricingCardProps {
  product: Product;
}

export function ProductPricingCard({ product }: ProductPricingCardProps) {
  const costo = product.costo || 0;

  const calculateMargin = (price?: number | null) => {
    if (!price || costo <= 0) return null;
    const margin = ((price - costo) / costo) * 100;
    return margin.toFixed(1);
  };

  const margin1 = calculateMargin(product.precio1);
  const margin2 = calculateMargin(product.precio2);
  const marginMayor = calculateMargin(product.precioMayor);

  return (
    <div className="pricing-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <DollarSign size={20} color="#38bdf8" />
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-strong)' }}>
          Análisis de Costos y Precios
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {/* Costo de Adquisición */}
        <div className="pricing-row-item">
          <div className="pricing-label-group">
            <span className="pricing-name">Costo Base de Compra</span>
            <span className="pricing-hint">Factura de proveedor</span>
          </div>
          <div className="pricing-value-group">
            <span className="pricing-number" style={{ color: '#94a3b8' }}>
              Bs. {costo.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Precio 1 */}
        <div className="pricing-row-item">
          <div className="pricing-label-group">
            <span className="pricing-name">Precio 1 (Mostrador / Minorista)</span>
            <span className="pricing-hint">Público general en tienda</span>
          </div>
          <div className="pricing-value-group">
            <span className="pricing-number" style={{ color: '#38bdf8' }}>
              Bs. {product.precio1 ? product.precio1.toFixed(2) : '-'}
            </span>
            {margin1 && (
              <span className="margin-pill" title="Margen de rentabilidad sobre costo">
                +{margin1}%
              </span>
            )}
          </div>
        </div>

        {/* Precio 2 */}
        <div className="pricing-row-item">
          <div className="pricing-label-group">
            <span className="pricing-name">Precio 2 (Taller / Preferencial)</span>
            <span className="pricing-hint">Talleres mecánicos y clientes frecuentes</span>
          </div>
          <div className="pricing-value-group">
            <span className="pricing-number" style={{ color: '#60a5fa' }}>
              Bs. {product.precio2 ? product.precio2.toFixed(2) : '-'}
            </span>
            {margin2 && (
              <span className="margin-pill" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                +{margin2}%
              </span>
            )}
          </div>
        </div>

        {/* Precio Mayorista */}
        <div className="pricing-row-item">
          <div className="pricing-label-group">
            <span className="pricing-name">Precio Mayorista</span>
            <span className="pricing-hint">Venta por volumen / B6</span>
          </div>
          <div className="pricing-value-group">
            <span className="pricing-number" style={{ color: '#a78bfa' }}>
              Bs. {product.precioMayor ? product.precioMayor.toFixed(2) : '-'}
            </span>
            {marginMayor && (
              <span className="margin-pill" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a78bfa', borderColor: 'rgba(168, 85, 247, 0.3)' }}>
                +{marginMayor}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
