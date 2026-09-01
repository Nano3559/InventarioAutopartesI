import { useEffect, useState, useMemo } from 'react';
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

  const almacenes = useMemo(
    () => stockList.filter((l) => l.tipo === 'almacen'),
    [stockList]
  );
  const tiendas = useMemo(
    () => stockList.filter((l) => l.tipo === 'tienda'),
    [stockList]
  );

  const totalAlmacenes = almacenes.reduce((acc, c) => acc + (c.cantidad || 0), 0);
  const totalTiendas = tiendas.reduce((acc, c) => acc + (c.cantidad || 0), 0);
  const totalCalculated = totalAlmacenes + totalTiendas;

  if (!product) return null;

  return (
    <div className="modal-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <Boxes size={22} color="#38bdf8" />
            <span>Stock por Ubicación</span>
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
          <div className="stock-product-summary">
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

          {loading ? (
            <div className="stock-loading-state">
              <Loader2 size={24} className="animate-spin" color="#38bdf8" />
              <span>Consultando existencias...</span>
            </div>
          ) : (
            <>
              {/* Almacenes */}
              {almacenes.length > 0 && (
                <div className="stock-section">
                  <div className="stock-section-header stock-section-header--almacen">
                    <Warehouse size={16} color="#a78bfa" />
                    <span>Almacenes</span>
                    <span className="stock-section-total">{totalAlmacenes} uds.</span>
                  </div>
                  <div className="stock-section-list">
                    {almacenes.map((loc) => (
                      <div key={loc.locationId} className="stock-location-row">
                        <div className="stock-loc-name">
                          <span className="stock-loc-name-text">{loc.ubicacion}</span>
                        </div>
                        <div className="stock-loc-qty">
                          <span
                            className={`stock-qty ${
                              loc.cantidad === 0 ? 'stock-qty--zero' :
                              loc.cantidad <= 2 ? 'stock-qty--low' :
                              'stock-qty--ok'
                            }`}
                          >
                            {loc.cantidad}
                          </span>
                          <span className="stock-qty-label">
                            {loc.cantidad === 1 ? 'ud.' : 'uds.'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tiendas */}
              {tiendas.length > 0 && (
                <div className="stock-section">
                  <div className="stock-section-header stock-section-header--tienda">
                    <Store size={16} color="#60a5fa" />
                    <span>Tiendas</span>
                    <span className="stock-section-total">{totalTiendas} uds.</span>
                  </div>
                  <div className="stock-section-list">
                    {tiendas.map((loc) => (
                      <div key={loc.locationId} className="stock-location-row">
                        <div className="stock-loc-name">
                          <span className="stock-loc-name-text">{loc.ubicacion}</span>
                        </div>
                        <div className="stock-loc-qty">
                          <span
                            className={`stock-qty ${
                              loc.cantidad === 0 ? 'stock-qty--zero' :
                              loc.cantidad <= 2 ? 'stock-qty--low' :
                              'stock-qty--ok'
                            }`}
                          >
                            {loc.cantidad}
                          </span>
                          <span className="stock-qty-label">
                            {loc.cantidad === 1 ? 'ud.' : 'uds.'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Consolidado */}
              <div className="stock-total-recap-box">
                <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>
                  Total Consolidado
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
