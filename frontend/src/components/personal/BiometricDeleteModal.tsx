import { useState } from 'react';
import { X, ShieldAlert, AlertTriangle, Loader2 } from 'lucide-react';
import type { UserItem } from '../../types/user.types';

interface BiometricDeleteModalProps {
  user: UserItem | null;
  onClose: () => void;
  onConfirm: (userId: number) => Promise<void>;
}

export function BiometricDeleteModal({
  user,
  onClose,
  onConfirm,
}: BiometricDeleteModalProps) {
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm(user.id);
      onClose();
    } catch (err) {
      console.error('Error al eliminar datos biométricos:', err);
    } finally {
      setLoading(false);
    }
  };

  const nombreMostrar = [user.nombre, user.apellido].filter(Boolean).join(' ') || user.email;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-dialog"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldAlert size={22} color="#f87171" />
            <h3 className="modal-title">Supresión de Datos Biométricos</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Cerrar modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.25rem' }}>
          <div
            style={{
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1rem',
              display: 'flex',
              gap: '0.75rem',
            }}
          >
            <AlertTriangle size={20} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
              ¿Estás seguro de que deseas eliminar permanentemente el registro facial de{' '}
              <strong style={{ color: '#ffffff' }}>{nombreMostrar}</strong>?
            </div>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Esta acción ejercerá el <strong>derecho de supresión biométrica</strong> (Ley 26935):
          </p>
          <ul
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              paddingLeft: '1.25rem',
              marginTop: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
            }}
          >
            <li>Se eliminará el vector de embedding facial de la base de datos.</li>
            <li>Se removerá la fotografía almacenada en el bucket privado.</li>
            <li>El usuario no podrá marcar asistencia con reconocimiento facial hasta que sea re-registrado.</li>
          </ul>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-danger-action"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            <span>{loading ? 'Eliminando...' : 'Confirmar Supresión'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
