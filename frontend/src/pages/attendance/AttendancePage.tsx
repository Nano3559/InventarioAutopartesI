import { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck,
  LogIn,
  LogOut,
  ScanFace,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { attendanceService } from '../../services/attendance.service';
import { locationsService } from '../../services/locations.service';
import type { AttendanceItem, UpdateAttendanceDto } from '../../types/attendance.types';
import type { LocationItem } from '../../types/product.types';
import { AttendanceFiltersBar } from '../../components/attendance/AttendanceFiltersBar';
import { AttendanceTable } from '../../components/attendance/AttendanceTable';
import { AttendanceEditModal } from '../../components/attendance/AttendanceEditModal';
import '../../styles/attendance.css';

export function AttendancePage() {
  const [records, setRecords] = useState<AttendanceItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Paginación
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [metodoFilter, setMetodoFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [desdeFilter, setDesdeFilter] = useState('');
  const [hastaFilter, setHastaFilter] = useState('');

  // Modales
  const [selectedRecordToEdit, setSelectedRecordToEdit] = useState<AttendanceItem | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Trigger para recarga reactiva
  const [reloadKey, setReloadKey] = useState(0);

  const reloadData = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadLocations() {
      try {
        const locs = await locationsService.getLocations();
        if (isMounted) setLocations(locs);
      } catch (err) {
        console.error('Error al cargar sucursales:', err);
      }
    }

    loadLocations();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchAttendance() {
      try {
        const res = await attendanceService.getAttendance({
          page,
          limit,
          search: searchTerm.trim() || undefined,
          tipo: tipoFilter || undefined,
          metodo: metodoFilter || undefined,
          locationId: locationFilter || undefined,
          desde: desdeFilter || undefined,
          hasta: hastaFilter || undefined,
        });

        if (!isMounted) return;

        setRecords(res.data);
        setTotal(res.total);
        setPages(res.pages);
      } catch (err) {
        console.error('Error al cargar historial de asistencia:', err);
        if (isMounted) {
          showToast('Error al cargar registros de asistencia', 'info');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchAttendance();

    return () => {
      isMounted = false;
    };
  }, [page, limit, searchTerm, tipoFilter, metodoFilter, locationFilter, desdeFilter, hastaFilter, reloadKey]);

  // Manejador de guardado de edición
  const handleSaveEdit = async (id: number, data: UpdateAttendanceDto) => {
    try {
      await attendanceService.updateAttendance(id, data);
      showToast(`Marcaje #${id} actualizado correctamente.`);
      reloadData();
    } catch (err) {
      console.error('Error al actualizar marcaje:', err);
      showToast('Error al guardar la corrección', 'info');
    }
  };

  // Manejador de confirmación manual directa
  const handleConfirmManual = async (record: AttendanceItem) => {
    try {
      await attendanceService.confirmManual(record.id);
      showToast(`Marcaje #${record.id} sellado como Manual.`);
      reloadData();
    } catch (err) {
      console.error('Error al confirmar marcaje manual:', err);
      showToast('Error al confirmar marcaje', 'info');
    }
  };

  // Limpiar filtros
  const handleClearFilters = () => {
    setSearchTerm('');
    setTipoFilter('');
    setMetodoFilter('');
    setLocationFilter('');
    setDesdeFilter('');
    setHastaFilter('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    searchTerm || tipoFilter || metodoFilter || locationFilter || desdeFilter || hastaFilter
  );

  // Estadísticas del listado visible
  const totalEntradas = records.filter((r) => r.tipo === 'entrada').length;
  const totalSalidas = records.filter((r) => r.tipo === 'salida').length;
  const totalAutomaticos = records.filter((r) => r.metodo === 'automatico').length;

  return (
    <div className="attendance-page-container">
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 200,
            background: toast.type === 'success' ? '#065f46' : '#1e3a8a',
            border: `1px solid ${toast.type === 'success' ? '#10b981' : '#3b82f6'}`,
            color: '#ffffff',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.88rem',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <CheckCircle2 size={18} color="#34d399" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Cabecera de Página */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Historial de Asistencia</h1>
          <p className="page-subtitle">
            Auditoría de marcajes de entrada y salida con reconocimiento facial por IA ArcFace o registro manual
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={reloadData}
            disabled={loading}
            title="Recargar registros"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <CalendarCheck size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Marcajes</span>
            <span className="stat-value">{total}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <LogIn size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Entradas (Página)</span>
            <span className="stat-value">{totalEntradas}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <LogOut size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Salidas (Página)</span>
            <span className="stat-value">{totalSalidas}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            <ScanFace size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Vía ArcFace IA</span>
            <span className="stat-value">{totalAutomaticos}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <AttendanceFiltersBar
        searchTerm={searchTerm}
        onSearchChange={(v) => {
          setSearchTerm(v);
          setPage(1);
        }}
        tipoFilter={tipoFilter}
        onTipoChange={(v) => {
          setTipoFilter(v);
          setPage(1);
        }}
        metodoFilter={metodoFilter}
        onMetodoChange={(v) => {
          setMetodoFilter(v);
          setPage(1);
        }}
        locationFilter={locationFilter}
        onLocationChange={(v) => {
          setLocationFilter(v);
          setPage(1);
        }}
        desdeFilter={desdeFilter}
        onDesdeChange={(v) => {
          setDesdeFilter(v);
          setPage(1);
        }}
        hastaFilter={hastaFilter}
        onHastaChange={(v) => {
          setHastaFilter(v);
          setPage(1);
        }}
        locations={locations}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Tabla con Paginación */}
      <div className="inventory-table-container">
        <AttendanceTable
          records={records}
          loading={loading}
          onEdit={(r) => setSelectedRecordToEdit(r)}
          onConfirmManual={handleConfirmManual}
          pagination={{
            page,
            pages,
            total,
            limit,
            onPageChange: (newPage) => setPage(newPage),
          }}
        />
      </div>

      {/* Modal de Corrección Manual */}
      <AttendanceEditModal
        record={selectedRecordToEdit}
        isOpen={Boolean(selectedRecordToEdit)}
        onClose={() => setSelectedRecordToEdit(null)}
        onSave={handleSaveEdit}
        locations={locations}
      />
    </div>
  );
}
