import { useMemo, useState } from 'react';
import {
  X,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BarChart3,
  Lightbulb,
  ShieldAlert,
  Lock,
  Unlock,
  Wand2,
  Ban,
  Info,
} from 'lucide-react';
import { demandService } from '../../services/demand.service';
import type {
  GuardrailField,
  GuardrailIssue,
  PredictSuccessDto,
  PredictionSuccessResponse,
} from '../../types/demand.types';
import type { Product } from '../../types/product.types';
import {
  EXTENDED_CATEGORY_OPTIONS,
  ONNX_BASE_CATEGORY_OPTIONS,
  PARQUE_OPTIONS,
  WEAR_LABELS,
  WEAR_OPTIONS,
  evaluateDemandGuardrails,
  inferTaxonomyFromPart,
  inferVehicleKnowledge,
  issuesForField,
  type WearType,
} from '../../utils/demandGuardrails';
import '../../styles/demand-prediction.css';

interface PredictSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalogProducts?: Product[];
  initialProduct?: Product | null;
}

function buildInitialForm(prod?: Product | null): PredictSuccessDto {
  if (!prod) {
    return {
      producto: '',
      marca: '',
      modelo: '',
      costo: 100,
      precio1: 145,
      precioMayor: 125,
      categoriaRepuesto: 'Carrocería',
      tipoDesgaste: 'colision',
      segmentoParque: 'Alto',
    };
  }

  const baseCosto = prod.costo || 50;
  const inferredTax = inferTaxonomyFromPart(prod.producto);
  const inferredVeh = inferVehicleKnowledge(prod.marca, prod.modelo);

  const categoriaRepuesto =
    prod.categoriaRepuesto && prod.categoriaRepuesto !== 'General'
      ? prod.categoriaRepuesto
      : inferredTax.categoria;
  const tipoDesgaste = (prod.tipoDesgaste as WearType | null) || inferredTax.defaultWear;
  const segmentoParque = prod.segmentoParque || inferredVeh.expectedParque || 'Medio';

  return {
    producto: prod.producto,
    marca: prod.marca,
    modelo: prod.modelo,
    costo: baseCosto,
    precio1: prod.precio1 || Math.round(baseCosto * 1.35),
    precioMayor: prod.precioMayor || Math.round(baseCosto * 1.2),
    categoriaRepuesto,
    tipoDesgaste,
    segmentoParque,
  };
}

export function PredictSuccessModal({
  isOpen,
  onClose,
  catalogProducts = [],
  initialProduct = null,
}: PredictSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <PredictModalContent
      key={initialProduct ? `prod-${initialProduct.id}` : 'custom'}
      onClose={onClose}
      catalogProducts={catalogProducts}
      initialProduct={initialProduct}
    />
  );
}

