import { useEffect, useRef, useState, useId } from 'react';
import { X, Printer, Barcode, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toCanvas } from '@bwip-js/browser';
import type { Product } from '../../types/product.types';
import { buildFallbackCodigo } from '../../utils/barcode';
import { productsService } from '../../services/products.service';

interface BulkBarcodePrintModalProps {
  products: Product[];
  onClose: () => void;
  onRefreshCatalog?: () => void;
}

interface BarcodeCardItemProps {
  product: Product;
}

function BarcodeCardItem({ product }: BarcodeCardItemProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderError, setRenderError] = useState(false);
  const uniqueId = useId();

  const code = product.codigo || buildFallbackCodigo(product.id, product.codigoFabrica);

  useEffect(() => {
    if (!canvasRef.current || !code) return;
    let isMounted = true;
    try {
      toCanvas(canvasRef.current, {
        bcid: 'code128',
        text: code,
        scale: 2.5,
        height: 12,
        includetext: false,
        paddingwidth: 10,
        paddingheight: 3,
        backgroundcolor: 'FFFFFF',
        barcolor: '000000',
      });
    } catch (err) {
      console.error(`Error renderizando código ${code}:`, err);
      setTimeout(() => {
        if (isMounted) setRenderError(true);
      }, 0);
    }

    return () => {
      isMounted = false;
    };
  }, [code]);

  return (
    <div className="bulk-barcode-item" id={`item-${uniqueId}`}>
      <div className="bulk-barcode-header">
        <span className="bulk-barcode-title" title={product.producto}>
          {product.producto}
        </span>
        <span className="bulk-barcode-sub">
          {product.marca} {product.modelo}
        </span>
      </div>

      <div className="bulk-barcode-canvas-wrapper">
        {renderError ? (
          <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>Error al generar</span>
        ) : (
          <canvas ref={canvasRef} className="bulk-canvas" />
        )}
      </div>

      <div className="bulk-barcode-footer">
        <span className="bulk-code-text">{code}</span>
        <span className="bulk-fabrica-text">Fáb: {product.codigoFabrica}</span>
      </div>
    </div>
  );
}

export function BulkBarcodePrintModal({
  products,
  onClose,
  onRefreshCatalog,
}: BulkBarcodePrintModalProps) {
  const [generating, setGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Filtrar productos activos y válidos
  const activeProducts = products.filter((p) => p.activo !== false);

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateAll = async () => {
    try {
      setGenerating(true);
      setStatusMsg(null);
      const res = await productsService.generateAllBarcodes();
      setStatusMsg(
        `¡Completado! ${res.generados} código(s) asignado(s) de ${res.total} productos.`
      );
      if (onRefreshCatalog) {
        onRefreshCatalog();
      }
    } catch (err) {
      console.error('Error generando códigos masivos:', err);
      setStatusMsg('Error al conectar con el servidor para generar códigos.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="modal-overlay bulk-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-dialog bulk-modal-dialog"
        style={{ maxWidth: '1020px', width: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Barcode size={24} color="#38bdf8" />
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.2rem' }}>
                Impresión Masiva de Etiquetas Code128 (Formato A4)
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {activeProducts.length} etiquetas listas para imprimir • Solo barras (includetext: false)
              </p>
            </div>
          </div>

          <button type="button" className="modal-close-btn" onClick={onClose} title="Cerrar modal">
            <X size={20} />
          </button>
        </div>

        {/* Acciones de Cabecera */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: 'var(--bg-alt)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Calibrado para escáner móvil de Raúl con cámara y multiscan.</span>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleGenerateAll}
              disabled={generating}
              title="Genera códigos AP-<id>-<fabrica> en la base de datos para productos pendientes"
              style={{ fontSize: '0.82rem', padding: '0.5rem 0.85rem' }}
            >
              {generating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} color="#38bdf8" />}
              <span>{generating ? 'Generando en BD...' : 'Asignar Códigos Pendientes'}</span>
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={handlePrint}
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              <Printer size={16} />
              <span>Imprimir Hoja A4</span>
            </button>
          </div>
        </div>

        {statusMsg && (
          <div
            style={{
              padding: '0.65rem 1.25rem',
              background: 'rgba(16, 185, 129, 0.15)',
              borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Grilla Imprimible A4 */}
        <div className="modal-body bulk-print-body" style={{ overflowY: 'auto', flex: 1, padding: '1.25rem' }}>
          <div className="a4-sheet-preview printable-a4-area">
            <div className="bulk-barcodes-grid">
              {activeProducts.map((p) => (
                <BarcodeCardItem key={p.id} product={p} />
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Total de etiquetas en catálogo: {activeProducts.length}
          </span>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cerrar Vista
          </button>
        </div>
      </div>
    </div>
  );
}
