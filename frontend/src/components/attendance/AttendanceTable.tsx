import {
  LogIn,
  LogOut,
  ScanFace,
  UserCheck,
  Edit2,
  CheckCircle2,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Clock,
  Store,
  ShieldCheck,
} from 'lucide-react';
import type { AttendanceItem } from '../../types/attendance.types';

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onPageChange: (newPage: number) => void;
}

interface AttendanceTableProps {
  records: AttendanceItem[];
  loading: boolean;
  onEdit: (record: AttendanceItem) => void;
  onConfirmManual: (record: AttendanceItem) => void;
  pagination: PaginationProps;
}

function formatFechaHora(isoString: string): { fecha: string; hora: string } {
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return { fecha: '—', hora: '—' };
    const fecha = d.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const hora = d.toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return { fecha, hora };
  } catch {
    return { fecha: '—', hora: '—' };
  }
}

export function AttendanceTable({
  records,
  loading,
  onEdit,
  onConfirmManual,
  pagination,
}: AttendanceTableProps) {
  const { page, pages, total, onPageChange } = pagination;

  return (
    <div className="table-responsive">
      <table className="inventory-table">
        <thead>
          <tr>
            <th>Empleado</th>
            <th>Fecha y Hora</th>
            <th>Tipo</th>
            <th>Sucursal</th>
            <th>Método & Reconocimiento</th>
            <th>Confirmado Por</th>
            <th style={{ textAlign: 'right' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
                  <div className="table-skeleton-spinner animate-spin" />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Consultando registros de asistencia...
                  </span>
                </div>
              </td>
            </tr>
          ) : records.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
                  <CalendarX size={44} color="var(--text-muted)" style={{ opacity: 0.6 }} />
                  <span style={{ fontWeight: 600, color: 'var(--text-strong)', fontSize: '1rem' }}>
                    No se encontraron registros de asistencia
                  </span>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '400px', margin: 0 }}>
                    No hay marcajes que coincidan con los filtros seleccionados o para las fechas especificadas.
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            records.map((item) => {
              const { fecha, hora } = formatFechaHora(item.fecha);
              const initials =
                (item.nombreCompleto || item.usuario?.nombre || 'U')
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase() || 'U';

              const isEntrada = item.tipo === 'entrada';
              const isAutomatico = item.metodo === 'automatico';

              // Confianza formateada
              let confLevel: 'high' | 'medium' | 'low' = 'medium';
              let confLabel = 'N/A';
              if (item.confianza !== null && item.confianza !== undefined) {
                const confPercent = Math.round(item.confianza * 100);
                confLabel = `${confPercent}% match`;
                if (item.confianza >= 0.7) confLevel = 'high';
                else if (item.confianza >= 0.35) confLevel = 'medium';
                else confLevel = 'low';
              }

              return (
                <tr key={item.id}>
                  {/* Empleado */}
                  <td>
                    <div className="user-cell-wrapper">
                      <div className="user-cell-avatar">{initials}</div>
                      <div className="user-cell-meta">
                        <span className="user-cell-name">
                          {item.nombreCompleto || item.usuario?.nombre || 'Personal'}
                        </span>
                        <span className="user-cell-email">
                          {item.usuario?.email || `ID: ${item.usuarioId}`}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Fecha y Hora */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-strong)', fontSize: '0.88rem' }}>
                        {fecha}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} />
                        {hora}
                      </span>
                    </div>
                  </td>

                  {/* Tipo */}
                  <td>
                    <span className={`attendance-type-badge ${isEntrada ? 'entrada' : 'salida'}`}>
                      {isEntrada ? <LogIn size={13} /> : <LogOut size={13} />}
                      <span>{item.tipo}</span>
                    </span>
                  </td>

                  {/* Sucursal */}
                  <td>
                    {item.location ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.82rem',
                          color: 'var(--text-strong)',
                        }}
                      >
                        <Store size={14} color="#38bdf8" />
                        <span>{item.location.nombre}</span>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        Sin tienda asignada
                      </span>
                    )}
                  </td>

                  {/* Método & Confianza */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className={`attendance-method-badge ${isAutomatico ? 'automatico' : 'manual'}`}>
                        {isAutomatico ? <ScanFace size={13} /> : <UserCheck size={13} />}
                        <span>{isAutomatico ? 'ArcFace IA' : 'Manual'}</span>
                      </span>

                      {isAutomatico && item.confianza !== null && (
                        <span className={`confidence-chip ${confLevel}`} title={`Similitud Coseno: ${item.confianza}`}>
                          {confLabel}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Confirmado Por */}
                  <td>
                    {item.confirmadoPor ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.8rem',
                          color: '#34d399',
                        }}
                      >
                        <ShieldCheck size={13} />
                        <span>{item.confirmadoPor.nombre} {item.confirmadoPor.apellido || ''}</span>
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      {/* Confirmar manual si es automático */}
                      {isAutomatico && (
                        <button
                          type="button"
                          className="action-btn"
                          style={{
                            padding: '0.35rem 0.55rem',
                            color: '#38bdf8',
                            background: 'rgba(56, 189, 248, 0.1)',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                          }}
                          onClick={() => onConfirmManual(item)}
                          title="Confirmar y sellar como Manual"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}

                      {/* Editar marcaje */}
                      <button
                        type="button"
                        className="action-btn"
                        style={{
                          padding: '0.35rem 0.55rem',
                          color: 'var(--text)',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                        }}
                        onClick={() => onEdit(item)}
                        title="Corregir datos de este marcaje"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Barra de Paginación */}
      <div className="pagination-container">
        <div className="pagination-info">
          Mostrando {records.length} de {total} registros de asistencia (Página {page} de {pages})
        </div>

        <div className="pagination-controls">
          <button
            type="button"
            className="pagination-btn"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
            title="Página anterior"
          >
            <ChevronLeft size={16} />
            <span>Anterior</span>
          </button>

          <span className="pagination-page-indicator">
            {page} / {pages}
          </span>

          <button
            type="button"
            className="pagination-btn"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages || loading}
            title="Página siguiente"
          >
            <span>Siguiente</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
