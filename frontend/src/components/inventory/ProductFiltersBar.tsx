import { useState } from 'react';
import { Search, Filter, Plus, RotateCcw } from 'lucide-react';
import type { ProductFilters } from '../../types/product.types';

interface ProductFiltersBarProps {
  filters: ProductFilters;
  onFilterChange: (newFilters: ProductFilters) => void;
  onOpenNewProductModal: () => void;
  totalResults: number;
}

const VEHICLE_BRANDS = [
  'Toyota',
  'Nissan',
  'Jeep',
  'Dodge',
  'Renault',
  'Hyundai',
  'Mitsubishi',
  'Mazda',
];

// Fabricantes de PIEZA, o sea los valores reales de `p.marca` en la BD.
// El backend filtra con igualdad exacta (`p.marca = :marca`), así que importa
// el case: 'TYC' no encontraría nada porque en la BD está escrito 'Tyc'.
// Antes esta lista decía Depo, TYC, Tong Yang, Gordon, Toyota Genuine y
// Nissan Genuine — casi todo inventado: 4 de esas marcas no existen en ningún
// producto y faltaban Tyc, Kage, Sankei, Capris, Protzalee y Finar.
const MANUFACTURERS = [
  'Tyc',
  'Depo',
  'Denso',
  'Koyo',
  'Kage',
  'Sankei',
  'Valeo',
  'Capris',
  'Protzalee',
  'Finar',
];

const PRODUCT_CATEGORIES = [
  'Farol',
  'Guiñador',
  'Stop',
  'Espejo',
  'Capot',
  'Puerta',
  'Parachoques',
  'Máscara',
  'Radiador',
  'Condensador',
  'Tanque de agua',
  'Manivela',
  'Jalador',
  'Rejilla',
];

export function ProductFiltersBar({
  filters,
  onFilterChange,
  onOpenNewProductModal,
  totalResults,
}: ProductFiltersBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleTextChange = (field: keyof ProductFilters, value: string) => {
    onFilterChange({
      ...filters,
      [field]: value || undefined,
    });
  };

  const handleClear = () => {
    onFilterChange({});
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="inventory-filters-card">
      <div className="filters-main-row">
        {/* Search global */}
        <div className="filters-search-wrapper">
          <Search size={18} className="filters-search-icon" />
          <input
            type="text"
            className="filters-search-input"
            placeholder="Buscar por código OEM, código fábrica, producto, marca o modelo..."
            value={filters.search || ''}
            onChange={(e) => handleTextChange('search', e.target.value)}
          />
        </div>

        {/* Botón toggle filtros avanzados */}
        <button
          type="button"
          className={`filters-toggle-btn ${showAdvanced ? 'active' : ''}`}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Filter size={16} />
          <span>Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
        </button>

        {/* Botón Crear Nuevo Producto */}
        <button
          type="button"
          className="btn-new-product"
          onClick={onOpenNewProductModal}
        >
          <Plus size={18} />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* Filtros avanzados colapsables */}
      {showAdvanced && (
        <div className="filters-expanded-grid">
          {/* Marca de vehículo — `filters.marca` filtra `p.marca`, que es
              donde vive la marca del vehículo (Toyota, Nissan). */}
          <div className="filter-control">
            <label className="filter-label">Marca Vehículo</label>
            <select
              className="filter-select"
              value={filters.marca || ''}
              onChange={(e) => handleTextChange('marca', e.target.value)}
            >
              <option value="">Todas las marcas</option>
              {VEHICLE_BRANDS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Fabricante / Calidad — `filters.fabricante` filtra `p.fabricante`,
              que es el fabricante de la pieza (Tyc, Depo, Denso). */}
          <div className="filter-control">
            <label className="filter-label">Fabricante / Marca Pieza</label>
            <select
              className="filter-select"
              value={filters.fabricante || ''}
              onChange={(e) => handleTextChange('fabricante', e.target.value)}
            >
              <option value="">Todos los fabricantes</option>
              {MANUFACTURERS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Tipo de repuesto */}
          <div className="filter-control">
            <label className="filter-label">Tipo de Repuesto</label>
            <select
              className="filter-select"
              value={filters.producto || ''}
              onChange={(e) => handleTextChange('producto', e.target.value)}
            >
              <option value="">Todos los tipos</option>
              {PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Modelo */}
          <div className="filter-control">
            <label className="filter-label">Modelo</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Ej. Hilux, Corolla, Sentra..."
              value={filters.modelo || ''}
              onChange={(e) => handleTextChange('modelo', e.target.value)}
            />
          </div>

          {/* Año */}
          <div className="filter-control">
            <label className="filter-label">Año</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Ej. 2018 o 2015-2020"
              value={filters.anio || ''}
              onChange={(e) => handleTextChange('anio', e.target.value)}
            />
          </div>

          {/* Código OEM */}
          <div className="filter-control">
            <label className="filter-label">Código OEM</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Ej. 81110-0KD10"
              value={filters.codigoOem || ''}
              onChange={(e) => handleTextChange('codigoOem', e.target.value)}
            />
          </div>

          {/* Código Fábrica */}
          <div className="filter-control">
            <label className="filter-label">Código Fábrica</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Ej. DEP-212-11V6R"
              value={filters.codigoFabrica || ''}
              onChange={(e) => handleTextChange('codigoFabrica', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Barra inferior de estado y reseteo */}
      <div className="filters-actions-bar">
        <span className="active-filters-count">
          Mostrando <strong>{totalResults}</strong> repuestos encontrados
        </span>

        {activeFiltersCount > 0 && (
          <button
            type="button"
            className="btn-clear-filters"
            onClick={handleClear}
          >
            <RotateCcw size={14} />
            <span>Limpiar filtros ({activeFiltersCount})</span>
          </button>
        )}
      </div>
    </div>
  );
}
