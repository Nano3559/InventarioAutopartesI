import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Plus,
  Building2,
  FileText,
  Boxes,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { costosService } from '../../services/costos.service';
import { productsService } from '../../services/products.service';
import { locationsService } from '../../services/locations.service';
import type { Factura, Proveedor, CreateFacturaDto, CreateProveedorDto } from '../../types/costo.types';
import type { Product, LocationItem } from '../../types/product.types';
import { FacturasTable } from '../../components/costos/FacturasTable';
import { FacturaFormModal } from '../../components/costos/FacturaFormModal';
import { ProveedorModal } from '../../components/costos/ProveedorModal';
import { FacturaDetailModal } from '../../components/costos/FacturaDetailModal';
import '../../styles/costos.css';

export function CostosPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modales
  const [facturaModalOpen, setFacturaModalOpen] = useState(false);
  const [proveedorModalOpen, setProveedorModalOpen] = useState(false);
  const [selectedFacturaDetail, setSelectedFacturaDetail] = useState<Factura | null>(null);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [factData, provData, prodData, locData] = await Promise.all([
        costosService.getFacturas(),
        costosService.getProveedores(),
        productsService.getProducts({}),
        locationsService.getLocations(),
      ]);
      setFacturas(factData);
      setProveedores(provData);
      setProducts(prodData);
      setLocations(locData);
    } catch (err) {
      console.error('Error al cargar datos de costos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [factData, provData, prodData, locData] = await Promise.all([
          costosService.getFacturas(),
          costosService.getProveedores(),
          productsService.getProducts({}),
          locationsService.getLocations(),
        ]);
        if (isMounted) {
          setFacturas(factData);
          setProveedores(provData);
          setProducts(prodData);
          setLocations(locData);
        }
      } catch (err) {
        console.error('Error al cargar datos de costos:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchAll();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateProveedor = async (dto: CreateProveedorDto) => {
    const created = await costosService.createProveedor(dto);
    setProveedores((prev) => [created, ...prev]);
    showToast(`Proveedor "${created.nombre}" registrado exitosamente.`);
  };

  const handleCreateFactura = async (dto: CreateFacturaDto, file?: File) => {
    const created = await costosService.createFactura(dto, file);
    setFacturas((prev) => [created, ...prev]);
    showToast(`Factura #${dto.numero} registrada y stock actualizado.`);
    loadData(); // Refrescar productos y facturas
  };

  const handleDeleteFactura = async (id: number) => {
    if (!window.confirm('¿Seguro que deseas anular esta factura de compra?')) return;
    await costosService.deleteFactura(id);
    setFacturas((prev) => prev.filter((f) => f.id !== id));
    showToast('Factura de compra eliminada.');
  };

  // Métricas
  const totalInvertido = facturas.reduce((acc, f) => acc + (f.monto || 0), 0);
  const totalUnitsPurchased = facturas.reduce((acc, f) => {
    const itemsTotal = f.items ? f.items.reduce((sum, it) => sum + it.cantidad, 0) : 0;
    return acc + itemsTotal;
  }, 0);

  return (
    <div className="costos-page-container">
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

      {/* Cabecera Principal */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Costos, Facturas de Compra y Proveedores</h1>
          <p className="page-subtitle">
            Registro de adquisiciones, actualización automática de costos base e ingreso de stock a almacenes
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={loadData}
            title="Recargar datos"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setProveedorModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Building2 size={16} />
            <span>Nuevo Proveedor</span>
          </button>

          <button
            type="button"
            className="btn-primary-action"
            onClick={() => setFacturaModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} />
            <span>Registrar Factura</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <DollarSign size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Invertido en Compras</span>
            <span className="stat-value">Bs. {totalInvertido.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <FileText size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Facturas Registradas</span>
            <span className="stat-value">{facturas.length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            <Building2 size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Proveedores Activos</span>
            <span className="stat-value">{proveedores.length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Boxes size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Unidades Abastecidas</span>
            <span className="stat-value">{totalUnitsPurchased} uds.</span>
          </div>
        </div>
      </div>

      {/* Tabla de Facturas */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <FileText size={20} color="#38bdf8" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-strong)' }}>
            Historial de Facturas de Compra
          </h3>
        </div>

        <FacturasTable
          facturas={facturas}
          proveedores={proveedores}
          loading={loading}
          onViewDetail={(f) => setSelectedFacturaDetail(f)}
          onDeleteFactura={handleDeleteFactura}
        />
      </div>

      {/* Modales */}
      <FacturaFormModal
        isOpen={facturaModalOpen}
        onClose={() => setFacturaModalOpen(false)}
        proveedores={proveedores}
        products={products}
        locations={locations}
        onOpenNewProveedor={() => {
          setFacturaModalOpen(false);
          setProveedorModalOpen(true);
        }}
        onSave={handleCreateFactura}
      />

      <ProveedorModal
        isOpen={proveedorModalOpen}
        onClose={() => setProveedorModalOpen(false)}
        onSave={handleCreateProveedor}
      />

      <FacturaDetailModal
        factura={selectedFacturaDetail}
        onClose={() => setSelectedFacturaDetail(null)}
      />
    </div>
  );
}
