import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  LogIn,
  LogOut,
  ScanFace,
  Calendar,
  RefreshCw,
  History,
  Activity,
  Sparkles,
} from 'lucide-react';
import { attendanceService } from '../../services/attendance.service';
import type { DashboardResponse } from '../../types/attendance.types';
import { StoreAttendanceCard } from '../../components/attendance/StoreAttendanceCard';
import { RecentAttendanceMarksCard } from '../../components/attendance/RecentAttendanceMarksCard';
import '../../styles/attendance.css';
import '../../styles/attendance-dashboard.css';

function getTodayLocalDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function AttendanceDashboardPage() {
  const [fecha, setFecha] = useState<string>(getTodayLocalDate());
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const reloadData = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  const handleSetToday = () => {
    const today = getTodayLocalDate();
    if (fecha !== today) {
      setFecha(today);
    } else {
      reloadData();
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchDashboard() {
      try {
        const res = await attendanceService.getDashboard({
          fecha: fecha.trim() || undefined,
        });

        if (!isMounted) return;
        setDashboardData(res);
      } catch (err) {
        console.error('Error al cargar dashboard de asistencia:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDashboard();

    return () => {
      isMounted = false;
    };
  }, [fecha, reloadKey]);

  const totales = dashboardData?.totales;
  const porTienda = dashboardData?.porTienda || [];
  const sinTienda = dashboardData?.sinTienda;
  const ultimosMarcajes = dashboardData?.ultimosMarcajes || [];

  return (
    <div className="attendance-dashboard-container">
      {/* Cabecera Principal */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Activity size={22} color="#38bdf8" />
            <h1 className="page-title" style={{ margin: 0 }}>
              Dashboard de Asistencia en Tiempo Real
            </h1>
          </div>
          <p className="page-subtitle">
            Monitoreo diario de presencia por tienda, entradas/salidas y flujo de marcajes biométricos
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Selector de fecha */}
          <div className="dashboard-date-selector-wrapper">
            <Calendar size={15} color="var(--text-muted)" />
            <input
              type="date"
              className="form-input"
              style={{
                background: 'transparent',
                border: 'none',
                padding: '0.2rem 0.4rem',
                fontSize: '0.85rem',
                color: 'var(--text-strong)',
                cursor: 'pointer',
              }}
              value={fecha}
              onChange={(e) => {
                setLoading(true);
                setFecha(e.target.value);
              }}
            />
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleSetToday}
            title="Ver día de hoy"
            style={{ fontSize: '0.84rem', padding: '0.45rem 0.8rem' }}
          >
            Hoy
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={reloadData}
            disabled={loading}
            title="Recargar datos del dashboard"
            style={{ fontSize: '0.84rem', padding: '0.45rem 0.8rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>

          <Link
            to="/asistencia"
            className="btn-primary"
            style={{ fontSize: '0.84rem', padding: '0.45rem 0.85rem' }}
          >
            <History size={15} />
            <span>Historial Completo</span>
          </Link>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen General */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <Users size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Personal Activo</span>
            <span className="stat-value">{totales?.personal ?? '—'}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <UserCheck size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Presentes Hoy</span>
            <span className="stat-value" style={{ color: '#34d399' }}>
              {totales?.presentes ?? '—'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            <UserX size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Ausentes Hoy</span>
            <span className="stat-value" style={{ color: '#f87171' }}>
              {totales?.ausentes ?? '—'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <LogIn size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Dentro del Local</span>
            <span className="stat-value">{totales?.dentro ?? '—'}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <LogOut size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Fuera / Salidas</span>
            <span className="stat-value">{totales?.fuera ?? '—'}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            <ScanFace size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Biometría ArcFace IA</span>
            <span className="stat-value">{totales?.rostrosRegistrados ?? '—'}</span>
          </div>
        </div>
      </div>

      {loading && !dashboardData ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="table-skeleton-spinner animate-spin" style={{ margin: '0 auto 1rem' }} />
          <span style={{ color: 'var(--text-muted)' }}>Cargando métricas de asistencia del día...</span>
        </div>
      ) : (
        <>
          {/* Sección de Tarjetas por Tienda */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} color="#38bdf8" />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-strong)' }}>
                  Asistencia por Sucursal ({porTienda.length} Tiendas)
                </h2>
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Fecha consultada: <strong>{dashboardData?.fecha || fecha}</strong>
              </span>
            </div>

            <div className="store-cards-grid">
              {porTienda.map((grupo) => (
                <StoreAttendanceCard key={grupo.locationId ?? 'sin-tienda'} grupo={grupo} />
              ))}

              {/* Si hay personal sin tienda y tiene empleados o actividad */}
              {sinTienda && (sinTienda.totalPersonal > 0 || sinTienda.presentes.length > 0) && (
                <StoreAttendanceCard key="sin-tienda" grupo={sinTienda} />
              )}
            </div>
          </div>

          {/* Sección de Últimos Marcajes del Día */}
          <RecentAttendanceMarksCard marks={ultimosMarcajes} />
        </>
      )}
    </div>
  );
}
