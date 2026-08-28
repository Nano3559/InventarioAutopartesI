import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Download,
  Percent,
  Sparkles,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  Boxes,
} from 'lucide-react';
import { preciosService } from '../../services/precios.service';
import type { FilaPrecio, UpdatePreciosDto, PrecioFilters, BulkMarginConfig } from '../../types/precio.types';
import { PreciosTable } from '../../components/precios/PreciosTable';
import { PreciosFiltersBar } from '../../components/precios/PreciosFiltersBar';
import { BulkMarginModal } from '../../components/precios/BulkMarginModal';
import '../../styles/precios.css';

export function PreciosPage() {
  const [precios, setPrecios] = useState<FilaPrecio[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [filters, setFilters] = useState<PrecioFilters>({});
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await preciosService.getPrecios(filters);
      setPrecios(data);
    } catch (err) {
      console.error('Error al cargar precios:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    let isMounted = true;
    const fetchPrecios = async () => {
      setLoading(true);
      try {
        const data = await preciosService.getPrecios(filters);
        if (isMounted) setPrecios(data);
      } catch (err) {
        console.error('Error al cargar precios:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchPrecios();
    return () => {
      isMounted = false;
    };
  }, [filters]);

  const handleUpdatePrecio = async (id: number, dto: UpdatePreciosDto) => {
    const updated = await preciosService.updatePrecios(id, dto);
    setPrecios((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
    showToast(`Precios actualizados para el repuesto #${id}.`);
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      await preciosService.exportExcel(filters);
      showToast('Archivo Excel descargado con éxito.');
    } catch (err) {
      console.error('Error exportando Excel:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleApplyBulkMargin = async (config: BulkMarginConfig) => {
    const targets = config.marca
      ? precios.filter((p) => p.marca.toLowerCase() === config.marca?.toLowerCase())
      : precios;

    for (const item of targets) {
      if (item.costo > 0) {
        const newP1 = parseFloat((item.costo * (1 + config.margenP1 / 100)).toFixed(2));
        const newP2 = parseFloat((item.costo * (1 + config.margenP2 / 100)).toFixed(2));
        const newMayor = parseFloat((item.costo * (1 + config.margenMayor / 100)).toFixed(2));

        await preciosService.updatePrecios(item.id, {
          precio1: newP1,
          precio2: newP2,
          precioMayor: newMayor,
        });
      }
    }

    showToast(`Márgenes aplicados a ${targets.length} repuesto(s).`);
    loadData();
  };

  // Extracción de marcas y fabricantes únicos
  const marcas = useMemo(() => Array.from(new Set(precios.map((p) => p.marca).filter(Boolean))), [precios]);
  const fabricantes = useMemo(() => Array.from(new Set(precios.map((p) => p.fabricante).filter(Boolean))), [precios]);

  // Cálculos de métricas
  const totalItems = precios.length;
  const itemsWithP1 = precios.filter((p) => p.costo > 0 && p.precio1);
  const avgMarginP1 = itemsWithP1.length > 0
    ? (itemsWithP1.reduce((acc, p) => acc + (((p.precio1! - p.costo) / p.costo) * 100), 0) / itemsWithP1.length).toFixed(1)
    : '0.0';

  const itemsWithP2 = precios.filter((p) => p.costo > 0 && p.precio2);
  const avgMarginP2 = itemsWithP2.length > 0
    ? (itemsWithP2.reduce((acc, p) => acc + (((p.precio2! - p.costo) / p.costo) * 100), 0) / itemsWithP2.length).toFixed(1)
    : '0.0';

  const valorInventarioPVP = precios.reduce((acc, p) => acc + ((p.precio1 || p.costo || 0) * (p.stockTotal || 0)), 0);

  return (
    <div className="precios-page-container">
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
          <h1 className="page-title">Gestión de Precios, Márgenes y Exportación</h1>
          <p className="page-subtitle">
            Políticas de precios para mostrador, talleres y venta mayorista con cálculo automático de rentabilidad
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
            onClick={() => setBulkModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Sparkles size={16} color="#38bdf8" />
            <span>Ajuste Masivo</span>
          </button>

          <button
            type="button"
            className="btn-excel-export"
            onClick={handleExportExcel}
            disabled={exporting}
          >
            <Download size={16} />
            <span>{exporting ? 'Generando Excel...' : 'Exportar a Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <Percent size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Margen Promedio Precio 1 (Mostrador)</span>
            <span className="stat-value">+{avgMarginP1}%</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <Percent size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Margen Promedio Precio 2 (Taller)</span>
            <span className="stat-value">+{avgMarginP2}%</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            <Boxes size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Repuestos en Lista</span>
            <span className="stat-value">{totalItems} piezas</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <TrendingUp size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Valor del Inventario en Venta (P1)</span>
            <span className="stat-value">Bs. {valorInventarioPVP.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Filtros de Precios */}
      <PreciosFiltersBar
        filters={filters}
        marcas={marcas}
        fabricantes={fabricantes}
        onFilterChange={setFilters}
      />

      {/* Tabla de Precios */}
      <PreciosTable
        precios={precios}
        loading={loading}
        onUpdatePrecio={handleUpdatePrecio}
      />

      {/* Modal Ajuste Masivo */}
      <BulkMarginModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        marcas={marcas}
        onApply={handleApplyBulkMargin}
      />
    </div>
  );
}
