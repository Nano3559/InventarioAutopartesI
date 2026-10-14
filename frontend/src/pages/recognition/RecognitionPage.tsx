import { useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, ImageOff, ImagePlus, Loader2, ScanSearch, Trash2, Upload } from 'lucide-react';
import { recognitionService } from '../../services/recognition.service';
import type { RecognitionResult } from '../../types/recognition.types';
import '../../styles/recognition.css';

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
const minAcceptedConfidence = 0.5;
const percentage = (value: number) => `${(value * 100).toLocaleString('es-BO', { maximumFractionDigits: 1 })}%`;
const confidence = (value: number) => `${Math.min(99.9, Math.max(0, value * 100)).toLocaleString('es-BO', { maximumFractionDigits: 1 })}%`;
const states = { high: 'Confianza alta', medium: 'Confianza media', low: 'Confianza baja' };
const metricNames: Record<string, string> = { top1_accuracy: 'Accuracy Top-1', top5_accuracy: 'Accuracy Top-5', macro_precision: 'Precisión macro', macro_recall: 'Recall macro', macro_f1: 'F1 macro', sample_count: 'Imágenes de prueba' };

export function RecognitionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => request.current?.abort(), []);

  function select(next: File | undefined) {
    if (busy || !next) return;
    setError(null);
    if (!allowedTypes.includes(next.type)) { setError('Selecciona una imagen JPG, PNG o WebP.'); return; }
    if (!next.size || next.size > 10 * 1024 * 1024) { setError('La imagen debe tener contenido y pesar como máximo 10 MB.'); return; }
    setFile(next); setResult(null); setPreview(URL.createObjectURL(next));
  }
  function clear() { setFile(null); setPreview(null); setResult(null); setError(null); if (input.current) input.current.value = ''; }
  async function analyze() {
    if (!file || busy) return;
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 125000);
    setBusy(true); setError(null); setResult(null);
    try { setResult(await recognitionService.predict(file, controller.signal)); }
    catch (cause) {
      setError(controller.signal.aborted ? 'El análisis tardó demasiado. Intenta nuevamente.' : cause instanceof Error ? cause.message : 'No se pudo conectar con el servicio. Intenta nuevamente.');
    } finally { window.clearTimeout(timeout); setBusy(false); request.current = null; }
  }
  const part = result?.prediction.class_info;
  const rejected = !!result && result.prediction.confidence < minAcceptedConfidence;
  return (
    <div className="recognition-page">
      <header className="page-header recognition-header">
        <ScanSearch size={30} aria-hidden="true" />
        <div><h1 className="page-title">Reconocimiento inteligente de autopartes</h1><p className="page-subtitle">Identifica repuestos de vehículos mediante inteligencia artificial.</p></div>
      </header>
      <div className="recognition-columns">
        <section className="recognition-upload" aria-labelledby="photo-heading">
          <h2 id="photo-heading">Fotografía del repuesto</h2>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={busy} onChange={e => { select(e.target.files?.[0]); e.target.value = ''; }} />
          <div className={`recognition-drop ${dragging ? 'is-dragging' : ''}`} onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); select(e.dataTransfer.files[0]); }}>
            {preview ? <img src={preview} alt="Fotografía seleccionada para reconocer el repuesto" onError={() => { setError('No se pudo leer la imagen. Selecciona otra fotografía.'); setFile(null); setPreview(null); }} /> : <><ImagePlus size={44} aria-hidden="true" /><p>Arrastra tu fotografía aquí</p><span>Una imagen clara, con el repuesto completo y buena iluminación.</span><button type="button" className="btn-secondary" onClick={() => input.current?.click()} disabled={busy}><Upload size={16} /> Seleccionar imagen</button></>}
          </div>
          <p className="recognition-hint">JPG, JPEG, PNG o WebP · Máximo 10 MB</p>
          {file && <><p className="recognition-filename" title={file.name}>{file.name}</p><div className="recognition-actions"><button type="button" className="btn-secondary" disabled={busy} onClick={() => input.current?.click()}>Cambiar imagen</button><button type="button" className="btn-secondary" disabled={busy} onClick={clear}><Trash2 size={15} /> Eliminar</button></div></>}
          <button type="button" className="btn-primary recognition-submit" disabled={!file || busy} onClick={analyze}>{busy ? <Loader2 size={18} className="animate-spin" /> : <ScanSearch size={18} />}{busy ? 'Analizando imagen...' : 'Identificar repuesto'}</button>
          {error && <p className="recognition-error" role="alert"><AlertCircle size={18} aria-hidden="true" />{error}</p>}
        </section>
        <section className="recognition-results" aria-live="polite" aria-busy={busy}>
          {busy ? <div className="recognition-empty" role="status"><Loader2 size={36} className="animate-spin" /><h2>Analizando imagen...</h2><p>Estamos comparando tu fotografía con las clases aprendidas por el modelo.</p></div> : rejected ? <>
            <div className="recognition-rejected" role="alert">
              <span className="recognition-rejected-icon"><ImageOff size={38} aria-hidden="true" /></span>
              <span className="recognition-rejected-badge"><AlertTriangle size={14} aria-hidden="true" /> Análisis no concluyente</span>
              <h2>Imagen incorrecta, vuelva a cargar otra imagen</h2>
              <p className="recognition-rejected-copy">La fotografía analizada no corresponde a una autoparte o el modelo no alcanzó la confianza mínima requerida para identificarla.</p>
              <p className="recognition-rejected-meta">Confianza obtenida: <strong>{confidence(result.prediction.confidence)}</strong> · Confianza mínima requerida: <strong>{percentage(minAcceptedConfidence)}</strong></p>
              <p className="recognition-hint">Fotografía únicamente el repuesto, completo y centrado, con buena iluminación y sin otros objetos en el encuadre.</p>
              <div className="recognition-rejected-actions">
                <button type="button" className="btn-primary" disabled={busy} onClick={() => input.current?.click()}><Upload size={16} /> Cargar otra imagen</button>
                <button type="button" className="btn-secondary" disabled={busy} onClick={clear}><Trash2 size={15} /> Eliminar</button>
              </div>
            </div>
          </> : result && part ? <>
            <div className="recognition-main">
              <span className={`recognition-confidence ${result.confidence_state}`}>{states[result.confidence_state]}</span>
              <h2>{part.spanish_name || part.original_name}</h2>
              <p>Clase original: <strong>{part.original_name}</strong></p>
              <div className="recognition-confidence-label"><span>Confianza de la predicción</span><strong>{confidence(result.prediction.confidence)}</strong></div>
              <meter min="0" max="1" value={result.prediction.confidence} aria-label="Confianza de la predicción" />
              <p className="recognition-hint">{result.conclusive ? 'Esta es la clase más probable. La predicción puede contener errores.' : 'Identificación no concluyente. Prueba con otra fotografía y consulta las alternativas.'}</p>
            </div>
            <div className="recognition-information">
              <h3>Información del repuesto</h3>
              <dl><dt>Etiqueta de entrenamiento</dt><dd>{part.training_label}</dd><dt>Identificador de clase</dt><dd>{part.id}</dd>
                {part.spanish_name && <><dt>Nombre en español</dt><dd>{part.spanish_name} <small>(traducción revisable; no es metadata original)</small></dd></>}
                {Object.entries(part.image_counts).map(([split, count]) => <div className="recognition-data-row" key={split}><dt>Imágenes · {split === 'val' ? 'validación' : split === 'train' ? 'entrenamiento' : split === 'test' ? 'prueba' : split}</dt><dd>{count.toLocaleString('es-BO')}</dd></div>)}
              </dl>
              {part.metadata.csv?.map((csv, index) => <details key={`${csv.source_file}-${index}`}><summary>Metadatos originales · {csv.source_file}</summary><dl>{Object.entries(csv.fields).map(([key, values]) => <div className="recognition-data-row" key={key}><dt>{key}</dt><dd>{values.join(', ')}</dd></div>)}</dl><p className="recognition-hint">{csv.matching_row_count} filas asociadas a esta clase.</p></details>)}
              <p className="recognition-hint">La clasificación corresponde al dataset. No determina compatibilidad, precio ni existencias del catálogo.</p>
            </div>
            <div className="recognition-alternatives"><h3>Otras posibles coincidencias</h3><p className="recognition-hint">Tres clases más probables, incluida la predicción principal en primer lugar.</p><ol>{result.top_predictions.slice(0, 3).map((prediction, index) => <li key={prediction.class_info.id}><span className="recognition-rank">{index + 1}</span><div><strong>{prediction.class_info.spanish_name || prediction.class_info.original_name}</strong><span>{prediction.class_info.original_name}</span></div><strong>{confidence(prediction.confidence)}</strong></li>)}</ol></div>
            <details className="recognition-analysis"><summary>Información del análisis</summary><dl><dt>Modelo</dt><dd>{result.analysis.model}</dd><dt>Clases aprendidas</dt><dd>{result.analysis.class_count}</dd><dt>Fuente</dt><dd>{result.analysis.dataset.url?.startsWith('https://www.kaggle.com/') ? <a href={result.analysis.dataset.url} target="_blank" rel="noreferrer">{result.analysis.dataset.slug || 'Dataset original en Kaggle'}</a> : result.analysis.dataset.slug || 'Sin información disponible'}</dd>{result.analysis.dataset.version != null && <><dt>Versión del dataset</dt><dd>{result.analysis.dataset.version}</dd></>}<dt>Licencia registrada</dt><dd>{result.analysis.dataset.license ? JSON.stringify(result.analysis.dataset.license) : 'No verificada'}</dd><dt>Umbrales configurados</dt><dd>{Object.entries(result.thresholds).map(([name, value]) => `${name}: ${percentage(value)}`).join(' · ')}</dd>{result.analysis.created_at && <><dt>Modelo generado</dt><dd>{result.analysis.created_at}</dd></>}<dt>Identificador de pesos SHA-256</dt><dd>{result.analysis.weights_sha256}</dd></dl>{result.analysis.metrics && <><h4>Métricas verificadas</h4><dl>{Object.entries(metricNames).map(([key, label]) => typeof result.analysis.metrics?.[key] === 'number' ? <div className="recognition-data-row" key={key}><dt>{label}</dt><dd>{key === 'sample_count' ? result.analysis.metrics[key].toLocaleString('es-BO') : percentage(result.analysis.metrics[key])}</dd></div> : null)}</dl></>}</details>
          </> : <div className="recognition-empty"><ScanSearch size={42} aria-hidden="true" /><h2>Tu próximo repuesto, identificado</h2><p>Selecciona una fotografía para consultar la clase más probable, otras posibilidades y la información disponible en el dataset.</p></div>}
        </section>
      </div>
    </div>
  );
}
