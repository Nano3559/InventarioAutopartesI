import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context';
import { useParams, useNavigate } from 'react-router-dom';
import { productsService } from '../../services/products.service';
import { salesService, type SaleInput, type SaleItemInput, type PaymentInput, type PaymentMethod, getPaymentMethods, formatCurrency } from '../../services/sales.service';
import type { Product } from '../../types/product.types';
import type { SaleResponse } from '../../services/sales.service';
import { resolveImageUrl } from '../../api/client';
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, RotateCcw, CheckCircle2, AlertCircle, Loader2, X, Printer, UserPlus, Edit, ClipboardList } from 'lucide-react';
import '../../styles/sales.css';

const validateCI = (value: string): boolean => {
  if (!value) return true;
  const trimmed = value.trim().toUpperCase();
  const ciPattern = /^\d{7,8}$/;
  const ciExtPattern = /^\d{7,8}(LP|CH|CB|OR|TJ|SC|BE|PA|PO|PT|ON|SA|DA|SU)$/;
  const nitPattern = /^\d{10,12}$/;
  return ciPattern.test(trimmed) || ciExtPattern.test(trimmed) || nitPattern.test(trimmed);
};

const validatePhone = (value: string): boolean => {
  if (!value) return true;
  const trimmed = value.trim();
  return /^[67]\d{7}$/.test(trimmed);
};

