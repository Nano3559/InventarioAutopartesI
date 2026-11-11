import { useEffect, useMemo, useRef, useState } from 'react';
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
import { productsService } from '../../services/products.service';
import { ApiError } from '../../api/client';
import type {
  PredictSuccessDto,
  PredictionSuccessResponse,
} from '../../types/demand.types';
import type { Product } from '../../types/product.types';
import {
  CATEGORIAS_REPUESTO,
  SEGMENTOS_PARQUE,
  TIPOS_DESGASTE_OPCIONES,
  analizarBorrador,
  inferirCategoria,
  inferirSegmentoParque,
  inferirTipoDesgaste,
} from '../../utils/product-guardrails';
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
    costo: Number.NaN,
    precio1: Number.NaN,
    precioMayor: undefined,
    categoriaRepuesto: '',
    tipoDesgaste: '',
    segmentoParque: '',
  });

  const [categoriaManual, setCategoriaManual] = useState(false);
  const [tipoDesgasteManual, setTipoDesgasteManual] = useState(false);
  const [segmentoManual, setSegmentoManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionSuccessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tipoError, setTipoError] = useState<'validacion' | 'servicio' | null>(null);
  const [editado, setEditado] = useState(false);
  const [cargandoProducto, setCargandoProducto] = useState(false);
  const [notaCatalogo, setNotaCatalogo] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<PredictSuccessDto | null>(null);
  const revision = useRef(0);
  const mensajeDatosIncorrectos =
    'Los datos ingresados presentan inconsistencias. Revise la información del repuesto y vuelva a introducir los datos para realizar el análisis.';

  useEffect(() => {
    revision.current += 1;
    return () => { revision.current += 1; };
  }, [isOpen]);

  const invalidarAnalisis = () => {
    revision.current += 1;
    setResult(null);
    setError(null);
    setTipoError(null);
    setLoading(false);
    setCargandoProducto(false);
  };

  const analisis = useMemo(
    () =>
      analizarBorrador({
        producto: formData.producto,
        modelo: formData.modelo,
        categoriaRepuesto: formData.categoriaRepuesto,
        tipoDesgaste: formData.tipoDesgaste,
        costo: formData.costo,
        precio1: formData.precio1,
        precioMayor: formData.precioMayor,
      }),
    [formData],
  );

  if (!isOpen) return null;

  const semanticaOriginal = baseline !== null &&
    baseline.productId === formData.productId &&
    (['producto', 'marca', 'modelo', 'anio', 'fabricante', 'categoriaRepuesto',
      'tipoDesgaste', 'segmentoParque'] as const).every((campo) => baseline[campo] === formData[campo]);
  const finanzasOriginales = semanticaOriginal && baseline !== null &&
    baseline.productId === formData.productId &&
    Object.is(baseline.costo, formData.costo) &&
    Object.is(baseline.precio1, formData.precio1) &&
    Object.is(baseline.precioMayor, formData.precioMayor);
  const erroresActuales = [...analisis.erroresSemanticos,
    ...(finanzasOriginales ? [] : analisis.erroresFinancieros)];
  const datosIncorrectos = editado && erroresActuales.length > 0;
  const errorValidacion = tipoError === 'validacion';
  const sinCalculos = datosIncorrectos || errorValidacion;
  const alertasVivas = !editado ? [] : sinCalculos
    ? erroresActuales
    : [...erroresActuales, ...analisis.advertencias];
  const estadoVisual =
    sinCalculos || (editado && analisis.categoriaIncoherente)
      ? 'peligro'
      : editado && (analisis.margenEstado === 'critico' || analisis.tipoDesgasteIncoherente)
        ? 'aviso'
        : editado && analisis.margenEstado === 'saludable'
          ? 'ok'
          : 'neutral';

  const tituloGuardrail =
    estadoVisual === 'peligro'
      ? 'Revise los datos ingresados'
      : estadoVisual === 'aviso'
        ? 'Advertencia de coherencia comercial'
        : estadoVisual === 'ok'
          ? 'Datos coherentes para el análisis'
          : baseline ? 'Datos del cat\u00e1logo listos para analizar' : 'Completa los datos para validar';

  const cerrarModal = () => {
    invalidarAnalisis();
    onClose();
  };

  const handleChange = (patch: Partial<PredictSuccessDto>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
    invalidarAnalisis();
    setEditado(true);
  };

  const handleSelectProductPreset = async (prodIdStr: string) => {
    invalidarAnalisis();
    setEditado(false);
    setBaseline(null);
    setNotaCatalogo(null);
    if (!prodIdStr) return;
    const solicitud = revision.current;
    setCargandoProducto(true);
    try {
      const prod = await productsService.getProductById(Number(prodIdStr));
      if (solicitud !== revision.current) return;
      const legacy = prod.categoriaRepuesto === 'General' &&
        prod.tipoDesgaste === 'preventivo' && prod.segmentoParque === 'Medio';
      const categoria = (!legacy && prod.categoriaRepuesto?.trim()) || inferirCategoria(prod.producto) || 'General';
      const desgaste = (!legacy && prod.tipoDesgaste?.trim()) || inferirTipoDesgaste(categoria) || 'preventivo';
      const segmento = (!legacy && prod.segmentoParque?.trim()) || inferirSegmentoParque(prod.modelo) || 'Nicho';
      const numeroReal = (valor: number | null | undefined) =>
        valor === null || valor === undefined ? Number.NaN : Number(valor);
      const datosCatalogo: PredictSuccessDto = {
        productId: prod.id,
        producto: prod.producto,
        marca: prod.marca,
        modelo: prod.modelo,
        anio: prod.anio ?? undefined,
        fabricante: prod.fabricante,
        costo: numeroReal(prod.costo),
        precio1: numeroReal(prod.precio1),
        precioMayor: prod.precioMayor == null ? undefined : Number(prod.precioMayor),
        categoriaRepuesto: categoria,
        tipoDesgaste: desgaste,
        segmentoParque: segmento,
      };
      setBaseline(datosCatalogo);
      setFormData(datosCatalogo);
      const inferidos = [
        (legacy || !prod.categoriaRepuesto) && categoria ? 'categor\u00eda' : null,
        (legacy || !prod.tipoDesgaste) && desgaste ? 'tipo de desgaste' : null,
        (legacy || !prod.segmentoParque) && segmento ? 'parque vehicular' : null,
      ].filter(Boolean);
      setNotaCatalogo('Datos actuales del cat\u00e1logo. Los precios se conservan tal como est\u00e1n registrados.' +
        (inferidos.length ? ` Se sugiri\u00f3 ${inferidos.join(', ')} a partir del repuesto y modelo; revise la selecci\u00f3n.` : '') +
        (!categoria || !desgaste || !segmento ? ' Complete las opciones pendientes antes de analizar.' : ''));
      setCategoriaManual(Boolean(!legacy && prod.categoriaRepuesto));
      setTipoDesgasteManual(Boolean(!legacy && prod.tipoDesgaste));
      setSegmentoManual(Boolean(!legacy && prod.segmentoParque));
    } catch (err: unknown) {
      if (solicitud === revision.current) {
        setTipoError('servicio');
        setError(err instanceof Error ? err.message : 'No se pudo cargar el producto del cat\u00e1logo.');
      }
    } finally {
      if (solicitud === revision.current) setCargandoProducto(false);
    }
  };

  const handleProductoChange = (value: string) => {
    setFormData((prev) => {
      const next = { ...prev, producto: value };
      const sugerida = inferirCategoria(value);
      if (!categoriaManual && sugerida) {
        next.categoriaRepuesto = sugerida;
        if (!tipoDesgasteManual) {
          const tipo = inferirTipoDesgaste(sugerida);
          if (tipo) next.tipoDesgaste = tipo;
        }
      }
      return next;
    });
    invalidarAnalisis();
    setEditado(true);
  };

  const handleModeloChange = (value: string) => {
    setFormData((prev) => {
      const next = { ...prev, modelo: value };
      if (!segmentoManual) {
        const sugerido = inferirSegmentoParque(value);
        if (sugerido) next.segmentoParque = sugerido;
      }
      return next;
    });
    invalidarAnalisis();
    setEditado(true);
  };

  const handleCategoriaChange = (value: string) => {
    setCategoriaManual(true);
    setFormData((prev) => {
      const next = { ...prev, categoriaRepuesto: value };
      if (!tipoDesgasteManual) {
        const tipo = inferirTipoDesgaste(value);
        if (tipo) next.tipoDesgaste = tipo;
      }
      return next;
    });
    invalidarAnalisis();
    setEditado(true);
  };

  const aplicarSugerenciaSemantica = () => {
    setFormData((prev) => ({
      ...prev,
      categoriaRepuesto:
        analisis.categoriaSugerida ?? prev.categoriaRepuesto,
      tipoDesgaste: analisis.tipoDesgasteSugerido ?? prev.tipoDesgaste,
      segmentoParque: analisis.segmentoSugerido ?? prev.segmentoParque,
    }));
    setCategoriaManual(false);
    setTipoDesgasteManual(false);
    setSegmentoManual(false);
    invalidarAnalisis();
    setEditado(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    if (
      !formData.producto.trim() || !formData.marca.trim() ||
      !formData.modelo.trim() || erroresActuales.length > 0 ||
      !formData.categoriaRepuesto || !formData.tipoDesgaste || !formData.segmentoParque
    ) {
      setTipoError('validacion');
      setError(mensajeDatosIncorrectos);
      return;
    }

    const solicitud = ++revision.current;
    setLoading(true);
    setError(null);
    setTipoError(null);
    try {
      const payload: PredictSuccessDto = {
        ...formData,
        precioMayor:
          formData.precioMayor !== undefined
            ? formData.precioMayor
            : undefined,
      };
      const res = await demandService.predictSuccess(payload);
      if (solicitud !== revision.current) return;
      if ((res.bloqueado && !finanzasOriginales) ||
        (res.guardrails?.coherenciaSemantica.coherente === false && !semanticaOriginal)) {
        setTipoError('validacion');
        setError(mensajeDatosIncorrectos);
        return;
      }
      setResult(res);
    } catch (err: unknown) {
      if (solicitud !== revision.current) return;
      setResult(null);
      setTipoError(err instanceof ApiError && (err.status === 400 || err.status === 422) ? 'validacion' : 'servicio');
      setError(err instanceof Error ? err.message : 'No se pudo realizar el análisis. Intente nuevamente.');
    } finally {
      if (solicitud === revision.current) setLoading(false);
    }
  };

  const viabilidad =
    result?.viabilidad ??
    (result?.bloqueado
      ? 'inviable'
      : result && result.probabilidadExito >= 0.8
        ? 'viable'
        : result && result.probabilidadExito >= 0.5
          ? 'riesgo'
          : 'inviable');

  const bannerClass =
    viabilidad === 'viable' ? 'alta' : viabilidad === 'riesgo' ? 'media' : 'baja';
  const IconoBanner =
    viabilidad === 'viable'
      ? CheckCircle2
      : viabilidad === 'riesgo'
        ? AlertTriangle
        : AlertCircle;

  return (
    <div className="predict-modal-overlay" onClick={cerrarModal}>
      <div className="predict-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="predict-modal-header">
          <h2 className="predict-modal-title">
            <Sparkles size={22} />
            Análisis Predictivo de Viabilidad de Repuesto (IA)
          </h2>
          <button className="predict-modal-close-btn" onClick={cerrarModal} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="predict-modal-body">
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

          {cargandoProducto && <p role="status">Cargando datos actuales del producto...</p>}
          {notaCatalogo && <p className="predict-live-hint">{notaCatalogo}</p>}
          <form onSubmit={handleSubmit}>
            <div className="predict-form-grid">
              <div className="predict-field">
                <label className="predict-label">Repuesto *</label>
                <input
                  type="text"
                  className="predict-input"
                  placeholder="Ej: Farol Delantero LED"
                  value={formData.producto}
                  onChange={(e) => handleProductoChange(e.target.value)}
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
                  onChange={(e) => handleChange({ marca: e.target.value })}
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
                  onChange={(e) => handleModeloChange(e.target.value)}
                  required
                />
              </div>

              <div className="predict-field">
                <label className="predict-label">Costo Unitario (Bs.) *</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  className="predict-input"
                  value={Number.isFinite(formData.costo) ? formData.costo : ''}
                  onChange={(e) =>
                    handleChange({ costo: parseFloat(e.target.value) })
                  }
                  required
                />
              </div>

              <div className="predict-field">
                <label className="predict-label">Precio Mostrador (Bs.) *</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  className="predict-input"
                  value={Number.isFinite(formData.precio1) ? formData.precio1 : ''}
                  onChange={(e) =>
                    handleChange({ precio1: parseFloat(e.target.value) })
                  }
                  required
                />
              </div>

              <div className="predict-field">
                <label className="predict-label">Precio Mayorista (Bs.)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="predict-input"
                  value={formData.precioMayor || ''}
                  onChange={(e) =>
                    handleChange({
                      precioMayor: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="predict-field">
                <label className="predict-label">Categoría Técnica</label>
                <select
                  className="predict-select"
                  value={formData.categoriaRepuesto}
                  onChange={(e) => handleCategoriaChange(e.target.value)}
                >
                  <option value="">Seleccione la categoría</option>
                  {CATEGORIAS_REPUESTO.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </select>
                {analisis.categoriaIncoherente && analisis.categoriaSugerida && (
                  <button
                    type="button"
                    className="predict-suggestion-btn"
                    onClick={aplicarSugerenciaSemantica}
                  >
                    Usar «{analisis.categoriaSugerida}» y desgaste sugerido
                  </button>
                )}
              </div>

              <div className="predict-field">
                <label className="predict-label">Tipo de Desgaste</label>
                <select
                  className="predict-select"
                  value={formData.tipoDesgaste}
                  onChange={(e) => {
                    setTipoDesgasteManual(true);
                    handleChange({ tipoDesgaste: e.target.value });
                  }}
                >
                  <option value="">Seleccione el tipo de desgaste</option>
                  {TIPOS_DESGASTE_OPCIONES.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="predict-field">
                <label className="predict-label">Parque Vehicular en Bolivia</label>
                <select
                  className="predict-select"
                  value={formData.segmentoParque}
                  onChange={(e) => {
                    setSegmentoManual(true);
                    handleChange({ segmentoParque: e.target.value });
                  }}
                >
                  <option value="">Seleccione el parque vehicular</option>
                  {SEGMENTOS_PARQUE.map((segmento) => (
                    <option key={segmento} value={segmento}>
                      {segmento === 'Alto'
                        ? 'Alto (Hilux, Corolla, etc.)'
                        : segmento === 'Medio'
                          ? 'Medio (Tucson, Sentra, etc.)'
                          : 'Nicho (Duster, Ram, etc.)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={`predict-live-guardrail ${estadoVisual}`}>
              <div className="predict-live-head">
                {estadoVisual === 'ok' ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <AlertTriangle size={16} />
                )}
                <strong>{tituloGuardrail}</strong>
                {editado && !sinCalculos && analisis.margenPorcentaje !== null && (
                  <span className="predict-live-margin">
                    Margen {analisis.margenPorcentaje.toFixed(1)}%
                  </span>
                )}
              </div>
              {datosIncorrectos && <p role="alert">{mensajeDatosIncorrectos}</p>}
              {alertasVivas.length > 0 && (
                <ul className="predict-live-list">
                  {alertasVivas.map((alerta, index) => (
                    <li key={`${alerta}-${index}`}>{alerta}</li>
                  ))}
                </ul>
              )}
              {editado && !sinCalculos && analisis.margenEstado === 'critico' &&
                analisis.pvpMinimoSugerido !== null && (
                  <div className="predict-live-hint">
                    PVP mínimo sugerido: Bs.{' '}
                    {analisis.pvpMinimoSugerido.toFixed(2)} · Recomendado: Bs.{' '}
                    {analisis.pvpRecomendado?.toFixed(2)}
                  </div>
                )}
            </div>

            {error && (
              <div role="alert" style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <AlertCircle size={16} />
                {tipoError === 'servicio' && <strong>No se pudo completar el análisis. </strong>}
                {error}
              </div>
            )}

            <div className="predict-actions">
              <button type="submit" className="predict-btn-primary" disabled={loading || cargandoProducto}>
                {loading ? <Loader2 size={18} className="spin-animation" /> : <TrendingUp size={18} />}
                {loading ? 'Analizando viabilidad...' : 'Analizar Viabilidad con IA'}
              </button>
            </div>
          </form>

          {result && !sinCalculos && (
            <div className="predict-results-container">
              <div className={`predict-score-banner ${bannerClass}`}>
                <div>
                  <div className="predict-score-badge">
                    <IconoBanner size={24} />
                    {result.categoria}
                  </div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-strong)', marginTop: '0.25rem' }}>
                    {result.alertas.mensaje}
                  </div>
                  <div className="predict-model-probability" style={{ fontSize: '0.88rem', marginTop: '0.5rem' }}>
                    Probabilidad de alta rotación:{' '}
                    <strong>{(result.probabilidadExito * 100).toLocaleString('es-BO', { maximumFractionDigits: 1 })}%</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="predict-score-num">{result.scoreExito}%</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Índice de Viabilidad
                  </div>
                </div>
              </div>

              {result.guardrails && (
                <div
                  className={`predict-guardrails-box ${
                    result.bloqueado
                      ? 'danger'
                      : result.guardrails.advertencias.length > 0 ||
                          !result.guardrails.coherenciaSemantica.coherente
                        ? 'warn'
                        : 'ok'
                  }`}
                >
                  <div className="predict-guardrails-title">
                    {result.bloqueado ? (
                      <AlertCircle size={18} />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                    Guardrails de negocio
                    <span className="predict-guardrails-margin">
                      Margen {result.guardrails.margenPorcentaje.toFixed(1)}%
                    </span>
                  </div>
                  {result.guardrails.errores.length > 0 && (
                    <ul className="predict-guardrails-list crit">
                      {result.guardrails.errores.map((item, index) => (
                        <li key={`error-${index}`}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {result.guardrails.advertencias.length > 0 && (
                    <ul className="predict-guardrails-list warn">
                      {result.guardrails.advertencias.map((item, index) => (
                        <li key={`aviso-${index}`}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {!result.guardrails.coherenciaSemantica.coherente && (
                    <div className="predict-guardrails-semantic">
                      Categoría usada: <strong>{result.guardrails.coherenciaSemantica.categoriaUsada}</strong>
                      {' · '}Desgaste: <strong>{result.guardrails.coherenciaSemantica.tipoDesgasteUsado}</strong>
                    </div>
                  )}
                  <div className="predict-guardrails-hint">
                    PVP mínimo sugerido: Bs.{' '}
                    {result.guardrails.pvpMinimoSugerido.toFixed(2)} ·
                    Recomendado: Bs.{' '}
                    {result.guardrails.pvpRecomendado.toFixed(2)}
                  </div>
                </div>
              )}

              {result.alertas.saturacionCatalogo && (
                <div className="predict-guardrails-box warn">
                  <div className="predict-guardrails-title">
                    <AlertTriangle size={18} />
                    Catálogo saturado
                  </div>
                  <div className="predict-guardrails-semantic">
                    Ya hay varios repuestos similares activos. El lote sugerido se
                    redujo para evitar sobrestock.
                  </div>
                </div>
              )}

              <div className="predict-kpis-grid">
                <div className={`predict-kpi-card ${result.bloqueado ? 'danger' : ''}`}>
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
                  <span className="predict-kpi-value">
                    {(result.guardrails?.margenPorcentaje ??
                      result.metricasProyectadas.margenRelativo * 100
                    ).toFixed(0)}
                    %
                  </span>
                </div>
              </div>

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
