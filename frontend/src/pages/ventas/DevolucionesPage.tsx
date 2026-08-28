import { useState, useEffect } from 'react';
import {
  RotateCcw,
  Plus,
  RefreshCw,
  Package,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  History,
} from 'lucide-react';
import { getDevoluciones, createDevolucion, type Devolucion, type CreateDevolucionInput } from '../../api/devoluciones';
import { productsService } from '../../services/products.service';
import { getLocations } from '../../api/locations';
import type { Product } from '../../types/product.types';
import '../../styles/inventory.css';

const MOTIVOS_DEVOLUCION = [
  'Defectuoso',
  'Error de pedido',
  'Cliente insatisfecho',
  'Daño en transporte',
  'Producto incorrecto',
  'Otro',
] as const;

const METODOS_REEMBOLSO = ['Efectivo', 'Transferencia', 'Nota de crédito', 'Tarjeta'] as const;

export function DevolucionesPage() {
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);

  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Array<{ id: number; nombre: string; tipo: string }>>([]);

  const [formOpen, setFormOpen] = useState<boolean>(false);

  const [formData, setFormData] = useState<CreateDevolucionInput>({
    productId: 0,
    motivo: '',
    cantidad: 1,
    monto: 0,
    metodo: 'Efectivo',
    locationId: undefined,
  });

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const getAvailableStock = (productId: number): number => {
    const product = products.find((p) => p.id === productId);
    if (!product) return 0;
    if (formData.locationId && product.stockByLocation) {
      return product.stockByLocation[formData.locationId] ?? 0;
    }
    return product.stockTotal ?? 0;
  };

  const selectedAvailable = getAvailableStock(formData.productId);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await productsService.getProducts({});
        setProducts(data);
      } catch (err) {
        console.error('Error cargando productos:', err);
      }
    }
    loadProducts();
  }, []);

  useEffect(() => {
    async function loadLocations() {
      try {
        const data = await getLocations();
        setLocations(data);
      } catch (err) {
        console.error('Error cargando ubicaciones:', err);
      }
    }
    loadLocations();
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        const data = await getDevoluciones();
        if (isMounted) {
          setDevoluciones(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error cargando devoluciones:', err);
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, [reloadTrigger]);

  const handleRefresh = () => {
    setLoading(true);
    setReloadTrigger((prev) => prev + 1);
  };

  const handleOpenNew = () => {
    setFormData({ productId: 0, motivo: '', cantidad: 1, monto: 0, metodo: 'Efectivo', locationId: undefined });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId || !formData.motivo || formData.cantidad <= 0 || formData.monto <= 0) {
      showToast('Complete todos los campos requeridos', 'error');
      return;
    }
    if (selectedAvailable > 0 && formData.cantidad > selectedAvailable) {
      showToast(`La cantidad no puede superar el stock disponible (${selectedAvailable})`, 'error');
      return;
    }
    setSubmitting(true);
    try {
      await createDevolucion(formData);
      showToast('Devolución registrada');
      handleRefresh();
      setFormOpen(false);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Error al registrar devolución';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseForm = () => {
    setFormOpen(false);
  };

  const totalDevueltos = devoluciones.reduce((sum, d) => sum + d.cantidad, 0);
  const totalMonto = devoluciones.reduce((sum, d) => sum + d.monto, 0);

  return (
    <div className="inventory-page-container">
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 200,
            background: toast.type === 'success' ? '#065f46' : '#7f1d1d',
            border: `1px solid ${toast.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: '#ffffff',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.88rem',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} color="#34d399" /> : <AlertTriangle size={18} color="#f87171" />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Devoluciones de Mercadería</h1>
          <p className="page-subtitle">
            Registro de devoluciones de productos por venta previa y reincorporación al inventario
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button type="button" className="btn-secondary" onClick={handleRefresh} title="Recargar" disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
          <button type="button" className="btn-primary" onClick={handleOpenNew}>
            <Plus size={15} />
            <span>Nueva Devolución</span>
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <RotateCcw size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Devoluciones</span>
            <span className="stat-value">{devoluciones.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <Package size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Unidades Devueltas</span>
            <span className="stat-value">{totalDevueltos} uds.</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            <CreditCard size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Monto Total Reembolsado</span>
            <span className="stat-value">Bs {totalMonto.toFixed(2)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <History size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Motivos Frecuentes</span>
            <span className="stat-value">{MOTIVOS_DEVOLUCION.length}</span>
          </div>
        </div>
      </div>

      <div className="card-section">
        <div className="card-section-header">
          <h2 className="card-section-title">
            <History size={18} style={{ display: 'inline', marginRight: '8px', color: '#38bdf8' }} />
            Historial de Devoluciones
          </h2>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ marginBottom: '0.5rem', display: 'block', margin: '0 auto 0.5rem' }} />
            Cargando devoluciones...
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Motivo</th>
                  <th>Cantidad</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Ubicación</th>
                  <th>Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {devoluciones.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No hay devoluciones registradas
                    </td>
                  </tr>
                ) : (
                  devoluciones.map((dev) => (
                    <tr key={dev.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{dev.id}</td>
                      <td>{new Date(dev.fecha).toLocaleString()}</td>
                      <td>
                        <strong>{dev.producto?.producto}</strong>
                        <br />
                        <small style={{ color: 'var(--text-muted)' }}>
                          {dev.producto?.marca} {dev.producto?.modelo} · {dev.producto?.codigoFabrica}
                        </small>
                      </td>
                      <td>
                        <span className="badge badge-info">{dev.motivo}</span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{dev.cantidad}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: '#10b981' }}>Bs {dev.monto.toFixed(2)}</td>
                      <td><span className="badge badge-primary">{dev.metodo}</span></td>
                      <td>{dev.location?.nombre} <small>({dev.location?.tipo})</small></td>
                      <td>{dev.usuario?.nombre}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
      <div className="modal-overlay" onClick={handleCloseForm}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Nueva Devolución</h3>
            <button className="modal-close" onClick={handleCloseForm}>&times;</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="productId">Producto <span className="required">*</span></label>
                <select
                  id="productId"
                  className="form-input"
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: Number(e.target.value) })}
                  required
                >
                  <option value={0}>Seleccionar producto...</option>
                  {products.map((p) => {
                    const stock = formData.locationId && p.stockByLocation
                      ? (p.stockByLocation[formData.locationId] ?? 0)
                      : (p.stockTotal ?? 0);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.producto} — {p.marca} {p.modelo} ({p.codigoFabrica}) [Disponible: {stock}]
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="motivo">Motivo <span className="required">*</span></label>
                  <select
                    id="motivo"
                    className="form-input"
                    value={formData.motivo}
                    onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                    required
                  >
                    <option value="">Seleccionar motivo...</option>
                    {MOTIVOS_DEVOLUCION.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="cantidad">
                    Cantidad <span className="required">*</span>
                    {formData.productId > 0 && (
                      <span style={{ fontWeight: 400, fontSize: '0.78rem', color: '#38bdf8', marginLeft: '0.5rem' }}>
                        (Disponible: {selectedAvailable})
                      </span>
                    )}
                  </label>
                  <input
                    id="cantidad"
                    type="number"
                    className="form-input"
                    value={formData.cantidad}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setFormData({ ...formData, cantidad: val > selectedAvailable && selectedAvailable > 0 ? selectedAvailable : val });
                    }}
                    min="1"
                    max={selectedAvailable > 0 ? selectedAvailable : undefined}
                    required
                  />
                  {formData.productId > 0 && selectedAvailable === 0 && (
                    <small style={{ color: '#f87171', fontSize: '0.78rem' }}>Sin stock disponible en esta ubicación</small>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="monto">Monto (Bs) <span className="required">*</span></label>
                  <input
                    id="monto"
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })}
                    min="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="metodo">Método de Reembolso <span className="required">*</span></label>
                  <select
                    id="metodo"
                    className="form-input"
                    value={formData.metodo}
                    onChange={(e) => setFormData({ ...formData, metodo: e.target.value })}
                    required
                  >
                    {METODOS_REEMBOLSO.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="locationId">Ubicación <span className="required">*</span></label>
                <select
                  id="locationId"
                  className="form-input"
                  value={formData.locationId || ''}
                  onChange={(e) => setFormData({ ...formData, locationId: Number(e.target.value) || undefined })}
                  required
                >
                  <option value="">Seleccionar ubicación...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.nombre} ({loc.tipo})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={handleCloseForm} disabled={submitting}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Registrar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      )}
    </div>
  );
}