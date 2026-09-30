import { useEffect, useRef, useState } from 'react';
import { X, Printer, Download, Barcode, CheckCircle2, AlertCircle } from 'lucide-react';
import { toCanvas } from '@bwip-js/browser';
import type { Product } from '../../types/product.types';
import { buildFallbackCodigo } from '../../utils/barcode';

interface BarcodeModalProps {
  product: Product | null;
  onClose: () => void;
}

export function BarcodeModal({ product, onClose }: BarcodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const barcodeValue = product
    ? product.codigo || buildFallbackCodigo(product.id, product.codigoFabrica)
    : '';

  useEffect(() => {
    if (!product || !canvasRef.current || !barcodeValue) return;

    let isMounted = true;
    try {
      toCanvas(canvasRef.current, {
        bcid: 'code128',
        text: barcodeValue,
        scale: 3,
        height: 12,
        includetext: false,
        paddingwidth: 10,
        paddingheight: 4,
        backgroundcolor: 'FFFFFF',
        barcolor: '000000',
      });
    } catch (err) {
      console.error('Error al generar código de barras Code128:', err);
      const msg = err instanceof Error ? err.message : 'Error al renderizar código de barras';
      setTimeout(() => {
        if (isMounted) setRenderError(msg);
      }, 0);
    }

    return () => {
      isMounted = false;
    };
  }, [product, barcodeValue]);

  if (!product) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `etiqueta-${barcodeValue}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(barcodeValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-dialog barcode-modal-dialog"
        style={{ maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">
            <Barcode size={22} color="#38bdf8" />
            <span>Etiqueta Code128 — {product.producto}</span>
          </h3>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Cerrar modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Tarjeta de Información de la Etiqueta */}
          <div
            style={{
              padding: '0.85rem 1rem',
              background: 'var(--bg-alt)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              marginBottom: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                IDENTIDAD DE PRODUCTO
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="btn-secondary"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.74rem' }}
                title="Copiar código al portapapeles"
              >
                {copied ? <CheckCircle2 size={12} color="#34d399" /> : null}
                <span>{copied ? 'Copiado' : 'Copiar código'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: '1.15rem',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  color: '#38bdf8',
                  letterSpacing: '0.05em',
                }}
              >
                {barcodeValue}
              </span>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <strong>{product.marca} {product.modelo}</strong> • Fáb: {product.codigoFabrica}
              {product.codigoOem ? ` • OEM: ${product.codigoOem}` : ''}
            </div>
          </div>

          {/* Contenedor del Código de Barras (Solo Barras) */}
          <div className="barcode-render-box printable-barcode-area">
            {renderError ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>
                <AlertCircle size={32} style={{ margin: '0 auto 0.5rem auto' }} />
                <p>{renderError}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <canvas ref={canvasRef} className="barcode-canvas" />
                <span className="barcode-format-note">
                  Simbología Code128 • Solo Barras (includetext: false) • Altura 12mm
                </span>
              </div>
            )}
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.85rem', textAlign: 'center' }}>
            Etiqueta calibrada para lectura inmediata por la cámara del celular desde la app móvil.
          </p>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button type="button" className="btn-secondary" onClick={handleDownload} title="Descargar como archivo PNG">
            <Download size={15} />
            <span>Descargar PNG</span>
          </button>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cerrar
            </button>
            <button type="button" className="btn-primary" onClick={handlePrint} title="Imprimir etiqueta">
              <Printer size={15} />
              <span>Imprimir Etiqueta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
