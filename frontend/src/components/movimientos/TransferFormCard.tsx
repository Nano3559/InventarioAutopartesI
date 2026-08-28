import { useState, useEffect } from 'react';
import {
  ArrowRight,
  Boxes,
  Send,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { Product, LocationItem, LocationStock } from '../../types/product.types';
import type { CreateMovimientoDto } from '../../types/movimiento.types';
import { productsService } from '../../services/products.service';

interface TransferFormCardProps {
  products: Product[];
  locations: LocationItem[];
  onTransferCompleted: (created: CreateMovimientoDto) => Promise<void>;
}

export function TransferFormCard({
  products,
  locations,
  onTransferCompleted,
}: TransferFormCardProps) {
  const [selectedProductId, setSelectedProductId] = useState<number>(() => products[0]?.id || 1);
  const [origenId, setOrigenId] = useState<number>(1); // Almacén 1 por defecto
  const [destinoId, setDestinoId] = useState<number>(5); // Tienda 1 por defecto
  const [cantidad, setCantidad] = useState<number>(1);
  const [observacion, setObservacion] = useState<string>('');

  const [productStock, setProductStock] = useState<LocationStock[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar desglose de stock del producto seleccionado
  useEffect(() => {
    if (!selectedProductId) return;

    let isMounted = true;
    const fetchStock = async () => {
      setLoadingStock(true);
      try {
        const data = await productsService.getProductStock(selectedProductId);
        if (isMounted) {
          setProductStock(data);
        }
      } catch (err) {
        console.error('Error al cargar stock por ubicación:', err);
      } finally {
        if (isMounted) setLoadingStock(false);
      }
    };

    fetchStock();
    return () => {
      isMounted = false;
    };
  }, [selectedProductId]);

  // Obtener stock disponible en el origen
  const originStockItem = productStock.find((s) => s.locationId === Number(origenId));
  const availableStockInOrigin = originStockItem ? originStockItem.cantidad : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (origenId === destinoId) {
      setError('La ubicación de origen y destino deben ser distintas.');
      return;
    }

    if (cantidad <= 0) {
      setError('La cantidad a trasladar debe ser mayor a 0.');
      return;
    }

    if (cantidad > availableStockInOrigin) {
      setError(`Stock insuficiente en origen. Solo hay ${availableStockInOrigin} unidad(es) disponible(s).`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onTransferCompleted({
        productId: Number(selectedProductId),
        cantidad: Number(cantidad),
        origenId: Number(origenId),
        destinoId: Number(destinoId),
        observacion: observacion.trim() || undefined,
      });

      // Resetear formulario
      setCantidad(1);
      setObservacion('');
      // Refrescar stock
      const data = await productsService.getProductStock(selectedProductId);
      setProductStock(data);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Error al procesar el traslado');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="transfer-form-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <Boxes size={22} color="#38bdf8" />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-strong)' }}>
          Nuevo Traslado de Mercadería
        </h3>
      </div>

      {error && (
        <div className="alert-error" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Selector de Producto */}
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Seleccionar Repuesto a Trasladar *</label>
          <select
            className="filter-select"
            style={{ padding: '0.75rem 1rem', fontSize: '0.92rem' }}
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(Number(e.target.value))}
            required
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.id} - {p.producto} ({p.marca} {p.modelo}) • Stock Total: {p.stockTotal} uds. • OEM: {p.codigoOem || p.codigoFabrica}
              </option>
            ))}
          </select>
        </div>

        {/* Flujo Origen -> Destino */}
        <div className="transfer-flow-container">
          {/* Ubicación Origen */}
          <div className="location-picker-box">
            <div className="location-picker-header">
              <span className="location-picker-title">Ubicación Origen (Salida)</span>
              <span className={`stock-in-origin-badge ${availableStockInOrigin === 0 ? 'zero' : ''}`}>
                {loadingStock ? 'Consultando...' : `Disponible: ${availableStockInOrigin} ud(s)`}
              </span>
            </div>
            <select
              className="filter-select"
              style={{ padding: '0.75rem' }}
              value={origenId}
              onChange={(e) => setOrigenId(Number(e.target.value))}
              required
            >
              <optgroup label="Almacenes / Centros de Distribución">
                {locations.filter((l) => l.tipo === 'almacen').map((l) => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </optgroup>
              <optgroup label="Tiendas / Puntos de Venta">
                {locations.filter((l) => l.tipo === 'tienda').map((l) => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Flecha Central */}
          <div className="transfer-flow-arrow" title="Flujo de traslado">
            <ArrowRight size={22} />
          </div>

          {/* Ubicación Destino */}
          <div className="location-picker-box">
            <div className="location-picker-header">
              <span className="location-picker-title">Ubicación Destino (Ingreso)</span>
            </div>
            <select
              className="filter-select"
              style={{ padding: '0.75rem' }}
              value={destinoId}
              onChange={(e) => setDestinoId(Number(e.target.value))}
              required
            >
              <optgroup label="Tiendas / Puntos de Venta">
                {locations.filter((l) => l.tipo === 'tienda').map((l) => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </optgroup>
              <optgroup label="Almacenes / Centros de Distribución">
                {locations.filter((l) => l.tipo === 'almacen').map((l) => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Cantidad y Observación */}
        <div className="form-grid-2cols" style={{ marginBottom: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Cantidad a Trasladar *</label>
            <input
              type="number"
              min="1"
              max={availableStockInOrigin > 0 ? availableStockInOrigin : 1}
              className="form-input"
              style={{ paddingLeft: '1rem', fontSize: '1rem', fontWeight: 600 }}
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Motivo u Observación del Traslado</label>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '1rem' }}
              placeholder="Ej. Reposición de stock para tienda 1, pedido cliente..."
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
            />
          </div>
        </div>

        {/* Botón de Enviar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            className="btn-primary-action"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.75rem' }}
            disabled={submitting || availableStockInOrigin === 0}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Registrando Traslado...</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>Confirmar Traslado de Mercadería</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
