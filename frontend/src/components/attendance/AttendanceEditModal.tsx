import { useState } from 'react';
import { X, Clock, Edit2, Loader2, Store, User } from 'lucide-react';
import type { AttendanceItem, UpdateAttendanceDto, TipoAsistencia, MetodoAsistencia } from '../../types/attendance.types';
import type { LocationItem } from '../../types/product.types';

interface AttendanceEditModalProps {
  record: AttendanceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, data: UpdateAttendanceDto) => Promise<void>;
  locations: LocationItem[];
}

interface InnerProps {
  record: AttendanceItem;
  onClose: () => void;
  onSave: (id: number, data: UpdateAttendanceDto) => Promise<void>;
  locations: LocationItem[];
}

function formatDateForInput(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    // Format YYYY-MM-DDTHH:mm
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

function AttendanceEditInner({ record, onClose, onSave, locations }: InnerProps) {
  const [tipo, setTipo] = useState<TipoAsistencia>(record.tipo);
  const [metodo, setMetodo] = useState<MetodoAsistencia>(record.metodo);
  const [locationId, setLocationId] = useState<string>(
    record.locationId ? String(record.locationId) : ''
  );
  const [fechaLocal, setFechaLocal] = useState<string>(formatDateForInput(record.fecha));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const payload: UpdateAttendanceDto = {
        tipo,
        metodo,
        locationId: locationId ? Number(locationId) : null,
      };

      if (fechaLocal) {
        const d = new Date(fechaLocal);
        if (!Number.isNaN(d.getTime())) {
          payload.fecha = d.toISOString();
        }
      }

      await onSave(record.id, payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar marcaje');
    } finally {
      setLoading(false);
    }
  };

  const tiendasList = locations.filter((l) => l.tipo === 'tienda');

  return (
    <div className="modal-dialog" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Edit2 size={20} color="#38bdf8" />
          <h3 className="modal-title">Corregir Marcaje de Asistencia #{record.id}</h3>
        </div>
        <button type="button" className="modal-close-btn" onClick={onClose} title="Cerrar modal">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="modal-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: '#f87171',
                fontSize: '0.84rem',
              }}
            >
              {error}
            </div>
          )}

          {/* Info del Empleado (Solo lectura) */}
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--bg-alt)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <User size={18} color="var(--accent)" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-strong)' }}>
                {record.nombreCompleto || 'Empleado'}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {record.usuario?.email || 'ID: ' + record.usuarioId}
              </div>
            </div>
          </div>

          {/* Tipo de Marcaje */}
          <div>
            <label className="form-label">Tipo de Marcaje *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                className={`btn-secondary ${tipo === 'entrada' ? 'active' : ''}`}
                style={{
                  justifyContent: 'center',
                  background: tipo === 'entrada' ? 'rgba(16, 185, 129, 0.2)' : undefined,
                  borderColor: tipo === 'entrada' ? '#10b981' : undefined,
                  color: tipo === 'entrada' ? '#34d399' : undefined,
                }}
                onClick={() => setTipo('entrada')}
              >
                ENTRADA
              </button>
              <button
                type="button"
                className={`btn-secondary ${tipo === 'salida' ? 'active' : ''}`}
                style={{
                  justifyContent: 'center',
                  background: tipo === 'salida' ? 'rgba(245, 158, 11, 0.2)' : undefined,
                  borderColor: tipo === 'salida' ? '#f59e0b' : undefined,
                  color: tipo === 'salida' ? '#fbbf24' : undefined,
                }}
                onClick={() => setTipo('salida')}
              >
                SALIDA
              </button>
            </div>
          </div>

          {/* Fecha y Hora */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={14} />
              <span>Fecha y Hora del Marcaje *</span>
            </label>
            <input
              type="datetime-local"
              className="form-input"
              value={fechaLocal}
              onChange={(e) => setFechaLocal(e.target.value)}
              required
            />
          </div>

          {/* Sucursal / Tienda */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Store size={14} />
              <span>Sucursal / Tienda</span>
            </label>
            <select
              className="form-select"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="">Sin tienda asignada</option>
              {tiendasList.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre} ({l.codigo})
                </option>
              ))}
            </select>
          </div>

          {/* Método */}
          <div>
            <label className="form-label">Método de Registro</label>
            <select
              className="form-select"
              value={metodo}
              onChange={(e) => setMetodo(e.target.value as MetodoAsistencia)}
            >
              <option value="manual">Manual (Ajuste administrativo)</option>
              <option value="automatico">Automático (Reconocimiento Facial)</option>
            </select>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
              Al guardar como manual, el sistema anulará el score de confianza y registrará al administrador confirmador.
            </span>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            <span>Guardar Corrección</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export function AttendanceEditModal({
  record,
  isOpen,
  onClose,
  onSave,
  locations,
}: AttendanceEditModalProps) {
  if (!isOpen || !record) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <AttendanceEditInner
        key={record.id}
        record={record}
        onClose={onClose}
        onSave={onSave}
        locations={locations}
      />
    </div>
  );
}
