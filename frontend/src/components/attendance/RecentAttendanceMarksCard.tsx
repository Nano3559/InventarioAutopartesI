import { Link } from 'react-router-dom';
import {
  Clock,
  LogIn,
  LogOut,
  ScanFace,
  UserCheck,
  Store,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import type { AttendanceItem } from '../../types/attendance.types';

interface RecentAttendanceMarksCardProps {
  marks: AttendanceItem[];
}

function formatHoraExacta(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function RecentAttendanceMarksCard({ marks }: RecentAttendanceMarksCardProps) {
  return (
    <div className="recent-marks-card">
      <div className="recent-marks-header">
        <h3 className="recent-marks-title">
          <Sparkles size={18} color="#38bdf8" />
          <span>Últimos Marcajes del Día (En Vivo)</span>
        </h3>
        <Link
          to="/asistencia"
          className="btn-secondary"
          style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', gap: '0.4rem' }}
        >
          <span>Ver historial completo</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {marks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
          <Clock size={36} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            No se han registrado marcajes de asistencia aún para esta fecha.
          </p>
        </div>
      ) : (
        <div className="recent-marks-list">
          {marks.map((m) => {
            const isEntrada = m.tipo === 'entrada';
            const isAutomatico = m.metodo === 'automatico';
            const hora = formatHoraExacta(m.fecha);

            const initials =
              (m.nombreCompleto || m.usuario?.nombre || 'U')
                .split(' ')
                .map((x) => x[0])
                .join('')
                .substring(0, 2)
                .toUpperCase() || 'U';

            return (
              <div key={m.id} className="recent-mark-item">
                <div className="recent-mark-left">
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isEntrada
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      color: '#ffffff',
                    }}
                  >
                    {initials}
                  </div>

                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-strong)' }}>
                      {m.nombreCompleto || m.usuario?.nombre || 'Empleado'}
                    </span>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Store size={11} />
                        {m.location?.nombre || 'Sin tienda'}
                      </span>
                      <span>·</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Clock size={11} />
                        {hora}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="recent-mark-right">
                  <span className={`attendance-type-badge ${isEntrada ? 'entrada' : 'salida'}`}>
                    {isEntrada ? <LogIn size={12} /> : <LogOut size={12} />}
                    <span>{m.tipo}</span>
                  </span>

                  <span className={`attendance-method-badge ${isAutomatico ? 'automatico' : 'manual'}`}>
                    {isAutomatico ? <ScanFace size={12} /> : <UserCheck size={12} />}
                    <span>{isAutomatico ? 'ArcFace' : 'Manual'}</span>
                  </span>

                  {isAutomatico && m.confianza !== null && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: m.confianza >= 0.7 ? '#34d399' : '#38bdf8',
                        background: 'rgba(56, 189, 248, 0.1)',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                      }}
                    >
                      {Math.round(m.confianza * 100)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
