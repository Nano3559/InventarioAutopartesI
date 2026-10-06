import { Search, RotateCcw, Calendar, Store, Filter } from 'lucide-react';
import type { LocationItem } from '../../types/product.types';

interface AttendanceFiltersBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  tipoFilter: string;
  onTipoChange: (value: string) => void;
  metodoFilter: string;
  onMetodoChange: (value: string) => void;
  locationFilter: string;
  onLocationChange: (value: string) => void;
  desdeFilter: string;
  onDesdeChange: (value: string) => void;
  hastaFilter: string;
  onHastaChange: (value: string) => void;
  locations: LocationItem[];
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function AttendanceFiltersBar({
  searchTerm,
  onSearchChange,
  tipoFilter,
  onTipoChange,
  metodoFilter,
  onMetodoChange,
  locationFilter,
  onLocationChange,
  desdeFilter,
  onDesdeChange,
  hastaFilter,
  onHastaChange,
  locations,
  onClearFilters,
  hasActiveFilters,
}: AttendanceFiltersBarProps) {
  const tiendasList = locations.filter((l) => l.tipo === 'tienda');

  return (
    <div className="inventory-filters-card">
      {/* Fila principal: Búsqueda y Rango de Fechas */}
      <div className="filters-main-row">
        {/* Búsqueda por texto */}
        <div className="filters-search-wrapper" style={{ flex: '1 1 300px' }}>
          <Search size={16} className="filters-search-icon" />
          <input
            type="text"
            className="filters-search-input"
            placeholder="Buscar por nombre, apellido o email..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Fecha Desde */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '170px' }}>
          <Calendar size={15} color="var(--text-muted)" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Desde
            </span>
            <input
              type="date"
              className="form-input"
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.84rem' }}
              value={desdeFilter}
              onChange={(e) => onDesdeChange(e.target.value)}
            />
          </div>
        </div>

        {/* Fecha Hasta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '170px' }}>
          <Calendar size={15} color="var(--text-muted)" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Hasta
            </span>
            <input
              type="date"
              className="form-input"
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.84rem' }}
              value={hastaFilter}
              onChange={(e) => onHastaChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Segunda fila: Filtros desplegables */}
      <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Filtro por Tipo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Filter size={14} color="var(--text-muted)" />
          <select
            className="filter-select"
            value={tipoFilter}
            onChange={(e) => onTipoChange(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.84rem' }}
          >
            <option value="">Todos los tipos (Entrada / Salida)</option>
            <option value="entrada">Solo Entradas</option>
            <option value="salida">Solo Salidas</option>
          </select>
        </div>

        {/* Filtro por Método */}
        <select
          className="filter-select"
          value={metodoFilter}
          onChange={(e) => onMetodoChange(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', fontSize: '0.84rem' }}
        >
          <option value="">Todos los métodos</option>
          <option value="automatico">Automático (Reconocimiento Facial IA)</option>
          <option value="manual">Manual (Operador / Admin)</option>
        </select>

        {/* Filtro por Tienda / Sucursal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Store size={14} color="var(--text-muted)" />
          <select
            className="filter-select"
            value={locationFilter}
            onChange={(e) => onLocationChange(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.84rem' }}
          >
            <option value="">Todas las sucursales</option>
            {tiendasList.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Botón Limpiar Filtros */}
        {hasActiveFilters && (
          <button
            type="button"
            className="btn-clear-filters"
            onClick={onClearFilters}
            style={{ marginLeft: 'auto' }}
          >
            <RotateCcw size={14} />
            <span>Limpiar filtros</span>
          </button>
        )}
      </div>
    </div>
  );
}
