import { useState, useRef, useCallback } from 'react';
import {
  Camera,
  Upload,
  Search,
  Eye,
  Trash2,
  Package,
  AlertCircle,
  X,
} from 'lucide-react';
import { productsService, type ImageSearchResult } from '../../services/products.service';
import '../../styles/search-image.css';

export function SearchByImagePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [results, setResults] = useState<ImageSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten archivos de imagen (JPG, PNG, etc.)');
      return;
    }
    setError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResults([]);
    setHasSearched(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleSearch = async () => {
    if (!selectedFile) return;
    setSearching(true);
    setError(null);
    setHasSearched(true);
    try {
      const data = await productsService.searchByImage(selectedFile);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar productos');
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResults([]);
    setError(null);
    setHasSearched(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getStockBadgeClass = (stock: number) => {
    if (stock <= 0) return 'result-badge--stock critical';
    return 'result-badge--stock';
  };

  return (
    <div className="search-image-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Búsqueda por Imagen</h1>
          <p className="page-subtitle">
            Suba o arrastre una foto de un repuesto para encontrar coincidencias en el catálogo
          </p>
        </div>
      </div>

      {/* Upload Zone / Preview */}
      {!previewUrl ? (
        <div
          className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-zone-icon">
            <Camera size={32} />
          </div>
          <div className="upload-zone-text">
            Arrastre una imagen aquí o haga clic para seleccionar
          </div>
          <div className="upload-zone-hint">
            Formatos soportados: JPG, PNG, WEBP — Máximo 10 MB
          </div>
          <button type="button" className="upload-zone-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
            <Upload size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Seleccionar imagen
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
        </div>
      ) : (
        <div className="image-preview-wrapper">
          <div className="image-preview-card">
            <img src={previewUrl!} alt="Imagen a buscar" />
            <div className="image-preview-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={handleSearch}
                disabled={searching}
                style={{ flex: 1 }}
              >
                <Search size={15} style={{ marginRight: 6 }} />
                {searching ? 'Buscando...' : 'Buscar productos'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleClear}
                disabled={searching}
                title="Quitar imagen"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Results Area */}
          <div className="search-results-area">
            {searching && (
              <div className="search-loading">
                <div className="spinner" />
                <span>Analizando imagen y buscando coincidencias...</span>
              </div>
            )}

            {!searching && error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                color: '#ef4444',
                marginBottom: '1rem',
              }}>
                <AlertCircle size={18} />
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {!searching && !error && hasSearched && results.length === 0 && (
              <div className="search-empty">
                <div className="search-empty-icon">
                  <Package size={28} color="var(--text-muted)" />
                </div>
                <p style={{ fontSize: '1rem', color: 'var(--text-strong)', marginBottom: '0.3rem' }}>
                  Sin coincidencias
                </p>
                <p style={{ fontSize: '0.85rem' }}>
                  No se encontraron productos similares. Intente con otra imagen.
                </p>
              </div>
            )}

            {!searching && results.length > 0 && (
              <>
                <div className="results-header">
                  <h3>Resultados</h3>
                  <span className="results-count">{results.length} producto(s) encontrado(s)</span>
                </div>
                {results.map((r, idx) => (
                  <div key={r.product.id} className="result-card">
                    <img
                      src={r.product.imagen || `https://placehold.co/64x64/141b24/8b96a5?text=${idx + 1}`}
                      alt={r.product.producto}
                      className="result-thumb"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/64x64/141b24/8b96a5?text=${idx + 1}`;
                      }}
                    />
                    <div className="result-info">
                      <span className="result-info-name">{r.product.producto}</span>
                      <span className="result-info-detail">
                        {r.product.marca} · {r.product.modelo} · {r.product.codigoFabrica}
                        {r.product.codigoOem ? ` · OEM: ${r.product.codigoOem}` : ''}
                      </span>
                      <div className="result-meta">
                        <span className="result-badge result-badge--similitud">
                          {r.similitud}% similitud
                        </span>
                        <span className={`result-badge ${getStockBadgeClass(r.stockTotal)}`}>
                          Stock: {r.stockTotal}
                        </span>
                      </div>
                      <div className="result-prices">
                        {r.product.precio1 != null && (
                          <span>Precio 1: <strong>Bs. {r.product.precio1.toFixed(2)}</strong></span>
                        )}
                        {r.product.precio2 != null && (
                          <span>Precio 2: <strong>Bs. {r.product.precio2.toFixed(2)}</strong></span>
                        )}
                      </div>
                    </div>
                    <div className="result-actions">
                      <a
                        href={`/inventario/${r.product.id}`}
                        className="btn-secondary"
                        title="Ver detalle"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.45rem 0.75rem', fontSize: '0.82rem' }}
                      >
                        <Eye size={14} />
                        Ver
                      </a>
                    </div>
                  </div>
                ))}
              </>
            )}

            {!searching && !hasSearched && (
              <div className="search-empty">
                <div className="search-empty-icon">
                  <Search size={28} color="var(--text-muted)" />
                </div>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-strong)', marginBottom: '0.3rem' }}>
                  Listo para buscar
                </p>
                <p style={{ fontSize: '0.85rem' }}>
                  Seleccione una imagen y haga clic en "Buscar productos" para ver los resultados.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