const validateName = (value: string): boolean => {
  if (!value) return true;
  return /^[a-zA-ZáéíóúñüÁÉÍÓÚÑÜ0-9\s.,&'\-()]+$/.test(value.trim());
};

export function SalesPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const editingSaleId = id ? parseInt(id, 10) : null;
  const isEditing = editingSaleId !== null;

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);

  const [cart, setCart] = useState<SaleItemInput[]>([]);

  const [payments, setPayments] = useState<PaymentInput[]>([{ metodo: 'efectivo', monto: 0 }]);
  const [cliente, setCliente] = useState({ nombre: '', ciNit: '', celular: '' });
  const [requiereFactura, setRequiereFactura] = useState(false);
  const [lugarEntrega, setLugarEntrega] = useState('');
  const [paraQuien, setParaQuien] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [loadingSale, setLoadingSale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastSaleId, setLastSaleId] = useState<number | null>(null);
  const [clientErrors, setClientErrors] = useState<{ nombre?: string; ciNit?: string; celular?: string }>({});

  const paymentMethods = getPaymentMethods();

  const getProductStock = (product: Product): number => {
    if (user?.tiendaId && product.stockByLocation) {
      return product.stockByLocation[user.tiendaId] ?? 0;
    }
    return product.stockTotal ?? 0;
  };

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await productsService.getProducts({});
        setProducts(data);
      } catch (err) {
        console.error('Error loading products:', err);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadProducts();
  }, []);

  // Cargar venta existente si estamos en modo edición
  useEffect(() => {
    if (!isEditing || editingSaleId === null) return;
    
    async function loadSale() {
      setLoadingSale(true);
      try {
        const sale = await salesService.getSaleById(editingSaleId as number);
        
        // Poblar carrito con items de la venta
        const cartItems: SaleItemInput[] = sale.items.map(item => ({
          productId: item.productId,
          cantidad: item.cantidad,
          precio: item.precio,
        }));
        setCart(cartItems);
        
        // Poblar pagos
        const paymentItems: PaymentInput[] = sale.pagos.map(p => ({
          metodo: p.metodo,
          monto: p.monto,
        }));
        setPayments(paymentItems.length > 0 ? paymentItems : [{ metodo: 'efectivo', monto: 0 }]);
        
        // Poblar cliente
        if (sale.cliente) {
          setCliente({
            nombre: sale.cliente.nombre,
            ciNit: sale.cliente.ciNit ?? '',
            celular: sale.cliente.celular ?? '',
          });
        }
        
        // Poblar campos adicionales
        setRequiereFactura(sale.requiereFactura);
        setLugarEntrega(sale.lugarEntrega ?? '');
        setParaQuien(sale.paraQuien ?? '');
        
        setLastSaleId(sale.id);
      } catch (err) {
        console.error('Error loading sale:', err);
        setError('Error al cargar la venta para editar');
        navigate('/ventas');
      } finally {
        setLoadingSale(false);
      }
    }
    
    loadSale();
  }, [isEditing, editingSaleId, navigate]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
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
  }, [searchTerm, products]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.cantidad * item.precio, 0), [cart]);
  const paymentsTotal = useMemo(() => payments.reduce((sum, p) => sum + p.monto, 0), [payments]);
  const change = paymentsTotal - cartTotal;
  const hasStockViolation = cart.some((item) => {
    const p = products.find((pr) => pr.id === item.productId);
    return p && item.cantidad > getProductStock(p);
  });
  const canSubmit = cart.length > 0 && !hasStockViolation && Math.abs(paymentsTotal - cartTotal) < 0.01
    && Object.keys(clientErrors).length === 0
    && !(requiereFactura && (!cliente.nombre || !cliente.ciNit));

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
    const available = getProductStock(product);
    
    if (existing) {
      if (existing.cantidad >= available) {
        showToast(`No hay más stock disponible de "${product.producto}". Disponible: ${available}`, 'error');
        return;
      }
      setCart(cart.map((item) =>
        item.productId === product.id ? { ...item, cantidad: item.cantidad + 1 } : item
      ));
    } else {
      if (available <= 0) {
        showToast(`"${product.producto}" no tiene stock disponible`, 'error');
        return;
      }
      setCart([...cart, { productId: product.id, cantidad: 1, precio: price }]);
    }
    showToast(`Agregado: ${product.producto}`);
  };

  const handleQtyChange = (productId: number, delta: number) => {
    const product = products.find((p) => p.id === productId);
    const available = product ? getProductStock(product) : 0;

    if (available <= 0) {
      showToast('El producto ya no tiene stock disponible.', 'error');
      setCart(cart.map((item) =>
        item.productId === productId && delta < 0
          ? { ...item, cantidad: Math.max(1, item.cantidad + delta) }
          : item
      ));
      return;
    }
    
    setCart(cart.map((item) => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.cantidad + delta);
        if (newQty > available) {
          showToast(`Stock máximo disponible: ${available} unidades`, 'error');
          return { ...item, cantidad: available };
        }
        return { ...item, cantidad: newQty };
      }
      return item;
    }));
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const handlePriceChange = (productId: number, newPrice: number) => {
    setCart(cart.map((item) =>
      item.productId === productId ? { ...item, precio: Math.max(0, newPrice) } : item
    ));
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

    if (requiereFactura && (!cliente.ciNit || !cliente.nombre)) {
      showToast('Para factura requiere: Nombre y CI/NIT', 'error');
      return;
    }

    if (cliente.nombre && !validateName(cliente.nombre)) {
      showToast('El nombre solo debe contener letras', 'error');
      return;
    }
    if (cliente.ciNit && !validateCI(cliente.ciNit)) {
      showToast('Formato de CI/NIT inválido', 'error');
      return;
    }
    if (cliente.celular && !validatePhone(cliente.celular)) {
      showToast('Celular inválido: 8 dígitos, empieza con 6 o 7', 'error');
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

      let response: SaleResponse;
      if (isEditing && editingSaleId !== null) {
        response = await salesService.updateSale(editingSaleId, saleInput);
        showToast(`¡Venta ${response.codigo} actualizada exitosamente!`);
      } else {
        response = await salesService.createSale(saleInput);
        showToast(`¡Venta ${response.codigo} registrada exitosamente!`);
      }
      
      setLastSaleId(response.id);
      
      // Si no estamos editando, limpiar formulario para nueva venta
      if (!isEditing) {
        setCart([]);
        setPayments([{ metodo: 'efectivo', monto: 0 }]);
        setCliente({ nombre: '', ciNit: '', celular: '' });
        setRequiereFactura(false);
        setLugarEntrega('');
        setParaQuien('');
      } else {
        // Si estamos editando, volver a la lista o dashboard
        setTimeout(() => navigate('/ventas'), 1500);
      }
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
      console.error('Error al generar nota de venta:', err);
      setError('Error al generar nota de venta');
    }
  };

  const getCartProduct = (productId: number): Product | undefined => {
    return products.find((p) => p.id === productId);
  };

  const validateClientField = (field: 'nombre' | 'ciNit' | 'celular', value: string) => {
    const newErrors = { ...clientErrors };
    if (field === 'nombre' && value && !validateName(value)) {
      newErrors.nombre = 'Solo se permiten letras y espacios';
    } else if (field === 'nombre') {
      delete newErrors.nombre;
    }
    if (field === 'ciNit' && value && !validateCI(value)) {
      newErrors.ciNit = 'CI: 7-8 dígitos (ej: 1234567 o 1234567LP). NIT: 10-12 dígitos';
    } else if (field === 'ciNit') {
      delete newErrors.ciNit;
    }
    if (field === 'celular' && value && !validatePhone(value)) {
      newErrors.celular = 'Celular: 8 dígitos, empieza con 6 o 7';
    } else if (field === 'celular') {
      delete newErrors.celular;
    }
    setClientErrors(newErrors);
  };

  const handleClientChange = (field: 'nombre' | 'ciNit' | 'celular', value: string) => {
    setCliente({ ...cliente, [field]: value });
    validateClientField(field, value);
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
                filteredProducts.map((product) => {
                  const locationStock = getProductStock(product);
                  const outOfStock = locationStock <= 0;
                  return (
                    <button
                      key={product.id}
                      className="product-card"
                      onClick={() => !outOfStock && handleAddToCart(product)}
                      title={`${product.producto} - ${product.marca} ${product.modelo}`}
                      disabled={outOfStock}
                      style={outOfStock ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                    >
                      <div className="product-card-image">
                        {resolveImageUrl(product.imagen) ? (
                          <img src={resolveImageUrl(product.imagen)!} alt={product.producto} />
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
                          {outOfStock ? (
                            <span className="stock-label stock-label--out">Sin stock</span>
                          ) : (
                            <span className={`stock-label ${locationStock <= (product.stockMinimo ?? 1) ? 'stock-label--low' : 'stock-label--ok'}`}>
                              Stock: {locationStock} uds.
                            </span>
                          )}
                        </div>
                        {user?.tiendaId && product.stockLocationDetails && product.stockLocationDetails.length > 0 && (
                          <div className="product-card-stock-breakdown">
                            {product.stockLocationDetails
                              .filter((sl) => sl.locationId === user.tiendaId)
                              .map((sl) => (
                                <span key={sl.locationId} className="stock-badge-location stock-badge-location--current">
                                  En mi tienda: {sl.cantidad} uds.
                                </span>
                              ))
                            }
                          </div>
                        )}
                      </div>
                      {!outOfStock && <Plus size={20} className="add-btn" />}
                        {outOfStock && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/solicitudes?productId=${product.id}`);
                            }}
                            style={{
                              background: 'rgba(245, 158, 11, 0.15)',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#f59e0b',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                            }}
                            title="Solicitar a almacén"
                          >
                            <ClipboardList size={14} />
                          </button>
                        )}
                    </button>
                  );
                })
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
                    const available = product ? getProductStock(product) : 0;
                    const atMax = item.cantidad >= available;
                    return (
                      <div key={item.productId} className="cart-item">
                        <div className="cart-item-main">
                          <div className="cart-item-info">
                            <div className="cart-item-name">{product?.producto || 'Producto desconocido'}</div>
                            <div className="cart-item-detail">
                              {product?.marca} {product?.modelo}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '4px' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Precio:</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.precio}
                                onChange={(e) => handlePriceChange(item.productId, parseFloat(e.target.value) || 0)}
                                style={{
                                  width: '80px',
                                  fontSize: '0.78rem',
                                  padding: '2px 4px',
                                  border: '1px solid var(--border)',
                                  borderRadius: '4px',
                                  background: 'var(--bg-alt)',
                                  color: 'var(--text-strong)',
                                  fontFamily: 'var(--font-mono)',
                                }}
                              />
                            </div>
                            <div className="cart-item-stock">
                              <span className={`cart-stock-badge ${atMax ? 'cart-stock-badge--max' : ''}`}>
                                Disp.: {available} uds.{atMax ? ' (máximo)' : ''}
                              </span>
                            </div>
                          </div>
                          <div className="cart-item-qty">
                            <button onClick={() => handleQtyChange(item.productId, -1)} className="qty-btn" aria-label="Disminuir">
                              <Minus size={16} />
                            </button>
                            <span className="qty-value" style={atMax ? { color: '#ef4444' } : undefined}>{item.cantidad}</span>
                            <button
                              onClick={() => handleQtyChange(item.productId, 1)}
                              className="qty-btn"
                              aria-label="Aumentar"
                              disabled={atMax}
                              style={atMax ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                            >
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
                <div>
                  <input
                    type="text"
                    placeholder="Nombre / Razón Social"
                    value={cliente.nombre}
                    onChange={(e) => handleClientChange('nombre', e.target.value)}
                    className={`form-input ${clientErrors.nombre ? 'form-input-error' : ''}`}
                    maxLength={100}
                  />
                  {clientErrors.nombre && <span className="form-error">{clientErrors.nombre}</span>}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="CI / NIT"
                    value={cliente.ciNit}
                    onChange={(e) => handleClientChange('ciNit', e.target.value)}
                    className={`form-input ${clientErrors.ciNit ? 'form-input-error' : ''}`}
                    maxLength={15}
                  />
                  {clientErrors.ciNit && <span className="form-error">{clientErrors.ciNit}</span>}
                </div>
              </div>
              <div className="form-row">
                <div>
                  <input
                    type="tel"
                    placeholder="Celular"
                    value={cliente.celular}
                    onChange={(e) => handleClientChange('celular', e.target.value)}
                    className={`form-input ${clientErrors.celular ? 'form-input-error' : ''}`}
                    maxLength={8}
                    onKeyPress={(e) => {
                      if (!/[0-9]/.test(e.key)) e.preventDefault();
                    }}
                  />
                  {clientErrors.celular && <span className="form-error">{clientErrors.celular}</span>}
                </div>
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
            {isEditing && (
              <div className="edit-mode-banner">
                <Edit size={18} />
                <span>Editando venta <strong>#{editingSaleId}</strong> — Los cambios actualizarán la venta existente</span>
              </div>
            )}
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
              disabled={!canSubmit || submitting || cart.length === 0 || loadingSale}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{isEditing ? 'Actualizando venta...' : 'Procesando venta...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>{isEditing ? 'Actualizar Venta' : 'Confirmar Venta'} - {formatCurrency(cartTotal)}</span>
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