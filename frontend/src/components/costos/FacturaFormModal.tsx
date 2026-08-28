import { useState, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  FileText,
  DollarSign,
  UploadCloud,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { Product, LocationItem } from '../../types/product.types';
import type { Proveedor, CreateFacturaDto, FacturaItemInput } from '../../types/costo.types';

interface FacturaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  proveedores: Proveedor[];
  products: Product[];
  locations: LocationItem[];
  onOpenNewProveedor: () => void;
  onSave: (dto: CreateFacturaDto, file?: File) => Promise<void>;
}

export function FacturaFormModal({
  isOpen,
  onClose,
  proveedores,
  products,
  locations,
  onOpenNewProveedor,
  onSave,
}: FacturaFormModalProps) {
  const [proveedorId, setProveedorId] = useState<number>(() => proveedores[0]?.id || 1);
  const [numero, setNumero] = useState<string>('');
  const [tipoCambio, setTipoCambio] = useState<number>(6.96);
  const [porcentaje, setPorcentaje] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Almacenes de destino (solo tipo 'almacen')
  const almacenes = locations.filter((l) => l.tipo === 'almacen');

  // Filas dinámicas de repuestos
  const [items, setItems] = useState<FacturaItemInput[]>([
    {
      productId: products[0]?.id || 1,
      cantidad: 5,
      costoUnitario: products[0]?.costo || 100,
      locationId: almacenes[0]?.id || 1,
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        productId: products[0]?.id || 1,
        cantidad: 1,
        costoUnitario: products[0]?.costo || 50,
        locationId: almacenes[0]?.id || 1,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setError('La factura debe incluir al menos un repuesto.');
      return;
    }
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof FacturaItemInput, value: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    // Si cambia el producto, auto-llenar con el costo actual del producto
    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      if (prod && prod.costo > 0) {
        updated[index].costoUnitario = prod.costo;
      }
    }
    setItems(updated);
  };

  // Cálculos financieros
  const subtotalNeto = items.reduce((acc, it) => acc + (it.cantidad * it.costoUnitario), 0);
  const montoRecargo = (subtotalNeto * (porcentaje || 0)) / 100;
  const montoTotalBOB = subtotalNeto + montoRecargo;
  const montoTotalUSD = tipoCambio > 0 ? (montoTotalBOB / tipoCambio).toFixed(2) : '0.00';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numero.trim()) {
      setError('Ingrese el número o código de la factura.');
      return;
    }

    if (items.length === 0) {
      setError('Agregue al menos un repuesto a la factura.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await onSave(
        {
          proveedorId: Number(proveedorId),
          numero: numero.trim(),
          tipoCambio: Number(tipoCambio) || 1,
          porcentaje: Number(porcentaje) || 0,
          monto: Number(montoTotalBOB.toFixed(2)),
          items,
        },
        selectedFile || undefined,
      );

      // Limpiar formulario y cerrar
      setNumero('');
      setSelectedFile(null);
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Error al registrar factura de compra');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div className="modal-dialog" style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <DollarSign size={22} color="#38bdf8" />
            <span>Registrar Factura de Compra / Costos</span>
          </h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert-error" style={{ marginBottom: '1.25rem' }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Cabecera de la Factura */}
            <div className="form-grid-2cols" style={{ marginBottom: '1rem' }}>
              {/* Proveedor */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Proveedor *</label>
                  <button
                    type="button"
                    onClick={onOpenNewProveedor}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Plus size={13} />
                    <span>Nuevo Proveedor</span>
                  </button>
                </div>
                <select
                  className="filter-select"
                  value={proveedorId}
                  onChange={(e) => setProveedorId(Number(e.target.value))}
                  required
                >
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.pais})
                    </option>
                  ))}
                </select>
              </div>

              {/* N° Factura */}
              <div className="form-group">
                <label className="form-label">Número de Factura *</label>
                <div className="form-input-wrapper">
                  <FileText size={16} className="form-input-icon" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. FAC-2026-9901"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Tipo de Cambio, Porcentaje y Archivo */}
            <div className="form-grid-3cols" style={{ marginBottom: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Tipo de Cambio (BOB / USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-input"
                  style={{ paddingLeft: '0.85rem' }}
                  value={tipoCambio}
                  onChange={(e) => setTipoCambio(parseFloat(e.target.value) || 1)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">% Gastos / Flete / Margen</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="form-input"
                  style={{ paddingLeft: '0.85rem' }}
                  value={porcentaje}
                  onChange={(e) => setPorcentaje(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Comprobante / Archivo (PDF/Img)</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.65rem' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud size={16} />
                  <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedFile ? selectedFile.name : 'Adjuntar Archivo'}
                  </span>
                </button>
              </div>
            </div>

            {/* Tabla de Repuestos Comprados */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-strong)' }}>
                Repuestos Adquiridos en esta Factura
              </h4>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                onClick={handleAddItem}
              >
                <Plus size={14} />
                <span>Agregar Repuesto</span>
              </button>
            </div>

            <div className="factura-items-table-container">
              <table className="factura-items-table">
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Repuesto / Catálogo</th>
                    <th style={{ width: '15%' }}>Cantidad</th>
                    <th style={{ width: '20%' }}>Costo Unit. (Bs.)</th>
                    <th style={{ width: '20%' }}>Almacén Ingreso</th>
                    <th style={{ width: '5%', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx}>
                      <td>
                        <select
                          className="filter-select"
                          style={{ padding: '0.45rem', fontSize: '0.82rem' }}
                          value={it.productId}
                          onChange={(e) => handleItemChange(idx, 'productId', Number(e.target.value))}
                          required
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              #{p.id} - {p.producto} ({p.marca} {p.modelo})
                            </option>
                          ))}
                        </select>
                      </td>

                      <td>
                        <input
                          type="number"
                          min="1"
                          className="form-input"
                          style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                          value={it.cantidad}
                          onChange={(e) => handleItemChange(idx, 'cantidad', Math.max(1, parseInt(e.target.value, 10) || 1))}
                          required
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          className="form-input"
                          style={{ padding: '0.45rem 0.6rem', fontSize: '0.85rem' }}
                          value={it.costoUnitario}
                          onChange={(e) => handleItemChange(idx, 'costoUnitario', Math.max(0.01, parseFloat(e.target.value) || 0))}
                          required
                        />
                      </td>

                      <td>
                        <select
                          className="filter-select"
                          style={{ padding: '0.45rem', fontSize: '0.82rem' }}
                          value={it.locationId}
                          onChange={(e) => handleItemChange(idx, 'locationId', Number(e.target.value))}
                          required
                        >
                          {almacenes.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.nombre}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-table-action delete-btn"
                          style={{ padding: '0.35rem' }}
                          onClick={() => handleRemoveItem(idx)}
                          title="Eliminar fila"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Resumen de Total */}
            <div className="factura-summary-box">
              <div>
                <span className="factura-total-label">Subtotal Neto: Bs. {subtotalNeto.toFixed(2)}</span>
                {porcentaje > 0 && (
                  <span style={{ display: 'block', fontSize: '0.8rem', color: '#a78bfa' }}>
                    + {porcentaje}% Gastos adicionales (Bs. {montoRecargo.toFixed(2)})
                  </span>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="factura-total-label" style={{ display: 'block' }}>Total de la Factura:</span>
                <span className="factura-total-amount">Bs. {montoTotalBOB.toFixed(2)}</span>
                <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  ≈ ${montoTotalUSD} USD
                </span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary-action"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Procesando Ingreso...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Registrar Factura y Actualizar Stock</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
