import { useState } from 'react';
import {
  X,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BarChart3,
} from 'lucide-react';
import { demandService } from '../../services/demand.service';
import type { PredictSuccessDto, PredictionSuccessResponse } from '../../types/demand.types';
import type { Product } from '../../types/product.types';
import '../../styles/demand-prediction.css';

interface PredictSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogProducts?: Product[];
}

export function PredictSuccessModal({
  isOpen,
  onClose,
  catalogProducts = [],
}: PredictSuccessModalProps) {
  const [formData, setFormData] = useState<PredictSuccessDto>({
    producto: '',
    marca: '',
    modelo: '',
    costo: 100,
    precio1: 145,
    precioMayor: 125,
    categoriaRepuesto: 'Carrocería',
    tipoDesgaste: 'colision',
    segmentoParque: 'Alto',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionSuccessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectProductPreset = (prodIdStr: string) => {
    if (!prodIdStr) return;
    const prod = catalogProducts.find((p) => p.id === Number(prodIdStr));
    if (!prod) return;

    const baseCosto = prod.costo || 50;
    setFormData({
      producto: prod.producto,
      marca: prod.marca,
      modelo: prod.modelo,
      costo: baseCosto,
      precio1: prod.precio1 || Math.round(baseCosto * 1.35),
      precioMayor: prod.precioMayor || Math.round(baseCosto * 1.2),
      categoriaRepuesto: prod.categoriaRepuesto || 'Carrocería',
      tipoDesgaste: prod.tipoDesgaste || 'colision',
      segmentoParque: prod.segmentoParque || 'Medio',
    });
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.producto || !formData.marca || !formData.modelo) {
      setError('Por favor completa nombre del repuesto, marca y modelo.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await demandService.predictSuccess(formData);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Error al ejecutar la predicción con el modelo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="predict-modal-overlay" onClick={onClose}>
      <div className="predict-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div className="predict-modal-header">
          <h2 className="predict-modal-title">
            <Sparkles size={22} />
            Análisis Predictivo de Viabilidad de Repuesto (IA)
          </h2>
          <button className="predict-modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="predict-modal-body">
          {/* Selector opcional de catálogo */}
          {catalogProducts.length > 0 && (
            <div className="predict-preset-row">
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-strong)' }}>
                Rellenar desde catálogo:
              </span>
              <select
                className="predict-preset-select"
                onChange={(e) => handleSelectProductPreset(e.target.value)}
                defaultValue=""
              >
                <option value="">-- Seleccionar repuesto existente para simular --</option>
                {catalogProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.producto} - {p.marca} {p.modelo} (Bs. {p.precio1})
                  </option>
                ))}
              </select>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="predict-form-grid">
              <div className="predict-field">
                <label className="predict-label">Repuesto *</label>
                <input
                  type="text"
                  className="predict-input"
                  placeholder="Ej: Farol Delantero LED"
                  value={formData.producto}
                  onChange={(e) => setFormData({ ...formData, producto: e.target.value })}
                  required
                />
              </div>

              <div className="predict-field">
                <label className="predict-label">Marca Vehículo *</label>
                <input
                  type="text"
                  className="predict-input"
                  placeholder="Ej: Toyota"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  required
                />
              </div>

              <div className="predict-field">
                <label className="predict-label">Modelo Vehículo *</label>
                <input
                  type="text"
                  className="predict-input"
                  placeholder="Ej: Hilux"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  required
                />
              </div>

              <div className="predict-field">
                <label className="predict-label">Costo Unitario (Bs.) *</label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  className="predict-input"
                  value={formData.costo}
                  onChange={(e) => setFormData({ ...formData, costo: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="predict-field">
                <label className="predict-label">Precio Mostrador (Bs.) *</label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  className="predict-input"
                  value={formData.precio1}
                  onChange={(e) => setFormData({ ...formData, precio1: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="predict-field">
                <label className="predict-label">Precio Mayorista (Bs.)</label>
                <input
                  type="number"
                  step="any"
                  className="predict-input"
                  value={formData.precioMayor || ''}
                  onChange={(e) => setFormData({ ...formData, precioMayor: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="predict-field">
                <label className="predict-label">Categoría Técnica</label>
                <select
                  className="predict-select"
                  value={formData.categoriaRepuesto}
                  onChange={(e) => setFormData({ ...formData, categoriaRepuesto: e.target.value })}
                >
                  <option value="Carrocería">Carrocería</option>
                  <option value="Iluminación">Iluminación</option>
                  <option value="Refrigeración">Refrigeración</option>
                  <option value="Cerrajería">Cerrajería</option>
                </select>
              </div>

              <div className="predict-field">
                <label className="predict-label">Tipo de Desgaste</label>
                <select
                  className="predict-select"
                  value={formData.tipoDesgaste}
                  onChange={(e) => setFormData({ ...formData, tipoDesgaste: e.target.value })}
                >
                  <option value="colision">Colisión / Accidente</option>
                  <option value="desgaste_medio">Desgaste Medio</option>
                  <option value="desgaste_frecuente">Desgaste Frecuente</option>
                  <option value="correctivo">Falla Correctiva</option>
                </select>
              </div>

              <div className="predict-field">
                <label className="predict-label">Parque Vehicular en Bolivia</label>
                <select
                  className="predict-select"
                  value={formData.segmentoParque}
                  onChange={(e) => setFormData({ ...formData, segmentoParque: e.target.value })}
                >
                  <option value="Alto">Alto (Hilux, Corolla, etc.)</option>
                  <option value="Medio">Medio (Tucson, Sentra, etc.)</option>
                  <option value="Nicho">Nicho (Duster, Ram, etc.)</option>
                </select>
              </div>
            </div>

            {error && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="predict-actions">
              <button type="submit" className="predict-btn-primary" disabled={loading}>
                {loading ? <Loader2 size={18} className="spin-animation" /> : <TrendingUp size={18} />}
                {loading ? 'Calculando Inferencia ONNX...' : 'Analizar Viabilidad con IA'}
              </button>
            </div>
          </form>

          {/* Resultados de la Predicción */}
          {result && (
            <div className="predict-results-container">
              {/* Banner de Score */}
              <div
                className={`predict-score-banner ${
                  result.probabilidadExito >= 0.8
                    ? 'alta'
                    : result.probabilidadExito >= 0.5
                    ? 'media'
                    : 'baja'
                }`}
              >
                <div>
                  <div className="predict-score-badge">
                    {result.probabilidadExito >= 0.8 ? (
                      <CheckCircle2 size={24} />
                    ) : result.probabilidadExito >= 0.5 ? (
                      <AlertTriangle size={24} />
                    ) : (
                      <AlertCircle size={24} />
                    )}
                    {result.categoria}
                  </div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-strong)', marginTop: '0.25rem' }}>
                    {result.alertas.mensaje}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="predict-score-num">{result.scoreExito}%</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Probabilidad de Éxito
                  </div>
                </div>
              </div>

              {/* KPIs de Rotación */}
              <div className="predict-kpis-grid">
                <div className="predict-kpi-card">
                  <span className="predict-kpi-label">Lote Sugerido</span>
                  <span className="predict-kpi-value">{result.loteSugeridoCompra} uds.</span>
                </div>
                <div className="predict-kpi-card">
                  <span className="predict-kpi-label">Días de Rotación</span>
                  <span className="predict-kpi-value">~{result.diasRotacionEstimados} días</span>
                </div>
                <div className="predict-kpi-card">
                  <span className="predict-kpi-label">Demanda Estimada</span>
                  <span className="predict-kpi-value">{result.metricasProyectadas.demandaMensualEstimada} / mes</span>
                </div>
                <div className="predict-kpi-card">
                  <span className="predict-kpi-label">Margen Proyectado</span>
                  <span className="predict-kpi-value">{(result.metricasProyectadas.margenRelativo * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Explicabilidad con 3 productos similares */}
              {result.productosSimilares?.length > 0 && (
                <div className="predict-similares-section">
                  <div className="predict-similares-title">
                    <BarChart3 size={18} color="#3b82f6" />
                    Productos Históricos Más Similares (Explicabilidad k-NN)
                  </div>
                  <div className="predict-similares-grid">
                    {result.productosSimilares.map((sim) => (
                      <div key={sim.id} className="predict-similar-card">
                        <div className="predict-similar-head">
                          <span className="predict-similar-name">{sim.producto}</span>
                          <span className="predict-similarity-pill">
                            {(sim.similitud * 100).toFixed(0)}% match
                          </span>
                        </div>
                        <div className="predict-similar-details">
                          {sim.marca} {sim.modelo} • {sim.fabricante}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontWeight: 600 }}>
                          <span>Ventas: ~{sim.ventasMensualesNetas}/mes</span>
                          <span style={{ color: '#059669' }}>GMROI: {sim.gmroiReal}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
