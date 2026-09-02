import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeftRight,
  Layers,
  History,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { movimientosService } from '../../services/movimientos.service';
import { productsService } from '../../services/products.service';
import { locationsService } from '../../services/locations.service';
import type { MovimientoItem, CreateMovimientoDto, MovimientoFilters } from '../../types/movimiento.types';
import type { Product, LocationItem } from '../../types/product.types';
import { TransferFormCard } from '../../components/movimientos/TransferFormCard';
import { MovimientosHistoryTable } from '../../components/movimientos/MovimientosHistoryTable';
import { TransferReceiptModal } from '../../components/movimientos/TransferReceiptModal';
import '../../styles/movimientos.css';

export function MovimientosPage() {
  const [movimientos, setMovimientos] = useState<MovimientoItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<MovimientoFilters>({});
  const [selectedMovReceipt, setSelectedMovReceipt] = useState<MovimientoItem | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [movData, prodData, locData] = await Promise.all([
        movimientosService.getMovimientos(filters),
        productsService.getProducts({}),
        locationsService.getLocations(),
      ]);
      setMovimientos(movData);
      setProducts(prodData);
      setLocations(locData);
    } catch (err) {
      console.error('Error al cargar datos de movimientos:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    let isMounted = true;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [movData, prodData, locData] = await Promise.all([
          movimientosService.getMovimientos(filters),
          productsService.getProducts({}),
          locationsService.getLocations(),
        ]);
        if (isMounted) {
          setMovimientos(movData);
          setProducts(prodData);
          setLocations(locData);
        }
      } catch (err) {
        console.error('Error al cargar datos de movimientos:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchAll();
    return () => {
      isMounted = false;
    };
  }, [filters]);

  const handleTransferSubmit = async (dto: CreateMovimientoDto) => {
    try {
      const created = await movimientosService.createMovimiento(dto);
      showToast(`Traslado registrado con éxito: ${dto.cantidad} unidad(es) transferida(s).`);
      setSelectedMovReceipt(created);
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al registrar el traslado';
      showToast(`Error: ${msg}`);
      console.error('Error al crear movimiento:', err);
    }
  };

  // Métricas
  const totalUnitsMoved = movimientos.reduce((acc, curr) => acc + (curr.cantidad || 0), 0);

  return (
    <div className="movimientos-page-container">
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

      {/* Cabecera de Página */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Movimientos y Traslados entre Ubicaciones</h1>
          <p className="page-subtitle">
            Control de transferencias de mercadería entre 4 almacenes y 3 tiendas (7 importadoras)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
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
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="stats-grid" style={{ marginBottom: '1.75rem' }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <History size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Traslados Registrados</span>
            <span className="stat-value">{movimientos.length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <Layers size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Unidades Movilizadas</span>
            <span className="stat-value">{totalUnitsMoved} uds.</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            <ArrowLeftRight size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Ubicaciones Conectadas</span>
            <span className="stat-value">7 Importadoras</span>
          </div>
        </div>
      </div>

      {/* Grid Principal: Formulario + Historial */}
      <div className="movimientos-page-grid">
        {/* Formulario de Nuevo Traslado */}
        {products.length > 0 && locations.length > 0 && (
          <TransferFormCard
            products={products}
            locations={locations}
            onTransferCompleted={handleTransferSubmit}
          />
        )}

        {/* Historial de Auditoría */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <History size={20} color="#38bdf8" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-strong)' }}>
              Historial de Movimientos y Traslados
            </h3>
          </div>

          <MovimientosHistoryTable
            movimientos={movimientos}
            locations={locations}
            loading={loading}
            filters={filters}
            onFilterChange={setFilters}
            onViewReceipt={(mov) => setSelectedMovReceipt(mov)}
          />
        </div>
      </div>

      {/* Modal de Constancia de Traslado */}
      <TransferReceiptModal
        movimiento={selectedMovReceipt}
        onClose={() => setSelectedMovReceipt(null)}
      />
    </div>
  );
}
