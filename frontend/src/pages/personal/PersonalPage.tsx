import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  ScanFace,
  UserCheck,
  AlertCircle,
  RefreshCw,
  UserPlus,
  Search,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { usersService } from '../../services/users.service';
import { locationsService } from '../../services/locations.service';
import type { UserItem, CreateUserDto, UpdateUserDto } from '../../types/user.types';
import type { LocationItem } from '../../types/product.types';
import { PersonalTable } from '../../components/personal/PersonalTable';
import { PersonalFormModal } from '../../components/personal/PersonalFormModal';
import { BiometricDeleteModal } from '../../components/personal/BiometricDeleteModal';
import '../../styles/personal.css';

export function PersonalPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [faceFilter, setFaceFilter] = useState('all');

  // Modales
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserItem | null>(null);
  const [userToDeleteBiometric, setUserToDeleteBiometric] = useState<UserItem | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        const [allUsers, facesUsers, locs] = await Promise.all([
          usersService.getUsers(),
          usersService.getUsersWithFaces(),
          locationsService.getLocations(),
        ]);

        if (!isMounted) return;

        // Mapear fotos firmadas de users/rostros a la lista completa
        const facesMap = new Map<number, string | null>();
        facesUsers.forEach((fu) => {
          if (fu.fotoUrl) {
            facesMap.set(fu.id, fu.fotoUrl);
          }
        });

        const combined: UserItem[] = allUsers.map((u) => ({
          ...u,
          fotoUrl: facesMap.get(u.id) || u.fotoUrl || null,
        }));

        setUsers(combined);
        setLocations(locs);
      } catch (err) {
        console.error('Error al cargar datos de personal:', err);
        showToast('Error al cargar la información del personal', 'info');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  // Manejadores de acciones
  const handleSaveUser = async (data: CreateUserDto | UpdateUserDto) => {
    if (userToEdit) {
      await usersService.updateUser(userToEdit.id, data);
      showToast('Datos de personal actualizados correctamente.');
    } else {
      await usersService.createUser(data as CreateUserDto);
      showToast('Nuevo empleado registrado exitosamente.');
    }
    loadData();
  };

  const handleToggleActivo = async (user: UserItem) => {
    try {
      await usersService.toggleActivo(user.id, user.activo);
      showToast(`Cuenta de ${user.nombre} ${user.activo ? 'desactivada' : 'activada'}.`);
      loadData();
    } catch (err) {
      console.error('Error al alternar estado activo:', err);
      showToast('Error al modificar el estado de la cuenta', 'info');
    }
  };

  const handleDeleteBiometric = async (userId: number) => {
    try {
      await usersService.eliminarDatosFaciales(userId);
      showToast('Datos biométricos suprimidos conforme a la Ley 26935.');
      loadData();
    } catch (err) {
      console.error('Error al suprimir biometría:', err);
      showToast('Error al eliminar los datos biométricos', 'info');
    }
  };

  // Filtrado reactivo en cliente
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          u.nombre?.toLowerCase().includes(q) ||
          u.apellido?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (roleFilter !== 'all' && u.rol !== roleFilter) {
        return false;
      }

      const tieneRostro = Boolean(u.faceRegisteredAt || u.fotoUrl);
      if (faceFilter === 'with_face' && !tieneRostro) return false;
      if (faceFilter === 'without_face' && tieneRostro) return false;

      return true;
    });
  }, [users, searchTerm, roleFilter, faceFilter]);

  // Métricas
  const totalPersonal = users.length;
  const rostrosRegistrados = users.filter((u) => u.faceRegisteredAt || u.fotoUrl).length;
  const personalActivo = users.filter((u) => u.activo).length;
  const pendientesRostro = totalPersonal - rostrosRegistrados;

  const hasActiveFilters = Boolean(searchTerm || roleFilter !== 'all' || faceFilter !== 'all');

  return (
    <div className="personal-page-container">
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
          <h1 className="page-title">Gestión de Personal y Registro Facial</h1>
          <p className="page-subtitle">
            Administración del personal de las 7 sucursales y control de biometría facial para asistencia con IA
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setUserToEdit(null);
              setFormModalOpen(true);
            }}
          >
            <UserPlus size={16} />
            <span>Nuevo Personal</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={loadData}
            title="Recargar datos"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Banner de Aviso Legal y Privacidad Biometrica */}
      <div className="biometric-privacy-notice">
        <ShieldCheck size={20} color="#38bdf8" style={{ flexShrink: 0 }} />
        <div>
          <strong>Protección de Datos Biométricos (Ley 26935 Bolivia):</strong> Los embeddings faciales
          se almacenan en un índice seguro y las fotos en el bucket privado <code>faces</code> con URLs firmadas
          de 1 hora. El personal puede ejercer el derecho de supresión biométrica en cualquier momento.
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <Users size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Personal</span>
            <span className="stat-value">{totalPersonal}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <ScanFace size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Rostros Registrados</span>
            <span className="stat-value">{rostrosRegistrados}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            <UserCheck size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Personal Activo</span>
            <span className="stat-value">{personalActivo}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <AlertCircle size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Pendientes de Rostro</span>
            <span className="stat-value">{pendientesRostro}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="inventory-table-container">
        <div
          style={{
            padding: '1.25rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {/* Búsqueda por texto */}
          <div className="filters-search-wrapper" style={{ flex: 1, minWidth: '240px' }}>
            <Search size={16} className="filters-search-icon" />
            <input
              type="text"
              className="filters-search-input"
              style={{ padding: '0.6rem 0.8rem 0.6rem 2.5rem', fontSize: '0.85rem' }}
              placeholder="Buscar por nombre, apellido o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtro por Rol */}
          <select
            className="filter-select"
            style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">Todos los roles</option>
            <option value="admin">Administradores</option>
            <option value="tienda">Vendedores de Tienda</option>
            <option value="inventario">Encargados de Almacén</option>
          </select>

          {/* Filtro por Biometría */}
          <select
            className="filter-select"
            style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}
            value={faceFilter}
            onChange={(e) => setFaceFilter(e.target.value)}
          >
            <option value="all">Cualquier estado biométrico</option>
            <option value="with_face">Con Rostro Registrado</option>
            <option value="without_face">Sin Registro Facial</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn-clear-filters"
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('all');
                setFaceFilter('all');
              }}
            >
              <RotateCcw size={14} />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>

        {/* Tabla Principal */}
        <PersonalTable
          users={filteredUsers}
          locations={locations}
          loading={loading}
          onEditUser={(u) => {
            setUserToEdit(u);
            setFormModalOpen(true);
          }}
          onToggleActivo={handleToggleActivo}
          onDeleteBiometric={(u) => setUserToDeleteBiometric(u)}
        />
      </div>

      {/* Modal de Creación / Edición */}
      <PersonalFormModal
        userToEdit={userToEdit}
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setUserToEdit(null);
        }}
        onSave={handleSaveUser}
        locations={locations}
      />

      {/* Modal de Supresión Biométrica */}
      <BiometricDeleteModal
        user={userToDeleteBiometric}
        onClose={() => setUserToDeleteBiometric(null)}
        onConfirm={handleDeleteBiometric}
      />
    </div>
  );
}
