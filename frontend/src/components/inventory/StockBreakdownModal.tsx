import { useEffect, useState } from 'react';
import { X, Warehouse, Store, Boxes, Loader2 } from 'lucide-react';
import type { Product, LocationStock } from '../../types/product.types';
import { productsService } from '../../services/products.service';

interface StockBreakdownModalProps {
  product: Product | null;
  onClose: () => void;
}

export function StockBreakdownModal({ product, onClose }: StockBreakdownModalProps) {
  const [stockList, setStockList] = useState<LocationStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!product) return;

    let isMounted = true;
    const fetchStock = async () => {
      setLoading(true);
      try {
        const data = await productsService.getProductStock(product.id);
        if (isMounted) {
          setStockList(data);
        }
      } catch (err) {
        console.error('Error fetching stock breakdown:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStock();
    return () => {
      isMounted = false;
    };
  }, [product]);

  if (!product) return null;

  const totalCalculated = stockList.reduce((acc, curr) => acc + (curr.cantidad || 0), 0);

  return (
    <div className="modal-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <Boxes size={22} color="#38bdf8" />
            <span>Stock por Ubicación (7 Importadoras)</span>
          </h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Ficha Resumen del Producto */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-alt)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div className="product-thumb-box" style={{ width: '54px', height: '54px' }}>
              {product.imagen ? (
                <img src={product.imagen} alt={product.producto} className="product-thumb-img" />
              ) : (
                <Boxes size={24} className="product-thumb-fallback" />
              )}
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-strong)' }}>
                {product.producto}
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {product.marca} {product.modelo} ({product.anio || 'Todos'}) • OEM: {product.codigoOem || 'N/A'} • Fábrica: {product.codigoFabrica}
              </p>
            </div>
          </div>

          {/* Desglose de Stock */}
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem', gap: '0.75rem', color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="animate-spin" color="#38bdf8" />
              <span>Consultando existencias en almacenes y tiendas...</span>
            </div>
          ) : (
            <>
              <div className="stock-locations-list">
                {stockList.map((loc) => {
                  const isStore = loc.tipo === 'tienda';
                  const isLow = loc.cantidad === 0;

                  return (
                    <div key={loc.locationId} className="stock-location-row">
                      <div className="stock-loc-name">
                        {isStore ? (
                          <Store size={18} color="#60a5fa" />
                        ) : (
                          <Warehouse size={18} color="#a78bfa" />
                        )}
                        <div>
                          <span style={{ color: 'var(--text-strong)', display: 'block' }}>
                            {loc.ubicacion}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            {isStore ? 'Punto de Venta / Tienda' : 'Centro de Distribución / Almacén'}
                          </span>
                        </div>
                      </div>

                      <div className="stock-loc-qty">
                        <span
                          style={{
                            color: isLow ? '#f87171' : loc.cantidad <= 2 ? '#fbbf24' : '#34d399',
                            fontFamily: 'monospace',
                            fontSize: '1.1rem',
                          }}
                        >
                          {loc.cantidad} {loc.cantidad === 1 ? 'unidad' : 'unidades'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totalizador */}
              <div className="stock-total-recap-box">
                <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>
                  Inventario Total Consolidado:
                </span>
                <span
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: totalCalculated > 0 ? '#38bdf8' : '#f87171',
                  }}
                >
                  {totalCalculated} unidades
                </span>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
