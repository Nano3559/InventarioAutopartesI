import { useState } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import type { PrecioFilters } from '../../types/precio.types';

interface PreciosFiltersBarProps {
  filters: PrecioFilters;
  marcas: string[];
  fabricantes: string[];
  onFilterChange: (newFilters: PrecioFilters) => void;
}

export function PreciosFiltersBar({
  filters,
  marcas,
  fabricantes,
  onFilterChange,
}: PreciosFiltersBarProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...filters, search: searchTerm.trim() || undefined });
  };

  const handleSelectChange = (key: keyof PrecioFilters, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value ? value : undefined,
    });
  };

  const handleClear = () => {
    setSearchTerm('');
    onFilterChange({});
  };

  const hasActiveFilters = !!filters.search || !!filters.marca || !!filters.fabricante;

  return (
    <div className="filters-bar" style={{ marginBottom: '1.25rem' }}>
      <form onSubmit={handleSearchSubmit} className="filters-search-wrapper" style={{ flex: 2, minWidth: '260px' }}>
        <Search size={18} className="filters-search-icon" />
        <input
          type="text"
          className="filters-search-input"
          placeholder="Buscar por repuesto, modelo, código fábrica u OEM..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </form>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Marca Vehículo */}
        <select
          className="filter-select"
          value={filters.marca || ''}
          onChange={(e) => handleSelectChange('marca', e.target.value)}
        >
          <option value="">Todas las marcas</option>
          {marcas.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {/* Fabricante */}
        <select
          className="filter-select"
          value={filters.fabricante || ''}
          onChange={(e) => handleSelectChange('fabricante', e.target.value)}
        >
          <option value="">Todos los fabricantes</option>
          {fabricantes.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button type="button" className="btn-clear-filters" onClick={handleClear}>
            <RotateCcw size={14} />
            <span>Limpiar</span>
          </button>
        )}
      </div>
    </div>
  );
}
