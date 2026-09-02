import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context';
import { productsService } from '../../services/products.service';
import { salesService, type SaleInput, type SaleItemInput, type PaymentInput, type WholesalePreviewResult, type WholesaleImportMeta, getPaymentMethods, formatCurrency } from '../../services/sales.service';
import type { Product } from '../../types/product.types';
import { resolveImageUrl } from '../../api/client';
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, RotateCcw, CheckCircle2, AlertCircle, AlertTriangle, Loader2, X, Printer, UserPlus, FileSpreadsheet, Upload, Download, Eye } from 'lucide-react';
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

export function VentaMayorPage() {
  const { user } = useAuth();

  const [mode, setMode] = useState<'manual' | 'excel'>('manual');
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastSaleId, setLastSaleId] = useState<number | null>(null);
  const [clientErrors, setClientErrors] = useState<{ nombre?: string; ciNit?: string; celular?: string }>({});

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [previewResult, setPreviewResult] = useState<WholesalePreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);

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
  const hasStockViolation = cart.some((item) => {
    const p = products.find((pr) => pr.id === item.productId);
    return p && item.cantidad > getProductStock(p);
  });
  const canSubmitManual = cart.length > 0 && !hasStockViolation && Math.abs(paymentsTotal - cartTotal) < 0.01
    && Object.keys(clientErrors).length === 0
    && !(requiereFactura && (!cliente.nombre || !cliente.ciNit));

  const previewTotal = previewResult?.total ?? 0;
  const activeTotal = mode === 'manual' ? cartTotal : previewTotal;
  const change = paymentsTotal - activeTotal;
  const canSubmitExcel = !!excelFile && previewResult?.ok === true && previewResult.items.length > 0 && Math.abs(paymentsTotal - previewTotal) < 0.01;

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
    const price = product.precioMayor ?? product.precio1 ?? product.precio2 ?? product.costo ?? 0;
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

  const handleQuickPayment = (method: PaymentInput['metodo']) => {
    const total = mode === 'manual' ? cartTotal : previewTotal;
    setPayments([{ metodo: method, monto: total }]);
  };

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setExcelFile(file);
      setPreviewResult(null);
    }
  };

  const handlePreviewExcel = async () => {
    if (!excelFile) {
      showToast('Seleccione un archivo Excel', 'error');
      return;
    }
    setPreviewing(true);
    setError(null);
    try {
      const result = await salesService.previewExcel(excelFile);
      setPreviewResult(result);
      if (!result.ok) {
        showToast('El archivo contiene errores. Revise la vista previa.', 'error');
      } else {
        showToast('Vista previa generada. Revise y confirme.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar archivo';
      showToast(msg, 'error');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSubmitManual = async () => {
    if (!canSubmitManual) {
      showToast('Verifique que el total de pagos coincida con el total de la venta y haya stock', 'error');
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
        tipo: 'mayor',
        items: cart,
        pagos: payments,
        cliente: cliente.nombre ? cliente : undefined,
        requiereFactura,
        lugarEntrega: lugarEntrega || undefined,
        paraQuien: paraQuien || undefined,
        locationId: user?.tiendaId ?? undefined,
      };

      const response = await salesService.createSale(saleInput);
      showToast(`¡Venta por mayor ${response.codigo} registrada exitosamente!`);
      setLastSaleId(response.id);

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

  const handleSubmitExcel = async () => {
    if (!canSubmitExcel || !excelFile) {
      showToast('Verifique que el archivo sea válido y el total de pagos coincida', 'error');
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

    setImporting(true);
    setError(null);
    try {
      const meta: WholesaleImportMeta = {
        cliente: cliente.nombre ? cliente : undefined,
        requiereFactura,
        lugarEntrega: lugarEntrega || undefined,
        paraQuien: paraQuien || undefined,
        locationId: user?.tiendaId ?? undefined,
        pagos: payments,
      };

      const response = await salesService.importExcel(excelFile, meta);
      showToast(`¡Venta por mayor ${response.codigo} registrada exitosamente!`);
      setLastSaleId(response.id);

      setExcelFile(null);
      setPreviewResult(null);
      setPayments([{ metodo: 'efectivo', monto: 0 }]);
      setCliente({ nombre: '', ciNit: '', celular: '' });
      setRequiereFactura(false);
      setLugarEntrega('');
      setParaQuien('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al importar la venta';
      showToast(msg, 'error');
    } finally {
      setImporting(false);
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

  const downloadTemplate = () => {
    const headers = ['Código Fábrica', 'Descripción', 'Producto', 'Marca', 'Modelo', 'Años', 'Detalle', 'Precio Mayor', 'Cantidad'];
    const sampleData = [
      ['FAR-001', 'Farol delantero', 'Farol Delantero', 'Toyota', 'Hilux', '2015-2020', 'Lado izquierdo', '150.00', '2'],
      ['GUI-002', 'Guiñador lateral', 'Guiñador', 'Nissan', 'Frontier', '2018-2022', 'Lado derecho', '45.00', '5'],
    ];
    const csv = [headers, ...sampleData].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_venta_mayor.csv';
    link.click();
  };

  return (
    <div className="sales-page venta-mayor-page">
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

      <div className="page-header">
        <div>
          <h1 className="page-title">Venta por Mayor</h1>
          <p className="page-subtitle">
            Carga rápida de pedidos por lista manual o importación de archivo Excel con validación de stock
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button type="button" className="btn-secondary" onClick={downloadTemplate} title="Descargar plantilla CSV">
            <Download size={15} />
            <span>Plantilla</span>
          </button>
        </div>
      </div>

      <div className="mode-tabs">
        <button
          className={`mode-tab ${mode === 'manual' ? 'active' : ''}`}
          onClick={() => { setMode('manual'); setPreviewResult(null); setExcelFile(null); setPayments([{ metodo: 'efectivo', monto: 0 }]); }}
        >
          <ShoppingCart size={18} />
          <span>Opción A: Ingreso Manual</span>
        </button>
        <button
          className={`mode-tab ${mode === 'excel' ? 'active' : ''}`}
          onClick={() => { setMode('excel'); setCart([]); setPreviewResult(null); setPayments([{ metodo: 'efectivo', monto: 0 }]); }}
        >
          <FileSpreadsheet size={18} />
          <span>Opción B: Importar Excel</span>
        </button>
      </div>

      <div className="sales-grid">
        {mode === 'manual' && (
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
                    const precioMayor = product.precioMayor ?? product.precio1 ?? product.precio2 ?? product.costo ?? 0;
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
                            <span className="price-tag">P. Mayor: {formatCurrency(precioMayor)}</span>
                            {product.precio1 && <span className="price-secondary">P1: {formatCurrency(product.precio1)}</span>}
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
                        </div>
                        {!outOfStock && <Plus size={20} className="add-btn" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {mode === 'excel' && (
          <div className="sales-left excel-import-panel">
            <div className="panel">
              <div className="panel-header">
                <h2><Upload size={20} /> Importar Archivo Excel</h2>
              </div>

              <div className="excel-upload-area">
                <input
                  type="file"
                  id="excel-file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelFileChange}
                  className="excel-file-input"
                />
                <label htmlFor="excel-file" className="excel-upload-label">
                  {excelFile ? (
                    <>
                      <FileSpreadsheet size={48} color="#38bdf8" />
                      <p>Archivo seleccionado: <strong>{excelFile.name}</strong></p>
                      <span className="hint">Haga clic para cambiar</span>
                    </>
                  ) : (
                    <>
                      <Upload size={48} />
                      <p>Arrastre un archivo Excel o <strong>haga clic para seleccionar</strong></p>
                      <span className="hint">Formatos: .xlsx, .xls, .csv</span>
                    </>
                  )}
                </label>
              </div>

              <div className="excel-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handlePreviewExcel}
                  disabled={!excelFile || previewing}
                >
                  {previewing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <Eye size={18} />
                      <span>Vista Previa</span>
                    </>
                  )}
                </button>
                <button type="button" className="btn-secondary" onClick={downloadTemplate}>
                  <Download size={18} /> Descargar Plantilla
                </button>
              </div>

              {previewResult && (
                <div className={`excel-preview ${previewResult.ok ? 'success' : 'error'}`}>
                  <div className="preview-header">
                    <h3>
                      {previewResult.ok ? <CheckCircle2 size={20} color="#10b981" /> : <AlertCircle size={20} color="#ef4444" />}
                      Vista Previa - {previewResult.items.length} productos
                    </h3>
                    <span className="preview-total">Total: {formatCurrency(previewResult.total)}</span>
                  </div>

                  {previewResult.warnings && previewResult.warnings.length > 0 && (
                    <div className="preview-warnings">
                      <AlertTriangle size={16} />
                      <ul>
                        {previewResult.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {previewResult.errors && previewResult.errors.length > 0 && (
                    <div className="preview-errors">
                      <AlertCircle size={16} />
                      <ul>
                        {previewResult.errors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="preview-table-container">
                    <table className="preview-table">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Código Fábrica</th>
                          <th>Cantidad</th>
                          <th>P. Mayor</th>
                          <th>Stock Disp.</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewResult.items.map((item, i) => (
                          <tr key={i} style={{ opacity: previewResult.ok ? 1 : 0.6 }}>
                            <td>{item.producto}</td>
                            <td style={{ fontFamily: 'var(--font-mono)' }}>{item.codigoFabrica}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'center' }}>{item.cantidad}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{formatCurrency(item.precio)}</td>
                            <td style={{
                              fontFamily: 'var(--font-mono)',
                              textAlign: 'center',
                              color: item.stockDisponible === 0 ? '#ef4444' : item.stockDisponible <= 1 ? '#f59e0b' : 'var(--text-muted)',
                            }}>{item.stockDisponible}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', fontWeight: 600 }}>
                              {formatCurrency(item.cantidad * item.precio)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="sales-right">
          {mode === 'manual' && cart.length > 0 && (
            <div className="panel cart-panel">
              <div className="panel-header">
                <h2><ShoppingCart size={20} /> Carrito ({cart.length} items)</h2>
              </div>

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
                            {product?.marca} {product?.modelo} | {formatCurrency(item.precio)} c/u
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
            </div>
          )}

          {mode === 'excel' && previewResult && previewResult.ok && previewResult.items.length > 0 && (
            <div className="panel cart-panel excel-summary">
              <div className="panel-header">
                <h2><ShoppingCart size={20} /> Resumen de Importación ({previewResult.items.length} items)</h2>
              </div>
              <div className="cart-items">
                {previewResult.items.map((item, i) => (
                  <div key={i} className="cart-item">
                    <div className="cart-item-main">
                      <div className="cart-item-info">
                        <div className="cart-item-name">{item.producto}</div>
                        <div className="cart-item-detail" style={{ fontSize: '0.75rem' }}>
                          {item.codigoFabrica} | {formatCurrency(item.precio)} c/u
                        </div>
                      </div>
                      <div className="cart-item-qty">
                        <span className="qty-value">{item.cantidad}</span>
                      </div>
                    </div>
                    <div className="cart-item-subtotal">
                      {formatCurrency(item.cantidad * item.precio)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="cart-summary">
                <div className="summary-row total">
                  <span>TOTAL</span>
                  <span>{formatCurrency(previewResult.total)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="panel payment-panel">
            <div className="panel-header">
              <h2><CreditCard size={20} /> Cobro</h2>
            </div>

            <div className="quick-payments">
              {paymentMethods.map((method) => {
                const total = mode === 'manual' ? cartTotal : previewTotal;
                const isActive = payments.length === 1 && payments[0].metodo === method.id && payments[0].monto === total;
                return (
                  <button
                    key={method.id}
                    type="button"
                    className={`quick-pay-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleQuickPayment(method.id)}
                    disabled={(mode === 'manual' ? cart.length === 0 : !previewResult?.ok)}
                  >
                    <span className="pay-icon">{method.icon}</span>
                    <span>{method.label}</span>
                  </button>
                );
              })}
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
                <span className="total-venta">{formatCurrency(mode === 'manual' ? cartTotal : previewTotal)}</span>
              </div>
              <div className="summary-row">
                <span>Total Pagos</span>
                <span className={`total-pagos ${paymentsTotal < (mode === 'manual' ? cartTotal : previewTotal) ? 'short' : ''}`}>{formatCurrency(paymentsTotal)}</span>
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
                  placeholder="Lugar de entrega (ej. Cochabamba)"
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
            {lastSaleId && (
              <button
                type="button"
                className="btn-secondary full-width"
                onClick={handlePrintNota}
              >
                <Printer size={18} /> Imprimir Última Nota
              </button>
            )}
            <button
              type="button"
              className="btn-primary full-width"
              onClick={mode === 'manual' ? handleSubmitManual : handleSubmitExcel}
              disabled={mode === 'manual' ? (!canSubmitManual || submitting || cart.length === 0) : (!canSubmitExcel || importing || !excelFile)}
            >
              {mode === 'manual' ? (
                submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Procesando venta...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Confirmar Venta por Mayor - {formatCurrency(cartTotal)}</span>
                  </>
                )
              ) : (
                importing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Importando y registrando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Confirmar Venta por Mayor - {formatCurrency(previewTotal)}</span>
                  </>
                )
              )}
            </button>
            <button
              type="button"
              className="btn-danger full-width"
              onClick={() => {
                setCart([]);
                setExcelFile(null);
                setPreviewResult(null);
                setPayments([{ metodo: 'efectivo', monto: 0 }]);
                setCliente({ nombre: '', ciNit: '', celular: '' });
                setRequiereFactura(false);
                setLugarEntrega('');
                setParaQuien('');
                setLastSaleId(null);
                showToast('Venta cancelada', 'error');
              }}
              disabled={cart.length === 0 && paymentsTotal === 0 && !excelFile}
            >
              <RotateCcw size={18} /> Cancelar Venta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}