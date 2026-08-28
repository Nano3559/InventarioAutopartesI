import { useState } from 'react';
import { X, Check, Loader2, Sparkles } from 'lucide-react';
import type { BulkMarginConfig } from '../../types/precio.types';

interface BulkMarginModalProps {
  isOpen: boolean;
  onClose: () => void;
  marcas: string[];
  onApply: (config: BulkMarginConfig) => Promise<void>;
}

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setApplying(true);
      await onApply({
        marca: selectedMarca || undefined,
        margenP1: Number(margenP1),
        margenP2: Number(margenP2),
        margenMayor: Number(margenMayor),
      });
      onClose();
    } catch (err) {
      console.error('Error aplicando márgenes masivos:', err);
    } finally {
      setApplying(false);
    }
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
                  className="form-input"
                  style={{ paddingLeft: '0.85rem' }}
                  value={margenP1}
                  onChange={(e) => setMargenP1(parseInt(e.target.value, 10) || 0)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#60a5fa' }}>% Precio 2</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="form-input"
                  style={{ paddingLeft: '0.85rem' }}
                  value={margenP2}
                  onChange={(e) => setMargenP2(parseInt(e.target.value, 10) || 0)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#a78bfa' }}>% Mayorista</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="form-input"
                  style={{ paddingLeft: '0.85rem' }}
                  value={margenMayor}
                  onChange={(e) => setMargenMayor(parseInt(e.target.value, 10) || 0)}
                  required
                />
              </div>
            </div>
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
