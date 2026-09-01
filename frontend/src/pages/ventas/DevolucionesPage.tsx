import { useState, useEffect, useMemo } from 'react';
import {
  RotateCcw,
  Plus,
  RefreshCw,
  Package,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  History,
  Search,
  ShoppingCart,
  X,
} from 'lucide-react';
import {
  getDevoluciones,
  getSalesForDevolucion,
  createDevolucion,
  type Devolucion,
  type CreateDevolucionInput,
  type SaleSummary,
  type SaleItemSummary,
} from '../../api/devoluciones';
import { productsService } from '../../services/products.service';
import { getLocations } from '../../api/locations';
import type { Product } from '../../types/product.types';
import '../../styles/inventory.css';
import '../../styles/sales.css';

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
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Array<{ id: number; nombre: string; tipo: string }>>([]);
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [saleSearch, setSaleSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleSummary | null>(null);
  const [selectedSaleItem, setSelectedSaleItem] = useState<SaleItemSummary | null>(null);

  const [formData, setFormData] = useState<CreateDevolucionInput>({
    productId: 0,
    motivo: '',
    cantidad: 1,
    monto: 0,
    metodo: 'Efectivo',
    locationId: undefined,
    ventaId: undefined,
    saleItemId: undefined,
  });

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    async function load() {
      try {
        const [prods, locs] = await Promise.all([
          productsService.getProducts({}),
          getLocations(),
        ]);
        setProducts(prods);
        setLocations(locs);
      } catch (err) {
        console.error('Error cargando datos:', err);
      }
    }
    load();
  }, []);

  useEffect(() => {
    let active = true;
    async function fetchData() {
      try {
        const data = await getDevoluciones();
        if (active) setDevoluciones(data);
      } catch (err) {
        console.error('Error cargando devoluciones:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchData();
    return () => { active = false; };
  }, []);

  const loadSales = async (search?: string) => {
    try {
      setLoadingSales(true);
      const data = await getSalesForDevolucion(search);
      setSales(data);
    } catch (err) {
      console.error('Error cargando ventas:', err);
    } finally {
      setLoadingSales(false);
    }
  };

  const handleOpenNew = () => {
    setFormData({ productId: 0, motivo: '', cantidad: 1, monto: 0, metodo: 'Efectivo', locationId: undefined, ventaId: undefined, saleItemId: undefined });
    setSelectedSale(null);
    setSelectedSaleItem(null);
    setSaleSearch('');
    setFormOpen(true);
  };

  const handleSelectSale = (sale: SaleSummary) => {
    setSelectedSale(sale);
    setSelectedSaleItem(null);
    setFormData({ ...formData, ventaId: sale.id, saleItemId: undefined, productId: 0, monto: 0, cantidad: 1 });
  };

  const handleSelectSaleItem = (item: SaleItemSummary, product: Product | undefined) => {
    setSelectedSaleItem(item);
    setFormData({
      ...formData,
      productId: item.productId,
      saleItemId: item.id,
      monto: item.precio,
      cantidad: 1,
    });
  };

  const handleClearSale = () => {
    setSelectedSale(null);
    setSelectedSaleItem(null);
    setFormData({ ...formData, ventaId: undefined, saleItemId: undefined, productId: 0, monto: 0, cantidad: 1 });
  };

  const selectedProduct = useMemo(() => {
    if (selectedSaleItem) {
      return products.find((p) => p.id === selectedSaleItem.productId);
    }
    return products.find((p) => p.id === formData.productId);
  }, [products, selectedSaleItem, formData.productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId || !formData.motivo || formData.cantidad <= 0 || formData.monto <= 0) {
      showToast('Complete todos los campos requeridos', 'error');
      return;
    }
    if (!formData.locationId) {
      showToast('Seleccione una ubicación', 'error');
      return;
    }
    if (selectedSaleItem && formData.cantidad > selectedSaleItem.cantidad) {
      showToast(`La cantidad devuelta no puede exceder la vendida (${selectedSaleItem.cantidad})`, 'error');
      return;
    }
    setSubmitting(true);
    try {
      await createDevolucion(formData);
      showToast('Devolución registrada exitosamente');
      const [refreshedProducts, refreshedDevs] = await Promise.all([
        productsService.getProducts({}),
        getDevoluciones(),
      ]);
      setProducts(refreshedProducts);
      setDevoluciones(refreshedDevs);
      setFormOpen(false);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Error al registrar devolución';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalDevueltos = devoluciones.reduce((sum, d) => sum + d.cantidad, 0);
  const totalMonto = devoluciones.reduce((sum, d) => sum + d.monto, 0);

  return (
    <div className="inventory-page">
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">
            <RotateCcw size={22} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
            Devoluciones de Mercadería
          </h1>
          <p className="page-subtitle">
            Registro de devoluciones vinculadas a ventas y reincorporación al inventario
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button type="button" className="btn-ghost" onClick={() => { setLoading(true); getDevoluciones().then(setDevoluciones).finally(() => setLoading(false)); }}>
            <RefreshCw size={15} /> Actualizar
          </button>
          <button type="button" className="btn-primary" onClick={handleOpenNew}>
            <Plus size={15} /> Nueva Devolución
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8' }}>
            <RotateCcw size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Devoluciones</span>
            <span className="stat-value">{devoluciones.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399' }}>
            <Package size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Unidades Devueltas</span>
            <span className="stat-value">{totalDevueltos} uds.</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}>
            <CreditCard size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Monto Reembolsado</span>
            <span className="stat-value">Bs {totalMonto.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="inventory-table-container">
        <div className="card-section-header" style={{ padding: '1rem 1.25rem' }}>
          <h2 className="card-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={18} style={{ color: 'var(--accent)' }} />
            Historial de Devoluciones
          </h2>
        </div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', gap: '0.75rem', color: 'var(--text-muted)' }}>
            <div className="spinner" /> Cargando...
          </div>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Venta</th>
                  <th>Producto</th>
                  <th>Motivo</th>
                  <th>Cant.</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Ubicación</th>
                  <th>Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {devoluciones.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No hay devoluciones registradas
                    </td>
                  </tr>
                ) : (
                  devoluciones.map((dev) => (
                    <tr key={dev.id}>
                      <td><span className="code-chip">#{dev.id}</span></td>
                      <td>{new Date(dev.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td>
                        {dev.venta ? (
                          <span className="code-chip">{dev.venta.codigo}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{dev.producto?.producto}</span>
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            {dev.producto?.marca} {dev.producto?.modelo}
                          </span>
                        </div>
                      </td>
                      <td><span className="stock-badge in-stock">{dev.motivo}</span></td>
                      <td style={{ fontWeight: 600 }}>{dev.cantidad}</td>
                      <td><span className="price-tag" style={{ color: '#34d399' }}>Bs {dev.monto.toFixed(2)}</span></td>
                      <td><span className="stock-badge low-stock">{dev.metodo}</span></td>
                      <td style={{ fontSize: '0.85rem' }}>{dev.location?.nombre}</td>
                      <td style={{ fontSize: '0.85rem' }}>{dev.usuario?.nombre}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {formOpen && (
        <div className="modal-overlay" onClick={() => setFormOpen(false)}>
          <div className="modal-dialog" style={{ maxWidth: 640, maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-strong)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <RotateCcw size={18} style={{ color: 'var(--accent)' }} />
                Nueva Devolución
              </h3>
              <button className="btn-table-action" onClick={() => setFormOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: 'calc(90vh - 70px)' }}>
              {/* Sale Selector */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                  <ShoppingCart size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} />
                  Venta asociada (opcional)
                </label>
                {selectedSale ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.7rem 1rem',
                    background: 'var(--accent-soft)',
                    border: '1px solid var(--accent-border)',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    <div>
                      <span className="code-chip" style={{ marginRight: 8 }}>{selectedSale.codigo}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                        {selectedSale.cliente?.nombre || 'Sin cliente'} — {new Date(selectedSale.fecha).toLocaleDateString('es-BO')}
                      </span>
                    </div>
                    <button type="button" className="btn-table-action" onClick={handleClearSale} style={{ flexShrink: 0 }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <div className="filters-search-wrapper" style={{ flex: 1 }}>
                        <Search size={16} className="filters-search-icon" />
                        <input
                          className="filters-search-input"
                          type="text"
                          placeholder="Buscar por código, cliente..."
                          value={saleSearch}
                          onChange={(e) => setSaleSearch(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && loadSales(saleSearch)}
                        />
                      </div>
                      <button type="button" className="btn-ghost" onClick={() => loadSales(saleSearch)} style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem' }}>
                        Buscar
                      </button>
                    </div>
                    {loadingSales && (
                      <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        <div className="spinner" style={{ display: 'inline-block', marginRight: 6 }} /> Buscando ventas...
                      </div>
                    )}
                    {sales.length > 0 && !loadingSales && (
                      <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem' }}>
                        {sales.slice(0, 10).map((sale) => (
                          <div
                            key={sale.id}
                            onClick={() => handleSelectSale(sale)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.6rem 0.85rem',
                              borderBottom: '1px solid var(--border)',
                              cursor: 'pointer',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div>
                              <span className="code-chip" style={{ marginRight: 8 }}>{sale.codigo}</span>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{sale.cliente?.nombre || 'Sin cliente'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{sale.items.length} ítems</span>
                              <span className="price-tag" style={{ fontSize: '0.85rem' }}>Bs {sale.total.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sale Item Selector */}
              {selectedSale && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                    <Package size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} />
                    Producto de la venta
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {selectedSale.items.map((item) => {
                      const prod = products.find((p) => p.id === item.productId);
                      const isSelected = selectedSaleItem?.id === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectSaleItem(item, prod)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.55rem 0.85rem',
                            background: isSelected ? 'var(--accent-soft)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${isSelected ? 'var(--accent-border)' : 'var(--border)'}`,
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--text-strong)', fontSize: '0.88rem' }}>
                              {prod?.producto || `Producto #${item.productId}`}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                              Bs {item.precio.toFixed(2)} c/u
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="stock-badge in-stock">Vendido: {item.cantidad}</span>
                            {isSelected && <CheckCircle2 size={16} style={{ color: 'var(--accent)' }} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Product (fallback if no sale selected) */}
              {!selectedSale && (
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                    Producto <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <select
                    className="filter-select"
                    style={{ width: '100%' }}
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: Number(e.target.value) })}
                    required
                  >
                    <option value={0}>Seleccionar producto...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.producto} — {p.marca} {p.codigoFabrica} (Stock: {p.stockTotal ?? 0})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantity & Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                    Cantidad <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    type="number"
                    className="filter-input"
                    style={{ width: '100%' }}
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: Number(e.target.value) || 1 })}
                    min="1"
                    max={selectedSaleItem?.cantidad || undefined}
                    required
                  />
                  {selectedSaleItem && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                      Máximo: {selectedSaleItem.cantidad} unidades
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                    Monto (Bs) <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="filter-input"
                    style={{ width: '100%' }}
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })}
                    min="0.01"
                    required
                  />
                </div>
              </div>

              {/* Motivo & Method */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                    Motivo <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <select
                    className="filter-select"
                    style={{ width: '100%' }}
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
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                    Método de Reembolso <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <select
                    className="filter-select"
                    style={{ width: '100%' }}
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

              {/* Location */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                  Ubicación de devolución <span style={{ color: '#f87171' }}>*</span>
                </label>
                <select
                  className="filter-select"
                  style={{ width: '100%' }}
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

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <button type="button" className="btn-ghost" onClick={() => setFormOpen(false)} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <div className="spinner" /> Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Registrar Devolución
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
