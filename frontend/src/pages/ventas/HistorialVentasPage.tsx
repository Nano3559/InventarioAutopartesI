import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Eye,
  Printer,
  Calendar,
  ShoppingCart,
  RefreshCw,
  X,
  Receipt,
  TrendingUp,
  Store,
  Tag,
  FileText,
  User,
  MapPin,
  Clock,
} from 'lucide-react';
import { salesService, type SaleResponse } from '../../services/sales.service';
import '../../styles/inventory.css';
import '../../styles/sales.css';
import '../../styles/dashboard.css';

type TipoFilter = '' | 'menor' | 'mayor';

export function HistorialVentasPage() {
  const [sales, setSales] = useState<SaleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedSale, setSelectedSale] = useState<SaleResponse | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadSales = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (tipoFilter) params.tipo = tipoFilter;
      if (dateFrom) params.desde = dateFrom;
      if (dateTo) params.hasta = dateTo;
      const data = await salesService.getSales(params);
      setSales(data);
    } catch (err) {
      console.error('Error cargando ventas:', err);
      showToast('Error al cargar las ventas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const handleSearch = () => loadSales();

  const handleClearFilters = () => {
    setSearch('');
    setTipoFilter('');
    setDateFrom('');
    setDateTo('');
    setTimeout(() => loadSales(), 0);
  };

  const handlePrintNota = async (saleId: number) => {
    try {
      const html = await salesService.getNotaVenta(saleId);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }
    } catch {
      showToast('Error al generar la nota de venta', 'error');
    }
  };

  const formatCurrency = (amount: number) => `Bs ${amount.toFixed(2)}`;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredSales = useMemo(() => {
    let result = sales;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.codigo.toLowerCase().includes(q) ||
        s.cliente?.nombre?.toLowerCase().includes(q) ||
        s.cliente?.ciNit?.includes(q) ||
        s.usuario?.nombre?.toLowerCase().includes(q)
      );
    }
    if (tipoFilter) {
      result = result.filter(s => s.tipo === tipoFilter);
    }
    return result;
  }, [sales, search, tipoFilter]);

  const stats = useMemo(() => {
    const totalVentas = filteredSales.length;
    const totalMonto = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const ventasMenor = filteredSales.filter(s => s.tipo === 'menor').length;
    const ventasMayor = filteredSales.filter(s => s.tipo === 'mayor').length;
    const ticketPromedio = totalVentas > 0 ? totalMonto / totalVentas : 0;
    return { totalVentas, totalMonto, ventasMenor, ventasMayor, ticketPromedio };
  }, [filteredSales]);

  const hasActiveFilters = search || tipoFilter || dateFrom || dateTo;

  return (
    <div className="inventory-page">
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Receipt size={24} style={{ marginRight: 10, verticalAlign: 'text-bottom' }} />
            Historial de Ventas
          </h1>
          <p className="page-subtitle">Consulta y gestiona todas las ventas registradas</p>
        </div>
        <button className="btn-ghost" onClick={loadSales} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <ShoppingCart size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalVentas}</span>
            <span className="stat-label">Total Ventas</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399' }}>
            <TrendingUp size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{formatCurrency(stats.totalMonto)}</span>
            <span className="stat-label">Monto Total</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8' }}>
            <Tag size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.ventasMenor}</span>
            <span className="stat-label">Venta al Detalle</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>
            <Store size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.ventasMayor}</span>
            <span className="stat-label">Venta por Mayor</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}>
            <Receipt size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{formatCurrency(stats.ticketPromedio)}</span>
            <span className="stat-label">Ticket Promedio</span>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="inventory-filters-card">
        <div className="filters-main-row">
          <div className="filters-search-wrapper">
            <Search size={18} className="filters-search-icon" />
            <input
              className="filters-search-input"
              type="text"
              placeholder="Buscar por código, cliente, CI/NIT o vendedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select
              className="filter-select"
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value as TipoFilter)}
            >
              <option value="">Todos los tipos</option>
              <option value="menor">Venta Menor</option>
              <option value="mayor">Venta Mayor</option>
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                className="filter-input"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ width: 145 }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
              <input
                className="filter-input"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ width: 145 }}
              />
            </div>

            <button className="btn-primary" onClick={handleSearch} style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}>
              <Search size={15} /> Buscar
            </button>

            {hasActiveFilters && (
              <button className="btn-clear-filters" onClick={handleClearFilters}>
                <X size={14} /> Limpiar
              </button>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <div className="filters-actions-bar">
            <span className="active-filters-count">
              {filteredSales.length} resultado{filteredSales.length !== 1 ? 's' : ''} encontrado{filteredSales.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="inventory-table-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '1rem', color: 'var(--text-muted)' }}>
            <div className="spinner" />
            <span>Cargando ventas...</span>
          </div>
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="inventory-table-container">
          <div className="table-empty-state">
            <ShoppingCart size={48} strokeWidth={1.2} />
            <h3>No se encontraron ventas</h3>
            <p>
              {hasActiveFilters
                ? 'No hay ventas que coincidan con los filtros aplicados. Prueba ajustar la búsqueda.'
                : 'Aún no se han registrado ventas en el sistema.'}
            </p>
            {hasActiveFilters && (
              <button className="btn-ghost" onClick={handleClearFilters} style={{ marginTop: '0.5rem' }}>
                <X size={15} /> Limpiar filtros
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="inventory-table-container">
          <div className="table-responsive-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Fecha y Hora</th>
                  <th>Tipo</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Ítems</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      <span className="code-chip">{sale.codigo}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span style={{ color: 'var(--text-strong)', fontWeight: 500, fontSize: '0.88rem' }}>
                          {formatDate(sale.fecha)}
                        </span>
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {formatTime(sale.fecha)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`stock-badge ${sale.tipo === 'mayor' ? 'low-stock' : 'in-stock'}`}>
                        {sale.tipo === 'mayor' ? 'Mayor' : 'Menor'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <span style={{ color: 'var(--text-strong)', fontWeight: 500, fontSize: '0.88rem' }}>
                          {sale.cliente?.nombre || '—'}
                        </span>
                        {sale.cliente?.ciNit && (
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {sale.cliente.ciNit}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text)', fontSize: '0.88rem' }}>
                        {sale.usuario?.nombre || '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                        {sale.items.length}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="price-tag">{formatCurrency(sale.total)}</span>
                    </td>
                    <td>
                      <div className="table-actions-cell">
                        <button
                          className="btn-table-action"
                          title="Ver detalle"
                          onClick={() => setSelectedSale(sale)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="btn-table-action"
                          title="Imprimir nota de venta"
                          onClick={() => handlePrintNota(sale.id)}
                        >
                          <Printer size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selectedSale && (
        <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
          <div
            className="modal-dialog"
            style={{ maxWidth: 680, maxHeight: '88vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Title Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="code-chip" style={{ fontSize: '0.85rem', padding: '0.3rem 0.65rem' }}>
                  {selectedSale.codigo}
                </span>
                <span className={`stock-badge ${selectedSale.tipo === 'mayor' ? 'low-stock' : 'in-stock'}`}>
                  {selectedSale.tipo === 'mayor' ? 'Venta por Mayor' : 'Venta al Detalle'}
                </span>
              </div>
              <button className="btn-table-action" onClick={() => setSelectedSale(null)} style={{ padding: 6 }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: 'calc(88vh - 140px)' }}>
              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--accent)' }}>
                    <Clock size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Fecha y Hora</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-strong)', fontWeight: 500 }}>
                      {formatDate(selectedSale.fecha)} · {formatTime(selectedSale.fecha)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#34d399' }}>
                    <User size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Cliente</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-strong)', fontWeight: 500 }}>
                      {selectedSale.cliente?.nombre || 'Sin cliente'}
                    </div>
                    {selectedSale.cliente?.ciNit && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        CI/NIT: {selectedSale.cliente.ciNit}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(251,191,36,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fbbf24' }}>
                    <User size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Vendedor</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-strong)', fontWeight: 500 }}>
                      {selectedSale.usuario?.nombre || '—'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(167,139,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#a78bfa' }}>
                    <FileText size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Factura</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-strong)', fontWeight: 500 }}>
                      {selectedSale.requiereFactura ? 'Requiere factura' : 'No requiere'}
                    </div>
                  </div>
                </div>

                {selectedSale.location && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(56,189,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#38bdf8' }}>
                      <MapPin size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Ubicación</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-strong)', fontWeight: 500 }}>
                        {selectedSale.location.nombre}
                      </div>
                    </div>
                  </div>
                )}

                {selectedSale.lugarEntrega && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(56,189,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#38bdf8' }}>
                      <MapPin size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Lugar de Entrega</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-strong)', fontWeight: 500 }}>
                        {selectedSale.lugarEntrega}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Products Table */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Tag size={16} style={{ color: 'var(--accent)' }} />
                  Productos ({selectedSale.items.length})
                </h3>
                <div className="table-responsive-wrapper" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  <table className="inventory-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cant.</th>
                        <th>Precio Unit.</th>
                        <th style={{ textAlign: 'right' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>
                                {item.product?.producto || `Producto #${item.productId}`}
                              </span>
                              {item.product?.codigoFabrica && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                  {item.product.codigoFabrica}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{item.cantidad}</td>
                          <td>{formatCurrency(item.precio)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span className="price-tag">{formatCurrency(item.subtotal)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.25rem',
                background: 'var(--accent-soft)',
                border: '1px solid var(--accent-border)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1.25rem',
              }}>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-strong)' }}>Total de la Venta</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent)' }}>
                  {formatCurrency(selectedSale.total)}
                </span>
              </div>

              {/* Payments */}
              {selectedSale.pagos.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Receipt size={16} style={{ color: 'var(--accent)' }} />
                    Pagos ({selectedSale.pagos.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedSale.pagos.map((pago) => (
                      <div
                        key={pago.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.7rem 1rem',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <span style={{ fontSize: '0.88rem', color: 'var(--text)', fontWeight: 500 }}>{pago.metodo}</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-strong)' }}>{formatCurrency(pago.monto)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border)',
            }}>
              <button className="btn-ghost" onClick={() => setSelectedSale(null)}>
                Cerrar
              </button>
              <button className="btn-primary" onClick={() => handlePrintNota(selectedSale.id)}>
                <Printer size={16} /> Imprimir Nota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
