import { X, Printer, CheckCircle2 } from 'lucide-react';
import type { MovimientoItem } from '../../types/movimiento.types';

interface TransferReceiptModalProps {
  movimiento: MovimientoItem | null;
  onClose: () => void;
}

export function TransferReceiptModal({ movimiento, onClose }: TransferReceiptModalProps) {
  if (!movimiento) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(movimiento.fecha).toLocaleString('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="modal-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div className="modal-dialog" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <CheckCircle2 size={22} color="#34d399" />
            <span>Nota de Traslado #{movimiento.id}</span>
          </h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="receipt-box">
            <div className="receipt-header">
              <div>
                <h4 className="receipt-title">AutoRepuestos Pro</h4>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Comprobante de Movimiento de Mercadería
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                  N° MOV-{String(movimiento.id).padStart(5, '0')}
                </span>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{formattedDate}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '6px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                  Origen (Salida)
                </span>
                <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                  {movimiento.origen?.nombre}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                  Destino (Ingreso)
                </span>
                <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                  {movimiento.destino?.nombre}
                </strong>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.25rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', color: '#475569' }}>
                  <th style={{ padding: '0.5rem 0' }}>Repuesto</th>
                  <th style={{ padding: '0.5rem 0' }}>Código</th>
                  <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Cant.</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem', color: '#0f172a' }}>
                  <td style={{ padding: '0.65rem 0' }}>
                    <strong>{movimiento.product?.producto}</strong>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                      {movimiento.product?.marca} {movimiento.product?.modelo}
                    </span>
                  </td>
                  <td style={{ padding: '0.65rem 0', fontFamily: 'monospace' }}>
                    {movimiento.product?.codigoFabrica}
                  </td>
                  <td style={{ padding: '0.65rem 0', textAlign: 'right', fontWeight: 700 }}>
                    {movimiento.cantidad} uds.
                  </td>
                </tr>
              </tbody>
            </table>

            {movimiento.observacion && (
              <div style={{ marginBottom: '1.5rem', fontSize: '0.82rem', color: '#475569' }}>
                <strong>Observaciones:</strong> {movimiento.observacion}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px dashed #cbd5e1' }}>
              <div style={{ textAlign: 'center', width: '40%' }}>
                <div style={{ borderBottom: '1px solid #94a3b8', height: '35px' }} />
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Entregado por (Origen)
                </span>
              </div>

              <div style={{ textAlign: 'center', width: '40%' }}>
                <div style={{ borderBottom: '1px solid #94a3b8', height: '35px' }} />
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Recibido por (Destino)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className="btn-primary-action"
            onClick={handlePrint}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Printer size={16} />
            <span>Imprimir Constancia</span>
          </button>
        </div>
      </div>
    </div>
  );
}
