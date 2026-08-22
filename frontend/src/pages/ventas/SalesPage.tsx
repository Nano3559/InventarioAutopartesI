import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context';
import { productsService } from '../../services/products.service';
import { salesService, type SaleInput, type SaleItemInput, type PaymentInput, type PaymentMethod, getPaymentMethods, formatCurrency } from '../../services/sales.service';
import type { Product } from '../../types/product.types';
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, RotateCcw, CheckCircle2, AlertCircle, Loader2, X, Printer, UserPlus } from 'lucide-react';
import '../../styles/sales.css';

export function SalesPage() {
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);

  const [cart, setCart] = useState<SaleItemInput[]>([]);

  const [payments, setPayments] = useState<PaymentInput[]>([{ metodo: 'efectivo', monto: 0 }]);
  const [cliente, setCliente] = useState({ nombre: '', ciNit: '', celular: '' });
  const [requiereFactura, setRequiereFactura] = useState(false);
  const [lugarEntrega, setLugarEntrega] = useState('');
  const [paraQuien, setParaQuien] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastSaleId, setLastSaleId] = useState<number | null>(null);

  const paymentMethods = getPaymentMethods();

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await productsService.getProducts({});
        setProducts(data);
        setFilteredProducts(data);
      } catch (err) {
        console.error('Error loading products:', err);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadProducts();
  }, []);

  useEffect(() => {
    const results = products.filter((p) => {
      const search = searchTerm.toLowerCase();
      return (
        p.producto.toLowerCase().includes(search) ||
        p.marca.toLowerCase().includes(search) ||
        p.modelo.toLowerCase().includes(search) ||
        (p.codigoOem && p.codigoOem.toLowerCase().includes(search)) ||
        p.codigoFabrica.toLowerCase().includes(search) ||
        p.fabricante.toLowerCase().includes(search)
      );
    });
    setFilteredProducts(results);
  }, [searchTerm, products]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.cantidad * item.precio, 0), [cart]);
  const paymentsTotal = useMemo(() => payments.reduce((sum, p) => sum + p.monto, 0), [payments]);
  const change = paymentsTotal - cartTotal;
  const canSubmit = cart.length > 0 && Math.abs(paymentsTotal - cartTotal) < 0.01;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') {
      setSuccess(message);
      setError(null);
    } else {
      setError(message);
      setSuccess(null);
    }
    setTimeout(() => { setSuccess(null); setError(null); }, 4000);
  };

  const handleAddToCart = (product: Product) => {
    const existing = cart.find((item) => item.productId === product.id);
    const price = product.precio1 ?? product.precio2 ?? product.precioMayor ?? product.costo ?? 0;
    
    if (existing) {
      setCart(cart.map((item) =>
        item.productId === product.id ? { ...item, cantidad: item.cantidad + 1 } : item
      ));
    } else {
      setCart([...cart, { productId: product.id, cantidad: 1, precio: price }]);
    }
    showToast(`Agregado: ${product.producto}`);
  };

  const handleQtyChange = (productId: number, delta: number) => {
    setCart(cart.map((item) => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.cantidad + delta);
        return { ...item, cantidad: newQty };
      }
      return item;
    }));
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const handlePaymentChange = (index: number, field: 'metodo' | 'monto', value: string | number) => {
    setPayments(payments.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleAddPayment = () => {
    setPayments([...payments, { metodo: 'efectivo', monto: 0 }]);
  };

  const handleRemovePayment = (index: number) => {
    if (payments.length > 1) {
      setPayments(payments.filter((_, i) => i !== index));
    }
  };

  const handleQuickPayment = (method: PaymentMethod) => {
    setPayments([{ metodo: method, monto: cartTotal }]);
  };

  const handleSubmitSale = async () => {
    if (!canSubmit) {
      showToast('Verifique que el total de pagos coincida con el total de la venta', 'error');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const saleInput: SaleInput = {
        tipo: 'menor',
        items: cart,
        pagos: payments,
        cliente: cliente.nombre ? cliente : undefined,
        requiereFactura,
        lugarEntrega: lugarEntrega || undefined,
        paraQuien: paraQuien || undefined,
        locationId: user?.tiendaId ?? undefined,
      };
      const response = await salesService.createSale(saleInput);
      setLastSaleId(response.id);
      showToast(`¡Venta ${response.codigo} registrada exitosamente!`);
      
      setCart([]);
      setPayments([{ metodo: 'efectivo', monto: 0 }]);
      setCliente({ nombre: '', ciNit: '', celular: '' });
      setRequiereFactura(false);
      setLugarEntrega('');
      setParaQuien('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la venta';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintNota = async () => {
    if (!lastSaleId) return;
    try {
      const html = await salesService.getNotaVenta(lastSaleId);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
      }
    } catch (err) {
      showToast('Error al generar nota de venta', 'error');
    }
  };

  const getCartProduct = (productId: number): Product | undefined => {
    return products.find((p) => p.id === productId);
  };

  return (
    <div className="sales-page">
      {error && (
        <div className="toast toast-error" role="alert">
          <AlertCircle size={20} /> <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="toast toast-success" role="alert">
          <CheckCircle2 size={20} /> <span>{success}</span>
        </div>
      )}

      <div className="sales-grid">
        <div className="sales-left">
          <div className="panel search-panel">
            <div className="panel-header">
              <h2><Search size={20} /> Buscar Productos</h2>
              <button
                className="btn-toggle-search"
                onClick={() => setShowProductSearch(!showProductSearch)}
              >
                {showProductSearch ? <X size={18} /> : <Search size={18} />}
              </button>
            </div>

            {showProductSearch && (
              <div className="search-input-wrapper">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, marca, modelo, OEM, código fábrica..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                  autoFocus
                />
              </div>
            )}

            <div className="products-list">
              {loadingProducts ? (
                <div className="loading-state">
                  <Loader2 size={24} className="animate-spin" />
                  <span>Cargando catálogo...</span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="empty-state">
                  <ShoppingCart size={32} />
                  <p>{searchTerm ? 'No se encontraron productos' : 'Catálogo vacío'}</p>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    className="product-card"
                    onClick={() => handleAddToCart(product)}
                    title={`${product.producto} - ${product.marca} ${product.modelo}`}
                  >
                    <div className="product-card-image">
                      {product.imagen ? (
                        <img src={product.imagen} alt={product.producto} />
                      ) : (
                        <ShoppingCart size={24} className="product-placeholder" />
                      )}
                    </div>
                    <div className="product-card-info">
                      <div className="product-card-name">{product.producto}</div>
                      <div className="product-card-vehicle">
                        {product.marca} {product.modelo} {product.anio && `(${product.anio})`}
                      </div>
                      <div className="product-card-codes">
                        {product.codigoFabrica && <span className="code-tag">Fáb: {product.codigoFabrica}</span>}
                        {product.codigoOem && <span className="code-tag oem">OEM: {product.codigoOem}</span>}
                      </div>
                      <div className="product-card-prices">
                        <span className="price-tag">P1: {formatCurrency(product.precio1 ?? product.costo ?? 0)}</span>
                        {product.precio2 && <span className="price-secondary">P2: {formatCurrency(product.precio2)}</span>}
                      </div>
                      <div className="product-card-stock">
                        Stock: {product.stockTotal ?? 0} uds.
                      </div>
                    </div>
                    <Plus size={20} className="add-btn" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="sales-right">
          <div className="panel cart-panel">
            <div className="panel-header">
              <h2><ShoppingCart size={20} /> Carrito ({cart.length} items)</h2>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <ShoppingCart size={48} />
                <p>El carrito está vacío</p>
                <span className="hint">Busque productos y haga clic para agregarlos</span>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => {
                    const product = getCartProduct(item.productId);
                    const subtotal = item.cantidad * item.precio;
                    return (
                      <div key={item.productId} className="cart-item">
                        <div className="cart-item-main">
                          <div className="cart-item-info">
                            <div className="cart-item-name">{product?.producto || 'Producto desconocido'}</div>
                            <div className="cart-item-detail">
                              {product?.marca} {product?.modelo} | {formatCurrency(item.precio)} c/u
                            </div>
                          </div>
                          <div className="cart-item-qty">
                            <button onClick={() => handleQtyChange(item.productId, -1)} className="qty-btn" aria-label="Disminuir">
                              <Minus size={16} />
                            </button>
                            <span className="qty-value">{item.cantidad}</span>
                            <button onClick={() => handleQtyChange(item.productId, 1)} className="qty-btn" aria-label="Aumentar">
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="cart-item-subtotal">
                          {formatCurrency(subtotal)}
                          <button onClick={() => handleRemoveFromCart(item.productId)} className="remove-btn" aria-label="Eliminar">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="cart-summary">
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <span>{formatCurrency(cartTotal)}</span>
                  </div>
                  <div className="summary-row total">
                    <span>TOTAL</span>
                    <span>{formatCurrency(cartTotal)}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="panel payment-panel">
            <div className="panel-header">
              <h2><CreditCard size={20} /> Cobro</h2>
            </div>

            <div className="quick-payments">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  className={`quick-pay-btn ${payments.length === 1 && payments[0].metodo === method.id && payments[0].monto === cartTotal ? 'active' : ''}`}
                  onClick={() => handleQuickPayment(method.id)}
                  disabled={cart.length === 0}
                >
                  <span className="pay-icon">{method.icon}</span>
                  <span>{method.label}</span>
                </button>
              ))}
            </div>

            <div className="payments-detail">
              {payments.map((payment, index) => (
                <div key={index} className="payment-row">
                  <select
                    value={payment.metodo}
                    onChange={(e) => handlePaymentChange(index, 'metodo', e.target.value)}
                    className="payment-method-select"
                  >
                    {paymentMethods.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={payment.monto}
                    onChange={(e) => handlePaymentChange(index, 'monto', parseFloat(e.target.value) || 0)}
                    className="payment-amount-input"
                    placeholder="Monto"
                  />
                  {payments.length > 1 && (
                    <button type="button" className="remove-payment-btn" onClick={() => handleRemovePayment(index)}>
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              {payments.length < 4 && (
                <button type="button" className="add-payment-btn" onClick={handleAddPayment}>
                  <Plus size={18} /> Agregar otro pago
                </button>
              )}
            </div>

            <div className="payment-summary">
              <div className="summary-row">
                <span>Total Venta</span>
                <span className="total-venta">{formatCurrency(cartTotal)}</span>
              </div>
              <div className="summary-row">
                <span>Total Pagos</span>
                <span className={`total-pagos ${paymentsTotal < cartTotal ? 'short' : ''}`}>{formatCurrency(paymentsTotal)}</span>
              </div>
              {change !== 0 && (
                <div className="summary-row change">
                  <span>Vuelto</span>
                  <span className={change >= 0 ? 'positive' : 'negative'}>{formatCurrency(Math.abs(change))}</span>
                </div>
              )}
            </div>
          </div>

          <div className="panel client-panel">
            <div className="panel-header">
              <h2><UserPlus size={20} /> Datos del Cliente (Opcional)</h2>
            </div>
            <div className="client-form">
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Nombre / Razón Social"
                  value={cliente.nombre}
                  onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
                  className="form-input"
                />
                <input
                  type="text"
                  placeholder="CI / NIT"
                  value={cliente.ciNit}
                  onChange={(e) => setCliente({ ...cliente, ciNit: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-row">
                <input
                  type="tel"
                  placeholder="Celular"
                  value={cliente.celular}
                  onChange={(e) => setCliente({ ...cliente, celular: e.target.value })}
                  className="form-input"
                />
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={requiereFactura}
                  onChange={(e) => setRequiereFactura(e.target.checked)}
                />
                <span>Requiere factura</span>
              </label>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Lugar de entrega"
                  value={lugarEntrega}
                  onChange={(e) => setLugarEntrega(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Para quién es el pedido"
                  value={paraQuien}
                  onChange={(e) => setParaQuien(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div className="panel actions-panel">
            <button
              type="button"
              className="btn-secondary full-width"
              onClick={handlePrintNota}
              disabled={!lastSaleId}
            >
              <Printer size={18} /> Imprimir Última Nota
            </button>
            <button
              type="button"
              className="btn-primary full-width"
              onClick={handleSubmitSale}
              disabled={!canSubmit || submitting || cart.length === 0}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Procesando venta...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Confirmar Venta - {formatCurrency(cartTotal)}</span>
                </>
              )}
            </button>
            <button
              type="button"
              className="btn-danger full-width"
              onClick={() => {
                setCart([]);
                setPayments([{ metodo: 'efectivo', monto: 0 }]);
                setCliente({ nombre: '', ciNit: '', celular: '' });
                setRequiereFactura(false);
                setLugarEntrega('');
                setParaQuien('');
                setLastSaleId(null);
                showToast('Venta cancelada', 'error');
              }}
              disabled={cart.length === 0 && paymentsTotal === 0}
            >
              <RotateCcw size={18} /> Cancelar Venta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}