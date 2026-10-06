import { useState } from 'react';
import { X, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import type { UserItem, CreateUserDto, UpdateUserDto } from '../../types/user.types';
import type { LocationItem } from '../../types/product.types';

interface PersonalFormModalProps {
  userToEdit: UserItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateUserDto | UpdateUserDto) => Promise<void>;
  locations: LocationItem[];
}

interface FormInnerProps {
  userToEdit: UserItem | null;
  onClose: () => void;
  onSave: (data: CreateUserDto | UpdateUserDto) => Promise<void>;
  locations: LocationItem[];
}

function PersonalFormInner({ userToEdit, onClose, onSave, locations }: FormInnerProps) {
  const [nombre, setNombre] = useState(userToEdit?.nombre || '');
  const [apellido, setApellido] = useState(userToEdit?.apellido || '');
  const [email, setEmail] = useState(userToEdit?.email || '');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<'admin' | 'tienda' | 'inventario'>(userToEdit?.rol || 'tienda');
  const [tiendaId, setTiendaId] = useState<string>(
    userToEdit?.tiendaId ? String(userToEdit.tiendaId) : ''
  );
  const [activo, setActivo] = useState(userToEdit?.activo ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError('El nombre es obligatorio (mínimo 2 caracteres).');
      return;
    }
    if (!email.trim()) {
      setError('El correo electrónico es obligatorio.');
      return;
    }
    if (!userToEdit && !password.trim()) {
      setError('La contraseña es obligatoria para nuevos empleados.');
      return;
    }

    try {
      setLoading(true);
      if (userToEdit) {
        const updatePayload: UpdateUserDto = {
          nombre: nombre.trim(),
          apellido: apellido.trim() || null,
          email: email.trim(),
          rol,
          tiendaId: tiendaId ? Number(tiendaId) : null,
          activo,
        };
        if (password.trim()) {
          updatePayload.password = password.trim();
        }
        await onSave(updatePayload);
      } else {
        const createPayload: CreateUserDto = {
          nombre: nombre.trim(),
          apellido: apellido.trim() || undefined,
          email: email.trim(),
          password: password.trim(),
          rol,
          tiendaId: tiendaId ? Number(tiendaId) : null,
          activo,
        };
        await onSave(createPayload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar los datos del personal');
    } finally {
      setLoading(false);
    }
  };

  const tiendasList = locations.filter((l) => l.tipo === 'tienda');

  return (
    <div className="modal-dialog" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {userToEdit ? <UserCheck size={22} color="#38bdf8" /> : <UserPlus size={22} color="#38bdf8" />}
          <h3 className="modal-title">
            {userToEdit ? 'Editar Datos de Personal' : 'Nuevo Registro de Personal'}
          </h3>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label className="form-label">Nombre *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Carlos"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label">Apellido</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Mamani"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Correo Electrónico *</label>
            <input
              type="email"
              className="form-input"
              placeholder="empleado@autopartes.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="form-label">
              {userToEdit ? 'Nueva Contraseña (dejar en blanco para no cambiar)' : 'Contraseña *'}
            </label>
            <input
              type="password"
              className="form-input"
              placeholder={userToEdit ? '••••••••' : 'Mínimo 6 caracteres'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label className="form-label">Rol del Usuario *</label>
              <select
                className="form-select"
                value={rol}
                onChange={(e) => setRol(e.target.value as 'admin' | 'tienda' | 'inventario')}
              >
                <option value="tienda">Tienda / Vendedor</option>
                <option value="inventario">Inventario / Almacén</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div>
              <label className="form-label">Tienda Asignada</label>
              <select
                className="form-select"
                value={tiendaId}
                onChange={(e) => setTiendaId(e.target.value)}
              >
                <option value="">Sin tienda asignada</option>
                {tiendasList.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.25rem' }}>
            <input
              type="checkbox"
              id="user-activo"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <label htmlFor="user-activo" style={{ fontSize: '0.85rem', color: 'var(--text)', cursor: 'pointer' }}>
              Usuario activo (permite iniciar sesión y marcar asistencia)
            </label>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            <span>{userToEdit ? 'Guardar Cambios' : 'Crear Personal'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export function PersonalFormModal({
  userToEdit,
  isOpen,
  onClose,
  onSave,
  locations,
}: PersonalFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <PersonalFormInner
        key={userToEdit?.id ?? 'create'}
        userToEdit={userToEdit}
        onClose={onClose}
        onSave={onSave}
        locations={locations}
      />
    </div>
  );
}