function PredictModalContent({
  onClose,
  catalogProducts = [],
  initialProduct = null,
}: Omit<PredictSuccessModalProps, 'isOpen'>) {
  const [formData, setFormData] = useState<PredictSuccessDto>(() =>
    buildInitialForm(initialProduct),
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionSuccessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [insistAttempts, setInsistAttempts] = useState(0);
  const [lockedByInsistence, setLockedByInsistence] = useState(false);

  const guardrailEval = useMemo(() => evaluateDemandGuardrails(formData), [formData]);

  const updateForm = (patch: Partial<PredictSuccessDto>) => {
    const nextData = { ...formData, ...patch };
    setFormData(nextData);
    setResult(null);
    setError(null);

    const nextEval = evaluateDemandGuardrails(nextData);
    if (!nextEval.hasBlockers) {
      setInsistAttempts(0);
      setLockedByInsistence(false);
    }
  };

  const applySuggestions = (includeFinancial = false) => {
    const s = guardrailEval.suggestions;
    const patch: Partial<PredictSuccessDto> = {};
    if (s.categoriaRepuesto) patch.categoriaRepuesto = s.categoriaRepuesto;
    if (s.tipoDesgaste) patch.tipoDesgaste = s.tipoDesgaste;
    if (s.segmentoParque) patch.segmentoParque = s.segmentoParque;
    if (s.marca) patch.marca = s.marca;
    if (includeFinancial || guardrailEval.financial.wholesaleConflict) {
      if (s.precio1 !== undefined) patch.precio1 = s.precio1;
      if (s.precioMayor !== undefined) patch.precioMayor = s.precioMayor;
    }
    updateForm(patch);
  };

  const applySingleIssueFix = (issue: GuardrailIssue) => {
    if (!issue.suggestedField || issue.suggestedValue === undefined) return;
    updateForm({ [issue.suggestedField]: issue.suggestedValue } as Partial<PredictSuccessDto>);
  };

  const handleSelectProductPreset = (prodIdStr: string) => {
    if (!prodIdStr) return;
    const prod = catalogProducts.find((p) => p.id === Number(prodIdStr));
    if (!prod) return;
    setFormData(buildInitialForm(prod));
    setResult(null);
    setError(null);
    setInsistAttempts(0);
    setLockedByInsistence(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.producto.trim() || !formData.marca.trim() || !formData.modelo.trim()) {
      setError('Por favor completa nombre del repuesto, marca y modelo del vehículo.');
      return;
    }

    // Flujo progresivo: 1er aviso fuerte + globo práctico -> bloqueo total si insiste
    if (guardrailEval.hasBlockers) {
      setResult(null);
      if (insistAttempts === 0) {
        setInsistAttempts(1);
        return;
      }
      setLockedByInsistence(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await demandService.predictSuccess(formData);
      setResult(res);
    } catch (err: any) {
      const apiMsg = err?.message || 'Error al ejecutar la predicción con el modelo.';
      setError(apiMsg);
      if (err?.data?.blocked) {
        setLockedByInsistence(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const getFieldClass = (base: string, field: GuardrailField): string => {
    const list = issuesForField(guardrailEval, field);
    if (list.some((i) => i.severity === 'blocker')) return `${base} predict-input-blocker`;
    if (list.some((i) => i.severity === 'warning')) return `${base} predict-input-warning`;
    return base;
  };

  const renderFieldBubble = (field: GuardrailField) => {
    const list = issuesForField(guardrailEval, field);
    if (list.length === 0) return null;
    const primary = list[0];
    return (
      <div className={`predict-field-bubble ${primary.severity}`}>
        <span>{primary.message}</span>
        {primary.suggestedField && primary.suggestedValue !== undefined && (
          <button
            type="button"
            className="predict-inline-fix-btn"
            onClick={() => applySingleIssueFix(primary)}
          >
            {primary.suggestion || `Corregir a ${primary.suggestedValue}`}
          </button>
        )}
      </div>
    );
  };

  const semanticSuggestionTags: string[] = [];
  if (guardrailEval.suggestions.marca) {
    semanticSuggestionTags.push(`Marca → ${guardrailEval.suggestions.marca}`);
  }
  if (guardrailEval.suggestions.categoriaRepuesto) {
    semanticSuggestionTags.push(`Categoría → ${guardrailEval.suggestions.categoriaRepuesto}`);
  }
  if (guardrailEval.suggestions.tipoDesgaste) {
    semanticSuggestionTags.push(
      `Desgaste → ${WEAR_LABELS[guardrailEval.suggestions.tipoDesgaste]}`,
    );
  }
  if (guardrailEval.suggestions.segmentoParque) {
    semanticSuggestionTags.push(`Parque → ${guardrailEval.suggestions.segmentoParque}`);
  }

  const priceSuggestionTags: string[] = [];
  if (guardrailEval.suggestions.precio1 !== undefined) {
    priceSuggestionTags.push(`PVP Sugerido → Bs. ${guardrailEval.suggestions.precio1}`);
  }
  if (guardrailEval.suggestions.precioMayor !== undefined) {
    priceSuggestionTags.push(`Mayorista → Bs. ${guardrailEval.suggestions.precioMayor}`);
  }

  const showAssistantBubble =
    semanticSuggestionTags.length > 0 ||
    (guardrailEval.financial.status === 'loss' ||
      guardrailEval.financial.status === 'insufficient' ||
      guardrailEval.financial.wholesaleConflict ||
      guardrailEval.financial.wholesaleLoss);

  const fin = guardrailEval.financial;

  const getFinancialBadgeLabel = () => {
    switch (fin.status) {
      case 'invalid':
        return 'DATOS INVÁLIDOS';
      case 'loss':
        return 'VENTA A PÉRDIDA / INVIABLE';
      case 'insufficient':
        return 'MARGEN INSUFICIENTE (<15%)';
      case 'tight':
        return 'MARGEN AJUSTADO';
      case 'overpriced':
        return 'SOBREPRECIO (>150%)';
      default:
        return 'MARGEN SALUDABLE';
    }
  };

  const getResultBannerClass = (res: PredictionSuccessResponse): string => {
    if (res.bloqueadoFinanciero || res.scoreExito <= 0 || res.scoreExito < 50) return 'baja';
    if (res.scoreExito >= 75 && res.alertas.nivelAlerta !== 'critica') return 'alta';
    return 'media';
  };

  return (
    <div className="predict-modal-overlay" onClick={onClose}>
      <div className="predict-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div className="predict-modal-header">
          <h2 className="predict-modal-title">
            <Sparkles size={22} />
            Análisis Predictivo de Viabilidad Comercial (IA + Guardrails)
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
                defaultValue={initialProduct ? String(initialProduct.id) : ''}
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
                  className={getFieldClass('predict-input', 'producto')}
                  placeholder="Ej: Farol Delantero, Radiador"
                  value={formData.producto}
                  onChange={(e) => updateForm({ producto: e.target.value })}
                  required
                />
                {renderFieldBubble('producto')}
              </div>

              <div className="predict-field">
                <label className="predict-label">Marca Vehículo *</label>
                <input
                  type="text"
                  className={getFieldClass('predict-input', 'marca')}
                  placeholder="Ej: Toyota"
                  value={formData.marca}
                  onChange={(e) => updateForm({ marca: e.target.value })}
                  required
                />
                {renderFieldBubble('marca')}
              </div>

              <div className="predict-field">
                <label className="predict-label">Modelo Vehículo *</label>
                <input
                  type="text"
                  className={getFieldClass('predict-input', 'modelo')}
                  placeholder="Ej: Hilux"
                  value={formData.modelo}
                  onChange={(e) => updateForm({ modelo: e.target.value })}
                  required
                />
                {renderFieldBubble('modelo')}
              </div>

              <div className="predict-field">
                <label className="predict-label">Costo Unitario (Bs.) *</label>
                <input
                  type="number"
                  step="any"
                  className={getFieldClass('predict-input', 'costo')}
                  value={Number.isNaN(formData.costo) ? '' : formData.costo}
                  onChange={(e) =>
                    updateForm({
                      costo: e.target.value === '' ? 0 : parseFloat(e.target.value),
                    })
                  }
                  required
                />
                {renderFieldBubble('costo')}
              </div>

              <div className="predict-field">
                <label className="predict-label">Precio Mostrador (Bs.) *</label>
                <input
                  type="number"
                  step="any"
                  className={getFieldClass('predict-input', 'precio1')}
                  value={Number.isNaN(formData.precio1) ? '' : formData.precio1}
                  onChange={(e) =>
                    updateForm({
                      precio1: e.target.value === '' ? 0 : parseFloat(e.target.value),
                    })
                  }
                  required
                />
                {renderFieldBubble('precio1')}
              </div>

              <div className="predict-field">
                <label className="predict-label">Precio Mayorista (Bs.)</label>
                <input
                  type="number"
                  step="any"
                  className={getFieldClass('predict-input', 'precioMayor')}
                  value={formData.precioMayor || ''}
                  onChange={(e) =>
                    updateForm({
                      precioMayor:
                        e.target.value === '' ? undefined : parseFloat(e.target.value),
                    })
                  }
                />
                {renderFieldBubble('precioMayor')}
              </div>

              <div className="predict-field">
                <label className="predict-label">Categoría Técnica</label>
                <select
                  className={getFieldClass('predict-select', 'categoriaRepuesto')}
                  value={formData.categoriaRepuesto}
                  onChange={(e) => updateForm({ categoriaRepuesto: e.target.value })}
                >
                  <optgroup label="Líneas Principales (Entrenamiento ONNX)">
                    {ONNX_BASE_CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Líneas Automotrices Extendidas">
                    {EXTENDED_CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {renderFieldBubble('categoriaRepuesto')}
              </div>

              <div className="predict-field">
                <label className="predict-label">Tipo de Desgaste</label>
                <select
                  className={getFieldClass('predict-select', 'tipoDesgaste')}
                  value={formData.tipoDesgaste}
                  onChange={(e) => updateForm({ tipoDesgaste: e.target.value })}
                >
                  {WEAR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {renderFieldBubble('tipoDesgaste')}
              </div>

              <div className="predict-field">
                <label className="predict-label">Parque Vehicular en Bolivia</label>
                <select
                  className={getFieldClass('predict-select', 'segmentoParque')}
                  value={formData.segmentoParque}
                  onChange={(e) => updateForm({ segmentoParque: e.target.value })}
                >
                  {PARQUE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {renderFieldBubble('segmentoParque')}
              </div>
            </div>

            {/* Globo Práctico de Sugerencias Inteligentes */}
            {showAssistantBubble && (
              <div
                className={`predict-suggestion-bubble ${
                  guardrailEval.hasBlockers ? 'has-blockers' : ''
                }`}
              >
                <div className="predict-bubble-head">
                  <span className="predict-bubble-title">
                    <Lightbulb
                      size={17}
                      color={guardrailEval.hasBlockers ? '#fbbf24' : '#38bdf8'}
                    />
                    {guardrailEval.hasBlockers
                      ? 'Sugerencia práctica para corregir incompatibilidades:'
                      : 'Asistente de precios y clasificación:'}
                  </span>
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {semanticSuggestionTags.length > 0 && (
                      <button
                        type="button"
                        className="predict-bubble-apply-btn"
                        onClick={() => applySuggestions(false)}
                      >
                        <Wand2 size={14} />
                        Aplicar clasificación sugerida
                      </button>
                    )}
                    {priceSuggestionTags.length > 0 && (
                      <button
                        type="button"
                        className="predict-bubble-apply-btn"
                        onClick={() => applySuggestions(true)}
                      >
                        <Wand2 size={14} />
                        Aplicar precios recomendados
                      </button>
                    )}
                  </div>
                </div>
                <div className="predict-bubble-tags">
                  {semanticSuggestionTags.map((tag) => (
                    <span key={tag} className="predict-bubble-tag">
                      {tag}
                    </span>
                  ))}
                  {priceSuggestionTags.map((tag) => (
                    <span key={tag} className="predict-bubble-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Barra de Salud Financiera en Vivo */}
            <div className={`predict-financial-bar ${fin.status}`}>
              <div className="predict-financial-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <span className={`predict-fin-badge ${fin.status}`}>
                    {getFinancialBadgeLabel()}
                  </span>
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-strong)' }}>
                    {fin.status === 'invalid'
                      ? 'Completa costo y precio > 0'
                      : fin.utilidadUnitaria < 0
                        ? `Pérdida: -Bs. ${Math.abs(fin.utilidadUnitaria).toFixed(2)} / ud. (${fin.margenPorcentaje}%)`
                        : `Utilidad: +Bs. ${fin.utilidadUnitaria.toFixed(2)} / ud. (${fin.margenPorcentaje}% s/costo)`}
                  </span>
                </div>

                {fin.margenMayorRelativo !== null && (
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: fin.wholesaleConflict || fin.wholesaleLoss ? '#fca5a5' : 'var(--text-muted)',
                    }}
                  >
                    Mayorista: {(fin.margenMayorRelativo * 100).toFixed(1)}% s/costo
                  </span>
                )}
              </div>

              {formData.costo > 0 && (
                <div className="predict-fin-quickfixes">
                  <span>
                    PVP Mínimo (15%): <strong>Bs. {fin.pvpMinimoRentable}</strong>
                  </span>
                  <button
                    type="button"
                    className="predict-inline-fix-btn"
                    onClick={() => updateForm({ precio1: fin.pvpMinimoRentable })}
                  >
                    Usar Bs. {fin.pvpMinimoRentable}
                  </button>
                  <span>
                    · PVP Saludable (35%): <strong>Bs. {fin.pvpRecomendado}</strong>
                  </span>
                  <button
                    type="button"
                    className="predict-inline-fix-btn"
                    onClick={() =>
                      updateForm({
                        precio1: fin.pvpRecomendado,
                        precioMayor: fin.precioMayorSugerido,
                      })
                    }
                  >
                    Usar Bs. {fin.pvpRecomendado}
                  </button>
                </div>
              )}
            </div>

            {/* Aviso por 1er intento o Bloqueo si insiste */}
            {insistAttempts > 0 && guardrailEval.hasBlockers && !lockedByInsistence && (
              <div className="predict-guardrail-banner warn">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                  <ShieldAlert size={19} />
                  <span>
                    Advertencia (1er aviso): hay {guardrailEval.blockers.length}{' '}
                    inconsistencia(s) que distorsionan la predicción.
                  </span>
                </div>
                <ul className="predict-guardrail-list">
                  {guardrailEval.blockers.map((b) => (
                    <li key={b.code + b.field}>{b.message}</li>
                  ))}
                </ul>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem' }}>
                    Si vuelves a insistir sin corregir, el análisis quedará bloqueado.
                  </span>
                  <button
                    type="button"
                    className="predict-bubble-apply-btn"
                    onClick={() => applySuggestions(true)}
                  >
                    <Wand2 size={14} />
                    Corregir todo automáticamente
                  </button>
                </div>
              </div>
            )}

            {lockedByInsistence && guardrailEval.hasBlockers && (
              <div className="predict-guardrail-banner locked">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                  <Lock size={19} />
                  <span>
                    Análisis bloqueado: insististe con valores que no corresponden entre sí.
                  </span>
                </div>
                <ul className="predict-guardrail-list">
                  {guardrailEval.blockers.map((b) => (
                    <li key={b.code + b.field}>{b.message}</li>
                  ))}
                </ul>
                <div>
                  <button
                    type="button"
                    className="predict-bubble-apply-btn"
                    style={{ borderColor: '#f87171', background: 'rgba(239, 68, 68, 0.25)' }}
                    onClick={() => applySuggestions(true)}
                  >
                    <Unlock size={14} />
                    Desbloquear aplicando valores coherentes
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div
                style={{
                  color: '#fca5a5',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.84rem',
                  marginTop: '0.75rem',
                  display: 'flex',
                  gap: '0.45rem',
                  alignItems: 'center',
                }}
              >
                <AlertCircle size={17} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div className="predict-actions">
              <button
                type="submit"
                className="predict-btn-primary"
                disabled={loading || lockedByInsistence}
                style={
                  lockedByInsistence
                    ? { background: '#991b1b', opacity: 0.75 }
                    : undefined
                }
              >
                {loading ? (
                  <Loader2 size={18} className="spin-animation" />
                ) : lockedByInsistence ? (
                  <Lock size={18} />
                ) : (
                  <TrendingUp size={18} />
                )}
                {loading
                  ? 'Calculando Inferencia ONNX...'
                  : lockedByInsistence
                    ? 'Bloqueado hasta corregir incoherencias'
                    : insistAttempts > 0 && guardrailEval.hasBlockers
                      ? 'Reintentar (se bloqueará si no corriges)'
                      : 'Analizar Viabilidad con IA'}
              </button>
            </div>
          </form>

          {/* Resultados de la Predicción */}
          {result && (
            <div className="predict-results-container">
              {/* Banner de Score */}
              <div className={`predict-score-banner ${getResultBannerClass(result)}`}>
                <div style={{ maxWidth: '76%' }}>
                  <div className="predict-score-badge">
                    {result.bloqueadoFinanciero ? (
                      <Ban size={24} />
                    ) : result.scoreExito >= 75 && result.alertas.nivelAlerta !== 'critica' ? (
                      <CheckCircle2 size={24} />
                    ) : result.scoreExito >= 52 ? (
                      <AlertTriangle size={24} />
                    ) : (
                      <AlertCircle size={24} />
                    )}
                    {result.categoria}
                  </div>
                  {result.recomendacionCompra && (
                    <div
                      style={{
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        color: 'var(--text-strong)',
                        marginTop: '0.35rem',
                      }}
                    >
                      {result.recomendacionCompra.titulo}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: '0.84rem',
                      color: 'var(--text)',
                      marginTop: '0.25rem',
                    }}
                  >
                    {result.alertas.mensaje}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="predict-score-num">{result.scoreExito}%</div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Viabilidad Comercial
                  </div>
                </div>
              </div>

              {/* Desglose del Score Compuesto */}
              {result.desgloseScore && !result.bloqueadoFinanciero && (
                <div className="predict-breakdown-row">
                  <div className="predict-breakdown-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Rotación IA (40%)</span>
                      <strong>{result.desgloseScore.factorRotacionIA}/100</strong>
                    </div>
                    <div className="predict-progress-track">
                      <div
                        className="predict-progress-fill"
                        style={{
                          width: `${result.desgloseScore.factorRotacionIA}%`,
                          background: '#38bdf8',
                        }}
                      />
                    </div>
                  </div>
                  <div className="predict-breakdown-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Salud Margen (40%)</span>
                      <strong>{result.desgloseScore.saludMargen}/100</strong>
                    </div>
                    <div className="predict-progress-track">
                      <div
                        className="predict-progress-fill"
                        style={{
                          width: `${result.desgloseScore.saludMargen}%`,
                          background:
                            result.desgloseScore.saludMargen < 35 ? '#ef4444' : '#10b981',
                        }}
                      />
                    </div>
                  </div>
                  <div className="predict-breakdown-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Baja Saturación (20%)</span>
                      <strong>{result.desgloseScore.saludCatalogo}/100</strong>
                    </div>
                    <div className="predict-progress-track">
                      <div
                        className="predict-progress-fill"
                        style={{
                          width: `${result.desgloseScore.saludCatalogo}%`,
                          background:
                            result.alertas.saturacionCatalogo ? '#f59e0b' : '#8b5cf6',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Recomendación de Precios desde Backend */}
              {result.recomendacionCompra &&
                (result.bloqueadoFinanciero ||
                  result.recomendacionCompra.accion === 'AJUSTAR_PRECIO') && (
                  <div className="predict-price-advice">
                    <div>
                      <strong>Precios sugeridos para hacer viable este repuesto:</strong>{' '}
                      PVP Mínimo <strong>Bs. {result.recomendacionCompra.pvpMinimoRentable}</strong> ·
                      PVP Recomendado <strong>Bs. {result.recomendacionCompra.pvpRecomendado}</strong> ·
                      Mayorista <strong>Bs. {result.recomendacionCompra.precioMayorSugerido}</strong>
                    </div>
                    <button
                      type="button"
                      className="predict-bubble-apply-btn"
                      onClick={() =>
                        updateForm({
                          precio1: result.recomendacionCompra!.pvpRecomendado,
                          precioMayor: result.recomendacionCompra!.precioMayorSugerido,
                        })
                      }
                    >
                      <Wand2 size={14} />
                      Simular con PVP Recomendado
                    </button>
                  </div>
                )}

              {/* Alertas detalladas devueltas por Backend */}
              {result.alertas.advertencias && result.alertas.advertencias.length > 0 && (
                <div className="predict-alerts-box">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      color: '#fde68a',
                    }}
                  >
                    <AlertTriangle size={16} />
                    Avisos de negocio y riesgos detectados ({result.alertas.advertencias.length})
                  </div>
                  <ul className="predict-guardrail-list">
                    {result.alertas.advertencias.map((adv, idx) => (
                      <li key={`${adv.code}-${idx}`} style={{ color: 'var(--text)' }}>
                        {adv.message}
                        {adv.suggestion ? ` — ${adv.suggestion}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* KPIs de Rotación y Rentabilidad */}
              <div className="predict-kpis-grid">
                <div className="predict-kpi-card">
                  <span className="predict-kpi-label">Lote Sugerido</span>
                  <span className="predict-kpi-value">{result.loteSugeridoCompra} uds.</span>
                </div>
                <div className="predict-kpi-card">
                  <span className="predict-kpi-label">Días de Rotación</span>
                  <span className="predict-kpi-value">
                    {result.diasRotacionEstimados > 0
                      ? `~${result.diasRotacionEstimados} días`
                      : 'N/A'}
                  </span>
                </div>
                <div className="predict-kpi-card">
                  <span className="predict-kpi-label">Demanda Estimada</span>
                  <span className="predict-kpi-value">
                    {result.metricasProyectadas.demandaMensualEstimada} / mes
                  </span>
                </div>
                <div className="predict-kpi-card">
                  <span className="predict-kpi-label">Margen s/ Costo</span>
                  <span
                    className="predict-kpi-value"
                    style={{
                      color:
                        result.metricasProyectadas.margenRelativo <= 0
                          ? '#f87171'
                          : result.metricasProyectadas.margenRelativo < 0.15
                            ? '#fbbf24'
                            : '#34d399',
                    }}
                  >
                    {(result.metricasProyectadas.margenRelativo * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="predict-kpi-card">
                  <span className="predict-kpi-label">GMROI Proyectado</span>
                  <span className="predict-kpi-value">
                    {result.metricasProyectadas.gmroiProyectado}x
                  </span>
                </div>
                <div className="predict-kpi-card">
                  <span className="predict-kpi-label">Utilidad Unitaria</span>
                  <span className="predict-kpi-value">
                    Bs. {(result.metricasProyectadas.utilidadUnitaria ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="predict-kpi-card">
                  <span className="predict-kpi-label">Inversión Lote</span>
                  <span className="predict-kpi-value">
                    Bs. {(result.metricasProyectadas.inversionLoteEstimada ?? 0).toFixed(0)}
                  </span>
                </div>
                <div className="predict-kpi-card">
                  <span className="predict-kpi-label">Ganancia Lote</span>
                  <span className="predict-kpi-value" style={{ color: '#34d399' }}>
                    Bs. {(result.metricasProyectadas.gananciaProyectadaLote ?? 0).toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Explicabilidad con 3 productos similares */}
              {result.productosSimilares?.length > 0 ? (
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
                          {sim.precio1 ? ` • PVP Bs. ${sim.precio1}` : ''}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginTop: '0.35rem',
                            fontWeight: 600,
                          }}
                        >
                          <span>Ventas: ~{sim.ventasMensualesNetas}/mes</span>
                          <span style={{ color: '#34d399' }}>GMROI: {sim.gmroiReal}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'var(--bg-alt)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <Info size={16} />
                  <span>
                    Sin referencias históricas directas similares en catálogo (arranque en frío para
                    esta combinación).
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
