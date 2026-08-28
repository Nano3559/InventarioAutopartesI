import { useState } from 'react';
import { X, Building2, Plus, Loader2, Globe, Phone } from 'lucide-react';
import type { CreateProveedorDto } from '../../types/costo.types';

interface ProveedorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dto: CreateProveedorDto) => Promise<void>;
}

export function ProveedorModal({ isOpen, onClose, onSave }: ProveedorModalProps) {
  const [nombre, setNombre] = useState('');
  const [pais, setPais] = useState('Bolivia');
  const [contacto, setContacto] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre de la empresa proveedora es obligatorio.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSave({
        nombre: nombre.trim(),
        pais: pais.trim() || 'Bolivia',
        contacto: contacto.trim() || undefined,
      });
      // Limpiar y cerrar
      setNombre('');
      setContacto('');
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Error al guardar proveedor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div className="modal-dialog" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <Building2 size={20} color="#38bdf8" />
            <span>Nuevo Proveedor de Autopartes</span>
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

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Nombre de la Empresa / Fabricante *</label>
              <div className="form-input-wrapper">
                <Building2 size={16} className="form-input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Denso Corporation, Bosch, Brembo..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">País de Origen *</label>
              <div className="form-input-wrapper">
                <Globe size={16} className="form-input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. Japón, Alemania, Taiwán, Bolivia..."
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Contacto / Teléfono / Correo</label>
              <div className="form-input-wrapper">
                <Phone size={16} className="form-input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej. +591 77234567 / contacto@proveedor.com"
                  value={contacto}
                  onChange={(e) => setContacto(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary-action"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Registrar Proveedor</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
