import { useState, useEffect } from 'react';
import { X, ArrowUpDown, Save, Loader2, Plus, Minus } from 'lucide-react';
import type { Product, LocationItem } from '../../types/product.types';
import { locationsService } from '../../services/locations.service';
import { productsService } from '../../services/products.service';

interface AddStockModalProps {
  product: Product | null;
  onClose: () => void;
  onStockUpdated: () => void;
}

export function AddStockModal({ product, onClose, onStockUpdated }: AddStockModalProps) {
  if (!product) return null;

  return (
    <AddStockModalContent
      key={`add-stock-${product.id}`}
      product={product}
      onClose={onClose}
      onStockUpdated={onStockUpdated}
    />
  );
}

function AddStockModalContent({
  product,
  onClose,
  onStockUpdated,
}: {
  product: Product;
  onClose: () => void;
  onStockUpdated: () => void;
}) {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number>(0);
  const [cantidad, setCantidad] = useState<number>(1);
  const [modo, setModo] = useState<'sumar' | 'restar'>('sumar');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    locationsService.getLocations().then((locs) => {
      setLocations(locs);
      if (locs.length > 0) setSelectedLocationId(locs[0].id);
    }).catch(() => setLocations([]));
  }, []);

  const currentStock = product.stockByLocation?.[selectedLocationId] ?? 0;
  const delta = modo === 'sumar' ? cantidad : -cantidad;
  const newTotal = Math.max(0, currentStock + delta);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocationId) {
      setError('Selecciona una ubicación');
      return;
    }
    if (cantidad <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }
    if (modo === 'restar' && cantidad > currentStock) {
      setError(`No puedes reducir más de lo que hay. Stock actual: ${currentStock}`);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await productsService.adjustStock(product.id, selectedLocationId, delta);
      onStockUpdated();
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Error al actualizar stock');
    } finally {
      setSaving(false);
    }
  };

  const almacenes = locations.filter((l) => l.tipo === 'almacen');
  const tiendas = locations.filter((l) => l.tipo === 'tienda');

  return (
    <div className="modal-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div className="modal-dialog" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <ArrowUpDown size={22} color="#38bdf8" />
            <span>Ajustar Stock</span>
          </h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert-error" style={{ marginBottom: '1rem' }}>
                <span>{error}</span>
              </div>
            )}

            {/* Info del producto */}
            <div style={{
              padding: '0.75rem 1rem',
              background: 'var(--bg-alt)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              marginBottom: '1.25rem',
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-strong)' }}>
                {product.producto}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
                {product.marca} {product.modelo} • Stock total: {product.stockTotal} uds.
              </span>
            </div>

            {/* Selector de ubicación */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Ubicación *</label>
              <select
                className="filter-select"
                style={{ padding: '0.75rem 1rem', fontSize: '0.92rem' }}
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(Number(e.target.value))}
                required
              >
                <option value={0} disabled>Seleccionar ubicación...</option>
                {almacenes.length > 0 && (
                  <optgroup label="Almacenes">
                    {almacenes.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nombre} (actual: {product.stockByLocation?.[l.id] ?? 0} uds.)
                      </option>
                    ))}
                  </optgroup>
                )}
                {tiendas.length > 0 && (
                  <optgroup label="Tiendas">
                    {tiendas.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nombre} (actual: {product.stockByLocation?.[l.id] ?? 0} uds.)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Modo: Sumar / Restar */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Operación *</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setModo('sumar')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.7rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `2px solid ${modo === 'sumar' ? '#10b981' : 'var(--border)'}`,
                    background: modo === 'sumar' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg)',
                    color: modo === 'sumar' ? '#10b981' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <Plus size={18} />
                  <span>Sumar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModo('restar')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.7rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `2px solid ${modo === 'restar' ? '#ef4444' : 'var(--border)'}`,
                    background: modo === 'restar' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg)',
                    color: modo === 'restar' ? '#ef4444' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <Minus size={18} />
                  <span>Restar</span>
                </button>
              </div>
            </div>

            {/* Cantidad */}
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Cantidad *</label>
              <input
                type="number"
                min="1"
                className="form-input"
                style={{ paddingLeft: '1rem', fontSize: '1.1rem', fontWeight: 700 }}
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))}
                required
              />
              {selectedLocationId > 0 && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                  Stock: <strong>{currentStock}</strong>{' '}
                  <span style={{ color: modo === 'sumar' ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                    {modo === 'sumar' ? `+ ${cantidad}` : `- ${cantidad}`}
                  </span>
                  {' '}→ <strong style={{ color: newTotal === 0 ? '#ef4444' : 'var(--text-strong)' }}>{newTotal}</strong> uds.
                </span>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary-action"
              disabled={saving || !selectedLocationId}
              style={modo === 'restar' ? { background: '#ef4444' } : undefined}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{modo === 'sumar' ? 'Sumar Stock' : 'Restar Stock'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
