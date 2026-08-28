import { useState } from 'react';
import {
  Edit2,
  DollarSign,
  X,
  Check,
  Loader2,
  Boxes,
} from 'lucide-react';
import type { FilaPrecio, UpdatePreciosDto } from '../../types/precio.types';

interface PreciosTableProps {
  precios: FilaPrecio[];
  loading: boolean;
  onUpdatePrecio: (id: number, dto: UpdatePreciosDto) => Promise<void>;
}

export function PreciosTable({
  precios,
  loading,
  onUpdatePrecio,
}: PreciosTableProps) {
  const [editingItem, setEditingItem] = useState<FilaPrecio | null>(null);

  // Estados del modal de edición
  const [p1, setP1] = useState<string>('');
  const [p2, setP2] = useState<string>('');
  const [pMayor, setPMayor] = useState<string>('');

  const [saving, setSaving] = useState(false);

  const calculateMargin = (costo: number, price?: number | null) => {
    if (!price || costo <= 0) return null;
    const margin = ((price - costo) / costo) * 100;
    return margin.toFixed(1);
  };

  const handleOpenEdit = (item: FilaPrecio) => {
    setEditingItem(item);
    setP1(item.precio1 ? String(item.precio1) : '');
    setP2(item.precio2 ? String(item.precio2) : '');
    setPMayor(item.precioMayor ? String(item.precioMayor) : '');
  };

  const handleQuickMargin = (type: 'p1' | 'p2' | 'mayor', percent: number) => {
    if (!editingItem || editingItem.costo <= 0) return;
    const calculated = (editingItem.costo * (1 + percent / 100)).toFixed(2);
    if (type === 'p1') setP1(calculated);
    if (type === 'p2') setP2(calculated);
    if (type === 'mayor') setPMayor(calculated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setSaving(true);
      await onUpdatePrecio(editingItem.id, {
        precio1: p1 ? parseFloat(p1) : null,
        precio2: p2 ? parseFloat(p2) : null,
        precioMayor: pMayor ? parseFloat(pMayor) : null,
      });
      setEditingItem(null);
    } catch (err) {
      console.error('Error al guardar precios:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inventory-table-container">
      {loading ? (
        <div className="table-empty-state">
          <Boxes size={36} className="table-empty-icon animate-spin" color="#38bdf8" />
          <p>Cargando lista de precios y márgenes...</p>
        </div>
      ) : precios.length === 0 ? (
        <div className="table-empty-state">
          <p>No se encontraron productos con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="table-responsive-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Repuesto / Aplicación</th>
                <th>Código Fábrica / OEM</th>
                <th>Costo Base</th>
                <th>Precio 1 (Mostrador)</th>
                <th>Precio 2 (Taller)</th>
                <th>Precio Mayorista</th>
                <th>Stock</th>
                <th style={{ textAlign: 'right' }}>Editar</th>
              </tr>
            </thead>
            <tbody>
              {precios.map((p) => {
                const margin1 = calculateMargin(p.costo, p.precio1);
                const margin2 = calculateMargin(p.costo, p.precio2);
                const marginMayor = calculateMargin(p.costo, p.precioMayor);

                return (
                  <tr key={p.id}>
                    {/* Repuesto */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ color: 'var(--text-strong)' }}>
                          {p.producto}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {p.marca} {p.modelo} {p.anio ? `(${p.anio})` : ''} • Fab: {p.fabricante}
                        </span>
                      </div>
                    </td>

                    {/* Códigos */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-strong)' }}>
                          {p.codigoFabrica}
                        </span>
                        {p.codigoOem && (
                          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            OEM: {p.codigoOem}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Costo Base */}
                    <td>
                      <span style={{ fontFamily: 'monospace', color: '#94a3b8', fontWeight: 600 }}>
                        Bs. {p.costo ? p.costo.toFixed(2) : '0.00'}
                      </span>
                    </td>

                    {/* Precio 1 */}
                    <td>
                      <div className="price-cell-box">
                        <span className="price-main-val" style={{ color: '#38bdf8' }}>
                          Bs. {p.precio1 ? p.precio1.toFixed(2) : '—'}
                        </span>
                        {margin1 && (
                          <span className="margin-chip p1">
                            +{margin1}%
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Precio 2 */}
                    <td>
                      <div className="price-cell-box">
                        <span className="price-main-val" style={{ color: '#60a5fa' }}>
                          Bs. {p.precio2 ? p.precio2.toFixed(2) : '—'}
                        </span>
                        {margin2 && (
                          <span className="margin-chip p2">
                            +{margin2}%
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Precio Mayorista */}
                    <td>
                      <div className="price-cell-box">
                        <span className="price-main-val" style={{ color: '#a78bfa' }}>
                          Bs. {p.precioMayor ? p.precioMayor.toFixed(2) : '—'}
                        </span>
                        {marginMayor && (
                          <span className="margin-chip mayor">
                            +{marginMayor}%
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Stock */}
                    <td>
                      <span className="stock-badge in-stock">
                        {p.stockTotal} uds.
                      </span>
                    </td>

                    {/* Acción */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-table-action edit-btn"
                        onClick={() => handleOpenEdit(p)}
                        title="Modificar precios y márgenes"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Edición Individual de Precios */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)} aria-modal="true" role="dialog">
          <div className="modal-dialog" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <DollarSign size={20} color="#38bdf8" />
                <span>Modificar Precios — #{editingItem.id}</span>
              </h3>
              <button type="button" className="modal-close-btn" onClick={() => setEditingItem(null)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div style={{ padding: '0.75rem', background: 'var(--bg-alt)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
                  <strong style={{ color: 'var(--text-strong)', display: 'block' }}>{editingItem.producto}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {editingItem.marca} {editingItem.modelo} • Costo Base: <strong>Bs. {editingItem.costo.toFixed(2)}</strong>
                  </span>
                </div>

                {/* Precio 1 */}
                <div className="price-edit-row">
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: '#38bdf8' }}>Precio 1 (Mostrador)</strong>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Público general</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="Bs."
                    value={p1}
                    onChange={(e) => setP1(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.4rem' }}
                    onClick={() => handleQuickMargin('p1', 30)}
                    title="Aplicar +30% sobre costo"
                  >
                    +30%
                  </button>
                </div>

                {/* Precio 2 */}
                <div className="price-edit-row">
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: '#60a5fa' }}>Precio 2 (Taller)</strong>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Talleres mecánicos</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="Bs."
                    value={p2}
                    onChange={(e) => setP2(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.4rem' }}
                    onClick={() => handleQuickMargin('p2', 20)}
                    title="Aplicar +20% sobre costo"
                  >
                    +20%
                  </button>
                </div>

                {/* Precio Mayor */}
                <div className="price-edit-row" style={{ marginBottom: 0 }}>
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: '#a78bfa' }}>Precio Mayorista</strong>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Por volumen</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="Bs."
                    value={pMayor}
                    onChange={(e) => setPMayor(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.4rem' }}
                    onClick={() => handleQuickMargin('mayor', 15)}
                    title="Aplicar +15% sobre costo"
                  >
                    +15%
                  </button>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setEditingItem(null)} disabled={saving}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary-action"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Actualizar Precios</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
