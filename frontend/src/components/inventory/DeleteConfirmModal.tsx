import { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import type { Product } from '../../types/product.types';

interface DeleteConfirmModalProps {
  product: Product | null;
  onClose: () => void;
  onConfirm: (id: number) => Promise<void>;
}

export function DeleteConfirmModal({
  product,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  const [deleting, setDeleting] = useState(false);

  if (!product) return null;

  const handleConfirm = async () => {
    try {
      setDeleting(true);
      await onConfirm(product.id);
      onClose();
    } catch (err) {
      console.error('Error al eliminar producto:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div className="modal-dialog" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: '#f87171' }}>
            <AlertTriangle size={22} color="#f87171" />
            <span>Eliminar Repuesto</span>
          </h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text)', fontSize: '0.92rem', lineHeight: 1.5 }}>
            ¿Estás seguro de que deseas dar de baja el siguiente producto del inventario?
          </p>

          <div style={{ background: 'var(--bg-alt)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <strong style={{ color: 'var(--text-strong)', display: 'block' }}>
              {product.producto}
            </strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Código Fábrica: {product.codigoFabrica} • Marca: {product.marca} {product.modelo}
            </span>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#fca5a5' }}>
            ⚠️ Esta acción retirará el ítem de la vista activa de ventas e inventario.
          </p>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={deleting}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-danger-action"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Eliminando...</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>Confirmar Eliminación</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
