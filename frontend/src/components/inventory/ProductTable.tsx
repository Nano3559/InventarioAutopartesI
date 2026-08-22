import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Boxes,
  MapPin,
  Edit2,
  Trash2,
  AlertCircle,
  Car,
  Eye,
} from 'lucide-react';
import type { Product } from '../../types/product.types';

interface ProductTableProps {
  products: Product[];
  loading: boolean;
  onOpenStockModal: (product: Product) => void;
  onOpenEditModal: (product: Product) => void;
  onOpenDeleteModal: (product: Product) => void;
}

export function ProductTable({
  products,
  loading,
  onOpenStockModal,
  onOpenEditModal,
  onOpenDeleteModal,
}: ProductTableProps) {
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="inventory-table-container">
        <div className="table-empty-state">
          <Boxes size={36} className="table-empty-icon animate-spin" color="#38bdf8" />
          <p>Cargando catálogo de autopartes...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="inventory-table-container">
        <div className="table-empty-state">
          <AlertCircle size={40} className="table-empty-icon" color="#94a3b8" />
          <h3 style={{ color: 'var(--text-strong)', marginBottom: '0.25rem' }}>
            No se encontraron productos
          </h3>
          <p>Intenta ajustar o limpiar los filtros de búsqueda.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inventory-table-container">
      <div className="table-responsive-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Repuesto</th>
              <th>Vehículo</th>
              <th>Fabricante / Códigos</th>
              <th>Precios (Bs.)</th>
              <th>Stock Total</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const stock = p.stockTotal ?? 0;
              const min = p.stockMinimo ?? 2;
              const isLow = stock > 0 && stock <= min;
              const isOut = stock === 0;

              return (
                <tr key={p.id}>
                  {/* ID */}
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 600 }}>
                    #{p.id}
                  </td>

                  {/* Producto + Imagen */}
                  <td>
                    <div className="product-cell">
                      <div
                        className="product-thumb-box"
                        onClick={() => p.imagen && setSelectedImg(p.imagen)}
                        style={{ cursor: p.imagen ? 'pointer' : 'default' }}
                        title={p.imagen ? 'Clic para ampliar imagen' : undefined}
                      >
                        {p.imagen ? (
                          <img src={p.imagen} alt={p.producto} className="product-thumb-img" />
                        ) : (
                          <Boxes size={20} className="product-thumb-fallback" />
                        )}
                      </div>
                      <div className="product-cell-info">
                        <span className="product-cell-name">{p.producto}</span>
                        {p.detalle && (
                          <span className="product-cell-detail" title={p.detalle}>
                            {p.detalle}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Vehículo */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span className="brand-pill">
                        <Car size={12} />
                        <span>{p.marca} {p.modelo}</span>
                      </span>
                      {p.anio && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Año: {p.anio}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Fabricante y Códigos */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-strong)', fontSize: '0.85rem' }}>
                        {p.fabricante}
                      </span>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <span className="code-chip" title="Código de Fábrica">
                          Fáb: {p.codigoFabrica}
                        </span>
                        {p.codigoOem && (
                          <span className="code-chip" title="Código Original OEM" style={{ borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                            OEM: {p.codigoOem}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Precios */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span className="price-tag">
                        Bs. {p.precio1 ? p.precio1.toFixed(2) : '-'}
                      </span>
                      {p.precio2 && (
                        <span className="price-secondary">
                          P2: Bs. {p.precio2.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Stock Total */}
                  <td>
                    <span
                      className={`stock-badge ${
                        isOut ? 'out-of-stock' : isLow ? 'low-stock' : 'in-stock'
                      }`}
                      title={
                        isOut
                          ? 'Sin existencias en ninguna ubicación'
                          : isLow
                          ? 'Stock crítico o por debajo del mínimo'
                          : 'Stock disponible en almacenes y tiendas'
                      }
                    >
                      {stock} {stock === 1 ? 'ud.' : 'uds.'}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td>
                    <div className="table-actions-cell">
                      <NavLink
                        to={`/inventario/${p.id}`}
                        className="btn-table-action"
                        title="Ver ficha técnica completa del repuesto"
                        style={{ color: '#38bdf8' }}
                      >
                        <Eye size={16} />
                      </NavLink>

                      <button
                        type="button"
                        className="btn-table-action stock-btn"
                        onClick={() => onOpenStockModal(p)}
                        title="Ver stock detallado en las 7 ubicaciones"
                      >
                        <MapPin size={16} />
                      </button>

                      <button
                        type="button"
                        className="btn-table-action edit-btn"
                        onClick={() => onOpenEditModal(p)}
                        title="Editar información del repuesto"
                      >
                        <Edit2 size={16} />
                      </button>

                      <button
                        type="button"
                        className="btn-table-action delete-btn"
                        onClick={() => onOpenDeleteModal(p)}
                        title="Dar de baja / Eliminar repuesto"
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

      {/* Modal visor de imagen */}
      {selectedImg && (
        <div className="modal-overlay" onClick={() => setSelectedImg(null)}>
          <div
            style={{
              maxWidth: '500px',
              background: 'var(--bg-card)',
              padding: '0.75rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
            }}
          >
            <img
              src={selectedImg}
              alt="Vista previa ampliada"
              style={{ width: '100%', borderRadius: 'var(--radius-sm)', display: 'block' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
