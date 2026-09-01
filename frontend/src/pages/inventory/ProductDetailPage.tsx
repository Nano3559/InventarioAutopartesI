import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import {
  ArrowLeft,
  Boxes,
  Car,
  Copy,
  Check,
  Edit2,
  Trash2,
  Warehouse,
  Store,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  PackagePlus,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { productsService } from '../../services/products.service';
import type { Product, CreateProductDto } from '../../types/product.types';
import { useAuth } from '../../context';
import { ProductImageUploader } from '../../components/inventory/ProductImageUploader';
import { ProductPricingCard } from '../../components/inventory/ProductPricingCard';
import { ProductFormModal } from '../../components/inventory/ProductFormModal';
import { DeleteConfirmModal } from '../../components/inventory/DeleteConfirmModal';
import { AddStockModal } from '../../components/inventory/AddStockModal';
import '../../styles/product-detail.css';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.rol === 'admin';

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addStockModalOpen, setAddStockModalOpen] = useState(false);

  // Copy feedback
  const [copiedOem, setCopiedOem] = useState(false);
  const [copiedFab, setCopiedFab] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await productsService.getProductById(Number(id));
        if (isMounted) {
          setProduct(data);
          setError(null);
        }
      } catch (err) {
        console.error('Error al cargar detalle del producto:', err);
        if (isMounted) setError('No se pudo encontrar la información del repuesto.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProduct();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleUpdate = async (dto: CreateProductDto) => {
    if (!product) return;
    const updated = await productsService.updateProduct(product.id, dto);
    setProduct((prev) => (prev ? { ...prev, ...updated } : updated));
    showToast('Ficha técnica del repuesto actualizada.');
  };

  const handleDelete = async (productId: number) => {
    await productsService.deleteProduct(productId);
    navigate('/inventario');
  };

  const handleToggleActive = async () => {
    if (!product) return;
    const result = await productsService.toggleActive(product.id);
    setProduct((prev) => (prev ? { ...prev, activo: result.activo } : null));
    showToast(result.activo ? 'Producto activado.' : 'Producto desactivado.');
  };

  const handleStockUpdated = async () => {
    if (!id) return;
    const data = await productsService.getProductById(Number(id));
    setProduct(data);
    showToast('Stock actualizado correctamente.');
  };

  const handleImageUpdated = (newUrl: string) => {
    setProduct((prev) => (prev ? { ...prev, imagen: newUrl } : null));
    showToast('Imagen del producto actualizada.');
  };

  const handleCopy = (text: string, type: 'oem' | 'fab') => {
    navigator.clipboard.writeText(text);
    if (type === 'oem') {
      setCopiedOem(true);
      setTimeout(() => setCopiedOem(false), 2000);
    } else {
      setCopiedFab(true);
      setTimeout(() => setCopiedFab(false), 2000);
    }
  };

  const stockTotal = product?.stockTotal ?? 0;
  const stockMinimo = product?.stockMinimo ?? 2;
  const isLow = stockTotal > 0 && stockTotal <= stockMinimo;
  const isOut = stockTotal === 0;

  const almacenes = useMemo(
    () => (product?.stock ?? []).filter((l) => l.tipo === 'almacen'),
    [product?.stock]
  );
  const tiendas = useMemo(
    () => (product?.stock ?? []).filter((l) => l.tipo === 'tienda'),
    [product?.stock]
  );
  const totalAlmacenes = almacenes.reduce((acc, c) => acc + (c.cantidad || 0), 0);
  const totalTiendas = tiendas.reduce((acc, c) => acc + (c.cantidad || 0), 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem', color: 'var(--text-muted)' }}>
        <Loader2 size={36} className="animate-spin" color="#38bdf8" />
        <span>Cargando ficha técnica del repuesto...</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="placeholder-container" style={{ minHeight: '50vh' }}>
        <AlertTriangle size={40} color="#f87171" style={{ marginBottom: '1rem' }} />
        <h2 className="placeholder-title">{error || 'Repuesto no encontrado'}</h2>
        <NavLink to="/inventario" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <ArrowLeft size={16} />
          <span>Volver al Inventario</span>
        </NavLink>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 200,
            background: '#065f46',
            border: '1px solid #10b981',
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
          <CheckCircle2 size={18} color="#34d399" />
          <span>{toast}</span>
        </div>
      )}

      {/* Navegación y Barra Superior */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <NavLink
          to="/inventario"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            color: 'var(--accent)',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} />
          <span>Volver al Inventario</span>
        </NavLink>

        {canEdit && (
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setAddStockModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981' }}
            >
              <PackagePlus size={15} />
              <span>Agregar Stock</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Edit2 size={15} />
              <span>Editar Ficha</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleToggleActive}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: product.activo ? '#f59e0b' : '#10b981' }}
            >
              {product.activo ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
              <span>{product.activo ? 'Desactivar' : 'Activar'}</span>
            </button>

            <button
              type="button"
              className="btn-danger-action"
              onClick={() => setDeleteModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1rem' }}
            >
              <Trash2 size={15} />
              <span>Dar de Baja</span>
            </button>
          </div>
        )}
      </div>

      {/* Cabecera Principal */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
              ID #{product.id}
            </span>
            <span
              className={`stock-badge ${
                isOut ? 'out-of-stock' : isLow ? 'low-stock' : 'in-stock'
              }`}
            >
              {isOut ? 'Sin Stock' : isLow ? `Stock Crítico (${stockTotal} uds.)` : `Disponible (${stockTotal} uds.)`}
            </span>
            <span className="brand-pill">
              <Car size={13} />
              <span>{product.marca} {product.modelo}</span>
            </span>
          </div>
          <h1 className="page-title">{product.producto}</h1>
          <p className="page-subtitle">
            Fabricante: <strong>{product.fabricante}</strong> {product.empresaFabricante ? `(${product.empresaFabricante})` : ''} • Procedencia/Detalle: {product.detalle || 'Estándar'}
          </p>
        </div>
      </div>

      {/* Layout 2 Columnas */}
      <div className="product-detail-layout">
        {/* Columna Izquierda: Foto + Precios */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <ProductImageUploader
            productId={product.id}
            currentImage={product.imagen}
            productName={product.producto}
            onImageUpdated={handleImageUpdated}
          />

          <ProductPricingCard product={product} />
        </div>

        {/* Columna Derecha: Especificaciones Técnicas + Matriz de Stock (7 Ubicaciones) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Tarjeta de Especificaciones Técnicas */}
          <div className="specs-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-strong)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Boxes size={20} color="#38bdf8" />
              <span>Ficha Técnica y Compatibilidad</span>
            </h3>

            <div className="specs-grid">
              <div className="spec-item">
                <span className="spec-title">Código Fábrica / Proveedor</span>
                <div className="spec-code-wrapper">
                  <span className="spec-value" style={{ fontFamily: 'monospace', color: 'var(--accent-strong)' }}>
                    {product.codigoFabrica}
                  </span>
                  <button
                    type="button"
                    className="btn-copy-code"
                    onClick={() => handleCopy(product.codigoFabrica, 'fab')}
                    title="Copiar código de fábrica"
                  >
                    {copiedFab ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="spec-item">
                <span className="spec-title">Código Original OEM</span>
                <div className="spec-code-wrapper">
                  <span className="spec-value" style={{ fontFamily: 'monospace' }}>
                    {product.codigoOem || 'No registrado'}
                  </span>
                  {product.codigoOem && (
                    <button
                      type="button"
                      className="btn-copy-code"
                      onClick={() => handleCopy(product.codigoOem!, 'oem')}
                      title="Copiar código OEM"
                    >
                      {copiedOem ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
              </div>

              <div className="spec-item">
                <span className="spec-title">Marca de Vehículo</span>
                <span className="spec-value">{product.marca}</span>
              </div>

              <div className="spec-item">
                <span className="spec-title">Modelo de Vehículo</span>
                <span className="spec-value">{product.modelo}</span>
              </div>

              <div className="spec-item">
                <span className="spec-title">Año / Aplicación</span>
                <span className="spec-value">{product.anio || 'Universal / Varios'}</span>
              </div>

              <div className="spec-item">
                <span className="spec-title">Stock Mínimo Requerido</span>
                <span className="spec-value">{stockMinimo} unidades</span>
              </div>
            </div>

            {product.detalle && (
              <div style={{ marginTop: '1rem', padding: '0.85rem', background: 'var(--bg-alt)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                  Detalles y Especificaciones de Fabricación
                </span>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-strong)', lineHeight: 1.5 }}>
                  {product.detalle}
                </p>
              </div>
            )}
          </div>

          {/* Matriz de Stock en las 7 Ubicaciones */}
          <div className="stock-matrix-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-strong)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Warehouse size={20} color="#38bdf8" />
                <span>Stock por Ubicación</span>
              </h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Total: <strong style={{ color: 'var(--text-strong)' }}>{stockTotal} unidades</strong>
              </span>
            </div>

            {/* Almacenes */}
            {almacenes.length > 0 && (
              <div className="stock-matrix-section">
                <div className="stock-matrix-section-header stock-matrix-section-header--almacen">
                  <Warehouse size={15} color="#a78bfa" />
                  <span>Almacenes</span>
                  <span className="stock-matrix-section-total">{totalAlmacenes} uds.</span>
                </div>
                <div className="stock-locations-grid">
                  {almacenes.map((loc) => {
                    const percentage = stockTotal > 0 ? (loc.cantidad / stockTotal) * 100 : 0;
                    const isZero = loc.cantidad === 0;

                    return (
                      <div key={loc.locationId} className="stock-location-card">
                        <div className="stock-loc-header">
                          <div className="stock-loc-title">
                            <span>{loc.ubicacion}</span>
                          </div>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '0.95rem',
                              color: isZero ? '#f87171' : 'var(--text-strong)',
                              fontFamily: 'monospace',
                            }}
                          >
                            {loc.cantidad} ud.
                          </span>
                        </div>

                        <div className="stock-bar-container">
                          <div
                            className="stock-bar-fill"
                            style={{
                              width: `${percentage}%`,
                              background: isZero
                                ? '#f87171'
                                : 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
                            }}
                          />
                        </div>

                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {percentage.toFixed(0)}% del total
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tiendas */}
            {tiendas.length > 0 && (
              <div className="stock-matrix-section">
                <div className="stock-matrix-section-header stock-matrix-section-header--tienda">
                  <Store size={15} color="#60a5fa" />
                  <span>Tiendas</span>
                  <span className="stock-matrix-section-total">{totalTiendas} uds.</span>
                </div>
                <div className="stock-locations-grid">
                  {tiendas.map((loc) => {
                    const percentage = stockTotal > 0 ? (loc.cantidad / stockTotal) * 100 : 0;
                    const isZero = loc.cantidad === 0;

                    return (
                      <div key={loc.locationId} className="stock-location-card">
                        <div className="stock-loc-header">
                          <div className="stock-loc-title">
                            <span>{loc.ubicacion}</span>
                          </div>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '0.95rem',
                              color: isZero ? '#f87171' : 'var(--text-strong)',
                              fontFamily: 'monospace',
                            }}
                          >
                            {loc.cantidad} ud.
                          </span>
                        </div>

                        <div className="stock-bar-container">
                          <div
                            className="stock-bar-fill"
                            style={{
                              width: `${percentage}%`,
                              background: isZero
                                ? '#f87171'
                                : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                            }}
                          />
                        </div>

                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {percentage.toFixed(0)}% del total
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modales de Edición y Eliminación */}
      <ProductFormModal
        productToEdit={product}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleUpdate}
      />

      <DeleteConfirmModal
        product={deleteModalOpen ? product : null}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
      />

      <AddStockModal
        product={addStockModalOpen ? product : null}
        onClose={() => setAddStockModalOpen(false)}
        onStockUpdated={handleStockUpdated}
      />
    </div>
  );
}
