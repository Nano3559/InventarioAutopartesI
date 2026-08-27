import { useState } from 'react';
import {
  ArrowRight,
  Warehouse,
  Store,
  FileText,
  Search,
  RotateCcw,
  Boxes,
} from 'lucide-react';
import type { MovimientoItem, MovimientoFilters } from '../../types/movimiento.types';
import type { LocationItem } from '../../types/product.types';

interface MovimientosHistoryTableProps {
  movimientos: MovimientoItem[];
  locations: LocationItem[];
  loading: boolean;
  filters: MovimientoFilters;
  onFilterChange: (newFilters: MovimientoFilters) => void;
  onViewReceipt: (mov: MovimientoItem) => void;
}

export function MovimientosHistoryTable({
  movimientos,
  locations,
  loading,
  filters,
  onFilterChange,
  onViewReceipt,
}: MovimientosHistoryTableProps) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...filters, search: searchTerm || undefined });
  };

  const handleLocationChange = (field: 'origenId' | 'destinoId', val: string) => {
    onFilterChange({
      ...filters,
      [field]: val ? Number(val) : undefined,
    });
  };

  const handleClear = () => {
    setSearchTerm('');
    onFilterChange({});
  };

  const activeFilters = !!filters.search || !!filters.origenId || !!filters.destinoId;

  return (
    <div className="inventory-table-container">
      {/* Barra de Filtros del Historial */}
      <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: '240px', display: 'flex', gap: '0.5rem' }}>
          <div className="filters-search-wrapper" style={{ flex: 1 }}>
            <Search size={16} className="filters-search-icon" />
            <input
              type="text"
              className="filters-search-input"
              style={{ padding: '0.6rem 0.8rem 0.6rem 2.5rem', fontSize: '0.85rem' }}
              placeholder="Buscar por repuesto, código, motivo o responsable..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-secondary" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}>
            Buscar
          </button>
        </form>

        {/* Filtro Origen */}
        <select
          className="filter-select"
          style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}
          value={filters.origenId || ''}
          onChange={(e) => handleLocationChange('origenId', e.target.value)}
        >
          <option value="">Cualquier origen</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>Desde: {l.nombre}</option>
          ))}
        </select>

        {/* Filtro Destino */}
        <select
          className="filter-select"
          style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}
          value={filters.destinoId || ''}
          onChange={(e) => handleLocationChange('destinoId', e.target.value)}
        >
          <option value="">Cualquier destino</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>Hacia: {l.nombre}</option>
          ))}
        </select>

        {activeFilters && (
          <button type="button" className="btn-clear-filters" onClick={handleClear}>
            <RotateCcw size={14} />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {/* Tabla de Movimientos */}
      {loading ? (
        <div className="table-empty-state">
          <Boxes size={36} className="table-empty-icon animate-spin" color="#38bdf8" />
          <p>Cargando historial de traslados...</p>
        </div>
      ) : movimientos.length === 0 ? (
        <div className="table-empty-state">
          <p>No se encontraron registros de traslados con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="table-responsive-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>N° / Fecha</th>
                <th>Repuesto</th>
                <th>Flujo de Traslado</th>
                <th>Cantidad</th>
                <th>Responsable</th>
                <th>Observación</th>
                <th style={{ textAlign: 'right' }}>Comprobante</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m) => {
                const isOrigenStore = m.origen?.tipo === 'tienda';
                const isDestinoStore = m.destino?.tipo === 'tienda';
                const formattedDate = new Date(m.fecha).toLocaleString('es-BO', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                });

                return (
                  <tr key={m.id}>
                    {/* N° / Fecha */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-strong)' }}>
                          #MOV-{String(m.id).padStart(4, '0')}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formattedDate}
                        </span>
                      </div>
                    </td>

                    {/* Repuesto */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <strong style={{ color: 'var(--text-strong)' }}>
                          {m.product?.producto}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {m.product?.marca} {m.product?.modelo} • Fáb: {m.product?.codigoFabrica}
                        </span>
                      </div>
                    </td>

                    {/* Flujo: Origen -> Destino */}
                    <td>
                      <div className="mov-flow-badge">
                        <span className={`loc-tag ${isOrigenStore ? 'tienda' : 'almacen'}`}>
                          {isOrigenStore ? <Store size={12} /> : <Warehouse size={12} />}
                          <span>{m.origen?.nombre}</span>
                        </span>

                        <ArrowRight size={14} color="#94a3b8" />

                        <span className={`loc-tag ${isDestinoStore ? 'tienda' : 'almacen'}`}>
                          {isDestinoStore ? <Store size={12} /> : <Warehouse size={12} />}
                          <span>{m.destino?.nombre}</span>
                        </span>
                      </div>
                    </td>

                    {/* Cantidad */}
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                        {m.cantidad} uds.
                      </span>
                    </td>

                    {/* Responsable */}
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                        {m.usuario?.nombre || 'Administrador'}
                      </span>
                    </td>

                    {/* Observación */}
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {m.observacion || '—'}
                      </span>
                    </td>

                    {/* Acción: Ver Comprobante */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-table-action"
                        style={{ color: '#38bdf8' }}
                        onClick={() => onViewReceipt(m)}
                        title="Ver nota de traslado"
                      >
                        <FileText size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
