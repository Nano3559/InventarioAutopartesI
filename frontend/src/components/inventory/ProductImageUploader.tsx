import { useState, useRef } from 'react';
import { Image, UploadCloud, Link as LinkIcon, Check, Loader2, ZoomIn, AlertCircle } from 'lucide-react';
import { productsService } from '../../services/products.service';
import { resolveImageUrl } from '../../api/client';

interface ProductImageUploaderProps {
  productId: number;
  currentImage?: string | null;
  productName: string;
  onImageUpdated: (newImageUrl: string) => void;
}

export function ProductImageUploader({
  productId,
  currentImage,
  productName,
  onImageUpdated,
}: ProductImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [showZoom, setShowZoom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten archivos de imagen (JPG, PNG, etc.)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen no puede superar los 10 MB');
      return;
    }

    try {
      setUploading(true);
      const res = await productsService.uploadProductImage(productId, file);
      if (res.imagen) {
        onImageUpdated(resolveImageUrl(res.imagen) || res.imagen);
      }
    } catch (err: any) {
      const msg = err?.message || 'Error desconocido al subir la imagen';
      console.error('Error al subir imagen:', err);
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveUrl = async () => {
    const value = urlValue.trim();
    if (!value) {
      setError('Ingrese una URL de imagen');
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      setError('La URL ingresada no es válida. Debe comenzar con http:// o https://');
      return;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      setError('La URL debe comenzar con http:// o https://');
      return;
    }

    setError(null);
    try {
      setUploading(true);
      await productsService.updateProduct(productId, { imagen: value });
      onImageUpdated(value);
      setShowUrlInput(false);
      setUrlValue('');
    } catch (err: any) {
      const msg = err?.message || 'Error al guardar la URL';
      console.error('Error al actualizar URL de imagen:', err);
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const resolvedImage = resolveImageUrl(currentImage);

  return (
    <div className="product-image-card">
      <div className="product-image-display">
        {resolvedImage ? (
          <>
            <img src={resolvedImage} alt={productName} />
            <button
              type="button"
              onClick={() => setShowZoom(true)}
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                background: 'rgba(0,0,0,0.65)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#ffffff',
                padding: '0.4rem',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.75rem',
              }}
              title="Ampliar imagen"
            >
              <ZoomIn size={14} />
              <span>Ampliar</span>
            </button>
          </>
        ) : (
          <div className="product-image-placeholder">
            <Image size={42} />
            <span style={{ fontSize: '0.85rem' }}>Sin imagen asociada</span>
          </div>
        )}
      </div>

      {/* Acciones de Carga */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
      />

      <div className="uploader-btn-group">
        <button
          type="button"
          className="btn-secondary"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
          <span>Subir Foto</span>
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => setShowUrlInput(!showUrlInput)}
          title="Asociar por enlace URL"
        >
          <LinkIcon size={16} />
        </button>
      </div>

      {showUrlInput && (
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
          <input
            type="url"
            className="form-input"
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            placeholder="Pegar URL (https://...)"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary-action"
            style={{ padding: '0.45rem 0.75rem' }}
            onClick={handleSaveUrl}
            disabled={uploading}
          >
            <Check size={16} />
          </button>
        </div>
      )}

      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          marginTop: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-sm)',
          color: '#ef4444',
          fontSize: '0.8rem',
        }}>
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Modal Zoom */}
      {showZoom && resolvedImage && (
        <div className="modal-overlay" onClick={() => setShowZoom(false)}>
          <div style={{ maxWidth: '650px', background: 'var(--bg-card)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
            <img src={resolvedImage} alt={productName} style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 'var(--radius-sm)', display: 'block', background: 'var(--bg-alt)' }} />
          </div>
        </div>
      )}
    </div>
  );
}
