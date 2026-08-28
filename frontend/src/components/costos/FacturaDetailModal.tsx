import { X, FileText, Download, Building2, Calendar, DollarSign } from 'lucide-react';
import type { Factura } from '../../types/costo.types';

interface FacturaDetailModalProps {
  factura: Factura | null;
  onClose: () => void;
}

export function FacturaDetailModal({ factura, onClose }: FacturaDetailModalProps) {
  if (!factura) return null;

  const formattedDate = new Date(factura.fecha).toLocaleString('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="modal-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div className="modal-dialog" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <FileText size={20} color="#38bdf8" />
            <span>Detalle de Factura #{factura.numero}</span>
          </h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Ficha Informativa */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1rem', background: 'var(--bg-alt)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Building2 size={13} />
                <span>Proveedor</span>
              </span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-strong)', display: 'block', marginTop: '0.2rem' }}>
                {factura.proveedor?.nombre}
              </strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {factura.proveedor?.pais} {factura.proveedor?.contacto ? `• ${factura.proveedor.contacto}` : ''}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Calendar size={13} />
                <span>Fecha de Compra</span>
              </span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-strong)', display: 'block', marginTop: '0.2rem' }}>
                {formattedDate}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <DollarSign size={13} />
                <span>Total Facturado</span>
              </span>
              <strong style={{ fontSize: '1.15rem', color: '#38bdf8', fontFamily: 'monospace', display: 'block', marginTop: '0.2rem' }}>
                Bs. {factura.monto ? factura.monto.toFixed(2) : '0.00'}
              </strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                T/C: {factura.tipoCambio} • Margen: {factura.porcentaje}%
              </span>
            </div>
          </div>

          {/* Lista de Ítems */}
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.75rem' }}>
            Repuestos Ingresados al Inventario ({factura.items?.length || 0})
          </h4>

          <div className="factura-items-table-container" style={{ marginTop: 0 }}>
            <table className="factura-items-table">
              <thead>
                <tr>
                  <th>Repuesto</th>
                  <th>Código</th>
                  <th>Cant.</th>
                  <th>Costo Unit.</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {factura.items?.map((it, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong style={{ color: 'var(--text-strong)' }}>
                        {it.product?.producto || `Repuesto #${it.productId}`}
                      </strong>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {it.product?.codigoFabrica || '—'}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {it.cantidad} uds.
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>
                      Bs. {it.costoUnitario ? it.costoUnitario.toFixed(2) : '-'}
                    </td>
                    <td style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
                      Bs. {it.subtotal ? it.subtotal.toFixed(2) : (it.cantidad * it.costoUnitario).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Comprobante Adjunto */}
          {factura.archivo && (
            <div style={{ marginTop: '1.25rem', padding: '0.85rem', background: 'var(--bg-alt)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} color="#38bdf8" />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-strong)' }}>Comprobante de Factura Adjunto</span>
              </div>
              <a
                href={factura.archivo}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Download size={14} />
                <span>Ver / Descargar</span>
              </a>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
