import { useState } from 'react';
import { X, Check, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import type { BulkMarginConfig } from '../../types/precio.types';

interface BulkMarginModalProps {
  isOpen: boolean;
  onClose: () => void;
  marcas: string[];
  onApply: (config: BulkMarginConfig) => Promise<void>;
}

const MAX_MARGEN = 500;
const MIN_MARGEN = 0;

export function BulkMarginModal({
  isOpen,
  onClose,
  marcas,
  onApply,
}: BulkMarginModalProps) {
  const [selectedMarca, setSelectedMarca] = useState<string>('');
  const [margenP1, setMargenP1] = useState<number>(30);
  const [margenP2, setMargenP2] = useState<number>(20);
  const [margenMayor, setMargenMayor] = useState<number>(15);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const clampMargen = (v: number) => Math.min(MAX_MARGEN, Math.max(MIN_MARGEN, v));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p1 = Number(margenP1);
    const p2 = Number(margenP2);
    const pM = Number(margenMayor);

    if (!Number.isFinite(p1) || !Number.isFinite(p2) || !Number.isFinite(pM)) {
      setError('Todos los porcentajes deben ser números válidos');
      return;
    }
    if (p1 < MIN_MARGEN || p2 < MIN_MARGEN || pM < MIN_MARGEN || p1 > MAX_MARGEN || p2 > MAX_MARGEN || pM > MAX_MARGEN) {
      setError(`El margen debe estar entre ${MIN_MARGEN} y ${MAX_MARGEN}%`);
      return;
    }

    try {
      setApplying(true);
      setError(null);
      await onApply({
        marca: selectedMarca || undefined,
        margenP1: p1,
        margenP2: p2,
        margenMayor: pM,
      });
      onClose();
    } catch (err) {
      setError((err as Error)?.message || 'Error aplicando márgenes masivos');
      console.error('Error aplicando márgenes masivos:', err);
    } finally {
      setApplying(false);
    }
  };

  const handleMargenChange = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    value: string
  ) => {
    const parsed = parseInt(value, 10);
    setter(Number.isFinite(parsed) ? clampMargen(parsed) : MIN_MARGEN);
  };

  return (
    <div className="modal-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div className="modal-dialog" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <Sparkles size={20} color="#38bdf8" />
            <span>Ajuste Masivo de Márgenes</span>
          </h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Recalcula los precios de venta de los repuestos aplicando un porcentaje de rentabilidad sobre el costo base de adquisición.
            </p>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Aplicar a la Marca:</label>
              <select
                className="filter-select"
                value={selectedMarca}
                onChange={(e) => setSelectedMarca(e.target.value)}
              >
                <option value="">Todo el catálogo (Todas las marcas)</option>
                {marcas.map((m) => (
                  <option key={m} value={m}>Solo vehículos {m}</option>
                ))}
              </select>
            </div>

            <div className="form-grid-3cols" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ color: '#38bdf8' }}>% Precio 1</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max={String(MAX_MARGEN)}
                  className="form-input"
                  style={{ paddingLeft: '0.85rem' }}
                  value={margenP1}
                  onChange={(e) => handleMargenChange(setMargenP1, e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#60a5fa' }}>% Precio 2</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max={String(MAX_MARGEN)}
                  className="form-input"
                  style={{ paddingLeft: '0.85rem' }}
                  value={margenP2}
                  onChange={(e) => handleMargenChange(setMargenP2, e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#a78bfa' }}>% Mayorista</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max={String(MAX_MARGEN)}
                  className="form-input"
                  style={{ paddingLeft: '0.85rem' }}
                  value={margenMayor}
                  onChange={(e) => handleMargenChange(setMargenMayor, e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.75rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: '#ef4444',
                fontSize: '0.8rem',
              }}>
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={applying}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary-action"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              disabled={applying}
            >
              {applying ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Calculando y Aplicando...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Aplicar a Catálogo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
