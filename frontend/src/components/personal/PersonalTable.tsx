import { useState } from 'react';
import {
  ScanFace,
  CheckCircle2,
  AlertCircle,
  Edit2,
  ShieldAlert,
  UserCheck,
  UserX,
  Store,
  Boxes,
  X,
} from 'lucide-react';
import type { UserItem } from '../../types/user.types';
import type { LocationItem } from '../../types/product.types';

interface PersonalTableProps {
  users: UserItem[];
  locations: LocationItem[];
  loading: boolean;
  onEditUser: (user: UserItem) => void;
  onToggleActivo: (user: UserItem) => void;
  onDeleteBiometric: (user: UserItem) => void;
}

export function PersonalTable({
  users,
  locations,
  loading,
  onEditUser,
  onToggleActivo,
  onDeleteBiometric,
}: PersonalTableProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; name: string } | null>(null);

  if (loading) {
    return (
      <div className="inventory-table-container">
        <div className="table-empty-state">
          <Boxes size={36} className="table-empty-icon animate-spin" color="#38bdf8" />
          <p>Cargando lista de personal y registros biométricos...</p>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="inventory-table-container">
        <div className="table-empty-state">
          <AlertCircle size={40} className="table-empty-icon" color="#94a3b8" />
          <h3 style={{ color: 'var(--text-strong)', marginBottom: '0.25rem' }}>
            No se encontró personal registrado
          </h3>
          <p>No hay usuarios que coincidan con los filtros aplicados.</p>
        </div>
      </div>
    );
  }

  const getStoreName = (tiendaId?: number | null) => {
    if (!tiendaId) return 'Sin tienda asignada';
    const loc = locations.find((l) => l.id === tiendaId);
    return loc ? loc.nombre : `Tienda #${tiendaId}`;
  };

  return (
    <div className="inventory-table-container">
      <div className="table-responsive-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Personal</th>
              <th>Contacto</th>
              <th>Rol & Ubicación</th>
              <th>Estado Facial (IA)</th>
              <th>Estado Cuenta</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const nombreCompleto =
                [u.nombre, u.apellido].filter(Boolean).join(' ') || u.nombre;
              const tieneRostro = Boolean(u.faceRegisteredAt || u.fotoUrl);
              const initials = (u.nombre?.[0] || '') + (u.apellido?.[0] || '');

              const fechaRegistroFacial = u.faceRegisteredAt
                ? new Date(u.faceRegisteredAt).toLocaleDateString('es-BO', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : null;

              return (
                <tr key={u.id} style={{ opacity: u.activo ? 1 : 0.65 }}>
                  {/* Avatar + Nombre Completo */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div
                        className="personal-avatar-box"
                        style={{ cursor: u.fotoUrl ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (u.fotoUrl) {
                            setSelectedPhoto({ url: u.fotoUrl, name: nombreCompleto });
                          }
                        }}
                        title={u.fotoUrl ? 'Ver fotografía facial oficial' : 'Sin foto biométrica'}
                      >
                        {u.fotoUrl ? (
                          <img
                            src={u.fotoUrl}
                            alt={nombreCompleto}
                            className="personal-avatar-img"
                          />
                        ) : (
                          <span className="personal-avatar-fallback">
                            {initials.toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ color: 'var(--text-strong)', fontSize: '0.92rem' }}>
                          {nombreCompleto}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ID: #{u.id}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Contacto */}
                  <td>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{u.email}</span>
                  </td>

                  {/* Rol & Tienda */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                      <span className={`role-badge ${u.rol}`}>
                        {u.rol === 'admin'
                          ? 'Administrador'
                          : u.rol === 'tienda'
                          ? 'Vendedor'
                          : 'Almacén / Inv.'}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <Store size={12} />
                        <span>{getStoreName(u.tiendaId)}</span>
                      </span>
                    </div>
                  </td>

                  {/* Estado Facial */}
                  <td>
                    {tieneRostro ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span className="face-status-badge registered">
                          <ScanFace size={13} />
                          <span>Rostro Registrado</span>
                        </span>
                        {fechaRegistroFacial && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Reg: {fechaRegistroFacial}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="face-status-badge unregistered">
                        <AlertCircle size={13} />
                        <span>Sin Registro Facial</span>
                      </span>
                    )}
                  </td>

                  {/* Estado de Cuenta */}
                  <td>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: u.activo ? '#34d399' : '#f87171',
                      }}
                    >
                      {u.activo ? <UserCheck size={14} /> : <UserX size={14} />}
                      <span>{u.activo ? 'Activo' : 'Inactivo'}</span>
                    </span>
                  </td>

                  {/* Acciones */}
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      {/* Baja Biométrica (Supresión) */}
                      {tieneRostro && (
                        <button
                          type="button"
                          className="btn-table-action"
                          style={{ color: '#f87171' }}
                          onClick={() => onDeleteBiometric(u)}
                          title="Eliminar datos biométricos (Ley 26935)"
                        >
                          <ShieldAlert size={16} />
                        </button>
                      )}

                      {/* Alternar Activo/Inactivo */}
                      <button
                        type="button"
                        className="btn-table-action"
                        style={{ color: u.activo ? '#fbbf24' : '#34d399' }}
                        onClick={() => onToggleActivo(u)}
                        title={u.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
                      >
                        {u.activo ? <UserX size={16} /> : <CheckCircle2 size={16} />}
                      </button>

                      {/* Editar Datos */}
                      <button
                        type="button"
                        className="btn-table-action"
                        style={{ color: '#38bdf8' }}
                        onClick={() => onEditUser(u)}
                        title="Editar datos de personal"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de Vista Previa de Fotografía Facial */}
      {selectedPhoto && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedPhoto(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-dialog"
            style={{ maxWidth: '400px', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '1rem' }}>
                Foto Biométrica — {selectedPhoto.name}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedPhoto(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.25rem' }}>
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.name}
                style={{
                  width: '100%',
                  maxHeight: '360px',
                  objectFit: 'contain',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                Almacenada con URL firmada segura en el bucket privado <code>faces</code>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
