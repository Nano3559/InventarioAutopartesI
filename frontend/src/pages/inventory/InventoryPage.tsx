import { useState, useEffect } from 'react';
import {
  Boxes,
  RefreshCw,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Car,
} from 'lucide-react';
import { productsService } from '../../services/products.service';
import { locationsService } from '../../services/locations.service';
import type {
  Product,
  ProductFilters,
  CreateProductDto,
} from '../../types/product.types';
import { ProductFiltersBar } from '../../components/inventory/ProductFiltersBar';
import { ProductTable } from '../../components/inventory/ProductTable';
import { StockBreakdownModal } from '../../components/inventory/StockBreakdownModal';
import { ProductFormModal } from '../../components/inventory/ProductFormModal';
import { DeleteConfirmModal } from '../../components/inventory/DeleteConfirmModal';
import { AddStockModal } from '../../components/inventory/AddStockModal';
import '../../styles/inventory.css';

export function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<ProductFilters>({});
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);
  const [locationCounts, setLocationCounts] = useState({ almacenes: 0, tiendas: 0 });

  // Modales
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null);
  const [addStockModalProduct, setAddStockModalProduct] = useState<Product | null>(null);
  const [formModalOpen, setFormModalOpen] = useState<boolean>(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [deleteModalProduct, setDeleteModalProduct] = useState<Product | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        const data = await productsService.getProducts(filters);
        if (isMounted) {
          setProducts(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error al cargar catálogo de productos:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    async function fetchLocationCounts() {
      try {
        const locations = await locationsService.getLocations();
        if (isMounted) {
          setLocationCounts({
            almacenes: locations.filter((l) => l.tipo === 'almacen').length,
            tiendas: locations.filter((l) => l.tipo === 'tienda').length,
          });
        }
      } catch (err) {
        console.error('Error al cargar ubicaciones:', err);
      }
    }

    fetchData();
    fetchLocationCounts();

    return () => {
      isMounted = false;
    };
  }, [filters, reloadTrigger]);

  const handleRefresh = () => {
    setLoading(true);
    setReloadTrigger((prev) => prev + 1);
  };

  // Handlers CRUD
  const handleCreateOrUpdate = async (dto: CreateProductDto) => {
    if (productToEdit) {
      await productsService.updateProduct(productToEdit.id, dto);
      showToast(`Repuesto "${dto.producto}" actualizado correctamente.`);
    } else {
      await productsService.createProduct(dto);
      showToast(`Nuevo repuesto "${dto.producto}" registrado en el inventario.`);
    }
    handleRefresh();
  };

  const handleDelete = async (id: number) => {
    await productsService.deleteProduct(id);
    showToast('Repuesto dado de baja del catálogo.', 'info');
    handleRefresh();
  };

  const handleToggleActive = async (product: Product) => {
    const result = await productsService.toggleActive(product.id);
    showToast(
      result.activo
        ? `Repuesto "${product.producto}" activado.`
        : `Repuesto "${product.producto}" desactivado.`,
      result.activo ? 'success' : 'info',
    );
    handleRefresh();
  };

  // Métricas rápidas calculadas del catálogo
  const totalStockSum = products.reduce((acc, p) => acc + (p.stockTotal || 0), 0);
  const lowStockCount = products.filter((p) => (p.stockTotal || 0) <= (p.stockMinimo || 2)).length;
  const uniqueBrandsCount = new Set(products.map((p) => p.marca)).size;

  return (
    <div className="inventory-page-container">
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 200,
            background: toast.type === 'success' ? '#065f46' : '#1e3a8a',
            border: `1px solid ${toast.type === 'success' ? '#10b981' : '#3b82f6'}`,
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
          <span>{toast.message}</span>
        </div>
      )}

      {/* Cabecera de Página */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventario Central de Autopartes</h1>
          <p className="page-subtitle">
            Control de stock en {locationCounts.almacenes} {locationCounts.almacenes === 1 ? 'almacén' : 'almacenes'} y {locationCounts.tiendas} {locationCounts.tiendas === 1 ? 'tienda' : 'tiendas'} • Catálogo de repuestos vehiculares
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleRefresh}
            title="Recargar catálogo"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Resumen de Métricas */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <Boxes size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Ítems</span>
            <span className="stat-value">{products.length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <Layers size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Stock Total Consolidado</span>
            <span className="stat-value">{totalStockSum} uds.</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <AlertTriangle size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Stock Crítico / Bajo</span>
            <span className="stat-value" style={{ color: lowStockCount > 0 ? '#fbbf24' : 'var(--text-strong)' }}>
              {lowStockCount} ítems
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            <Car size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Marcas de Vehículos</span>
            <span className="stat-value">{uniqueBrandsCount}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <ProductFiltersBar
        filters={filters}
        onFilterChange={setFilters}
        onOpenNewProductModal={() => {
          setProductToEdit(null);
          setFormModalOpen(true);
        }}
        totalResults={products.length}
      />

      {/* Tabla de Productos */}
      <ProductTable
        products={products}
        loading={loading}
        onOpenStockModal={(product) => setStockModalProduct(product)}
        onOpenAddStockModal={(product) => setAddStockModalProduct(product)}
        onOpenEditModal={(product) => {
          setProductToEdit(product);
          setFormModalOpen(true);
        }}
        onOpenDeleteModal={(product) => setDeleteModalProduct(product)}
        onToggleActive={handleToggleActive}
      />

      {/* Modales */}
      <StockBreakdownModal
        product={stockModalProduct}
        onClose={() => setStockModalProduct(null)}
      />

      <ProductFormModal
        productToEdit={productToEdit}
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setProductToEdit(null);
        }}
        onSave={handleCreateOrUpdate}
      />

      <DeleteConfirmModal
        product={deleteModalProduct}
        onClose={() => setDeleteModalProduct(null)}
        onConfirm={handleDelete}
      />

      <AddStockModal
        product={addStockModalProduct}
        onClose={() => setAddStockModalProduct(null)}
        onStockUpdated={handleRefresh}
      />
    </div>
  );
}
