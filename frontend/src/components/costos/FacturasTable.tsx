import { useState } from 'react';
import {
  Search,
  Building2,
  Trash2,
  Eye,
  RotateCcw,
  Boxes,
} from 'lucide-react';
import type { Factura, Proveedor } from '../../types/costo.types';

interface FacturasTableProps {
  facturas: Factura[];
  proveedores: Proveedor[];
  loading: boolean;
  onViewDetail: (factura: Factura) => void;
  onDeleteFactura: (id: number) => void;
}

export function FacturasTable({
  facturas,
  proveedores,
  loading,
  onViewDetail,
  onDeleteFactura,
}: FacturasTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvId, setSelectedProvId] = useState<string>('');

  const filteredFacturas = facturas.filter((f) => {
    if (selectedProvId && f.proveedorId !== Number(selectedProvId)) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const matchNumero = f.numero?.toLowerCase().includes(s);
      const matchProv = f.proveedor?.nombre?.toLowerCase().includes(s);
      if (!matchNumero && !matchProv) return false;
    }
    return true;
  });

  const handleClear = () => {
    setSearchTerm('');
    setSelectedProvId('');
  };

  const hasActiveFilters = !!searchTerm || !!selectedProvId;

  return (
    <div className="inventory-table-container">
      {/* Barra de Filtros */}
      <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="filters-search-wrapper" style={{ flex: 1, minWidth: '240px' }}>
          <Search size={16} className="filters-search-icon" />
          <input
            type="text"
            className="filters-search-input"
            style={{ padding: '0.6rem 0.8rem 0.6rem 2.5rem', fontSize: '0.85rem' }}
            placeholder="Buscar por N° Factura o Proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filtro Proveedor */}
        <select
          className="filter-select"
          style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}
          value={selectedProvId}
          onChange={(e) => setSelectedProvId(e.target.value)}
        >
          <option value="">Todos los proveedores</option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button type="button" className="btn-clear-filters" onClick={handleClear}>
            <RotateCcw size={14} />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {/* Tabla de Facturas */}
      {loading ? (
        <div className="table-empty-state">
          <Boxes size={36} className="table-empty-icon animate-spin" color="#38bdf8" />
          <p>Cargando facturas de compra...</p>
        </div>
      ) : filteredFacturas.length === 0 ? (
        <div className="table-empty-state">
          <p>No se encontraron registros de facturas con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="table-responsive-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>N° Factura / Fecha</th>
                <th>Proveedor</th>
                <th>Ítems Comprados</th>
                <th>Tipo de Cambio</th>
                <th>Monto Total (Bs.)</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredFacturas.map((f) => {
                const formattedDate = new Date(f.fecha).toLocaleDateString('es-BO', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });
                const totalItems = f.items ? f.items.reduce((acc, it) => acc + it.cantidad, 0) : 0;

                return (
                  <tr key={f.id}>
                    {/* N° Factura / Fecha */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ color: 'var(--text-strong)', fontFamily: 'monospace' }}>
                          {f.numero}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formattedDate}
                        </span>
                      </div>
                    </td>

                    {/* Proveedor */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="supplier-badge">
                          <Building2 size={13} />
                          <span>{f.proveedor?.nombre}</span>
                        </span>
                        <span className="supplier-country-tag" style={{ marginTop: '0.2rem' }}>
                          Origen: {f.proveedor?.pais}
                        </span>
                      </div>
                    </td>

                    {/* Ítems */}
                    <td>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-strong)' }}>
                        {f.items?.length || 0} repuesto(s)
                      </span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Total {totalItems} unidades
                      </span>
                    </td>

                    {/* Tipo de Cambio / Margen */}
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                        1 USD = Bs. {f.tipoCambio}
                      </span>
                      {f.porcentaje > 0 && (
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#a78bfa' }}>
                          +{f.porcentaje}% margen
                        </span>
                      )}
                    </td>

                    {/* Monto Total */}
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                        Bs. {f.monto ? f.monto.toFixed(2) : '0.00'}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td>
                      <div className="table-actions-cell">
                        <button
                          type="button"
                          className="btn-table-action"
                          style={{ color: '#38bdf8' }}
                          onClick={() => onViewDetail(f)}
                          title="Ver detalle completo de la factura"
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          type="button"
                          className="btn-table-action delete-btn"
                          onClick={() => onDeleteFactura(f.id)}
                          title="Eliminar factura de compra"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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
