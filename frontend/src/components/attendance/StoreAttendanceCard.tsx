import { useState } from 'react';
import {
  Store,
  Clock,
  LogIn,
  LogOut,
  ScanFace,
  UserCheck,
  UserX,
  AlertCircle,
  Building2,
} from 'lucide-react';
import type { DashboardGrupo, DashboardPresente, DashboardAusente } from '../../types/attendance.types';

interface StoreAttendanceCardProps {
  grupo: DashboardGrupo;
}

function formatHora(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function StoreAttendanceCard({ grupo }: StoreAttendanceCardProps) {
  const [activeTab, setActiveTab] = useState<'presentes' | 'ausentes'>('presentes');

  const {
    nombre,
    codigo,
    totalPersonal,
    presentes = [],
    ausentes = [],
  } = grupo;

  const totalPresentes = presentes.length;
  const totalAusentes = ausentes.length;
  const totalDentro = presentes.filter((p) => p.dentro).length;

  return (
    <div className="store-card">
      {/* Header de la Tienda */}
      <div className="store-card-header">
        <div className="store-card-title-group">
          <div className="store-card-icon">
            {codigo ? <Store size={18} /> : <Building2 size={18} />}
          </div>
          <div>
            <h3 className="store-card-title">{nombre}</h3>
            <span className="store-card-code">
              {codigo ? `Sucursal ${codigo}` : 'Personal sin asignar'} · {totalPersonal} Empleados
            </span>
          </div>
        </div>

        <div className="store-card-pills">
          <span className="store-pill presentes" title="Personal con al menos un marcaje hoy">
            {totalPresentes} pres.
          </span>
          <span className="store-pill dentro" title="Actualmente dentro del local">
            {totalDentro} dentro
          </span>
          {totalAusentes > 0 && (
            <span className="store-pill ausentes" title="Personal sin marcajes registrados hoy">
              {totalAusentes} aus.
            </span>
          )}
        </div>
      </div>

      {/* Tabs Presentes / Ausentes */}
      <div className="store-card-tabs">
        <button
          type="button"
          className={`store-card-tab ${activeTab === 'presentes' ? 'active' : ''}`}
          onClick={() => setActiveTab('presentes')}
        >
          <UserCheck size={14} />
          <span>Presentes ({totalPresentes})</span>
        </button>

        <button
          type="button"
          className={`store-card-tab ${activeTab === 'ausentes' ? 'active' : ''}`}
          onClick={() => setActiveTab('ausentes')}
        >
          <UserX size={14} />
          <span>Ausentes ({totalAusentes})</span>
        </button>
      </div>

      {/* Contenido según pestaña */}
      <div className="store-card-content">
        {activeTab === 'presentes' ? (
          totalPresentes === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: 'var(--text-muted)' }}>
              <Clock size={28} style={{ opacity: 0.5, marginBottom: '0.4rem' }} />
              <div style={{ fontSize: '0.85rem' }}>No hay marcajes registrados en esta sucursal hoy</div>
            </div>
          ) : (
            presentes.map((p: DashboardPresente) => {
              const initials = (p.nombreCompleto || p.nombre || 'U')
                .split(' ')
                .map((x) => x[0])
                .join('')
                .substring(0, 2)
                .toUpperCase();

              const esAutomatico = p.ultimaMarca?.metodo === 'automatico';

              return (
                <div key={p.usuarioId} className="person-row-item">
                  <div className="person-row-left">
                    <div className="person-row-avatar presente">{initials}</div>
                    <div className="person-row-meta">
                      <span className="person-row-name" title={p.nombreCompleto}>
                        {p.nombreCompleto}
                      </span>
                      <span className="person-row-role">
                        {p.rol} · {p.marcajes} {p.marcajes === 1 ? 'marcaje' : 'marcajes'}
                      </span>
                    </div>
                  </div>

                  <div className="person-row-right">
                    <span className={`dentro-badge ${p.dentro ? 'dentro' : 'fuera'}`}>
                      {p.dentro ? <LogIn size={11} /> : <LogOut size={11} />}
                      <span>{p.dentro ? 'DENTRO' : 'SALIDA'}</span>
                    </span>

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span title="Hora de primer ingreso">
                        E: {formatHora(p.horaEntrada)}
                      </span>
                      {p.horaSalida && (
                        <span title="Hora de última salida">
                          S: {formatHora(p.horaSalida)}
                        </span>
                      )}
                      {esAutomatico ? (
                        <span title="Último marcaje: ArcFace IA" style={{ display: 'inline-flex' }}>
                          <ScanFace size={12} color="#38bdf8" />
                        </span>
                      ) : (
                        <span title="Último marcaje: Manual" style={{ display: 'inline-flex' }}>
                          <UserCheck size={12} color="#c084fc" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          totalAusentes === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: '#34d399' }}>
              <UserCheck size={28} style={{ opacity: 0.8, marginBottom: '0.4rem' }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>¡Asistencia completa! Todo el personal activo ha marcado hoy.</div>
            </div>
          ) : (
            ausentes.map((a: DashboardAusente) => {
              const initials = (a.nombreCompleto || a.nombre || 'U')
                .split(' ')
                .map((x) => x[0])
                .join('')
                .substring(0, 2)
                .toUpperCase();

              return (
                <div key={a.usuarioId} className="person-row-item">
                  <div className="person-row-left">
                    <div className="person-row-avatar ausente">{initials}</div>
                    <div className="person-row-meta">
                      <span className="person-row-name" title={a.nombreCompleto}>
                        {a.nombreCompleto}
                      </span>
                      <span className="person-row-role">
                        {a.rol} · {a.email}
                      </span>
                    </div>
                  </div>

                  <div className="person-row-right">
                    {a.rostroRegistrado ? (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: '#38bdf8',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          background: 'rgba(56, 189, 248, 0.1)',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                        }}
                        title="Rostro registrado en IA"
                      >
                        <ScanFace size={11} />
                        <span>Rostro OK</span>
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: '#fbbf24',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          background: 'rgba(245, 158, 11, 0.1)',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                        }}
                        title="Pendiente de registro facial"
                      >
                        <AlertCircle size={11} />
                        <span>Sin rostro</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}
