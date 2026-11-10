import { useEffect, useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  Sparkles,
  BarChart2,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { demandService } from '../../services/demand.service';
import type { DemandSummary } from '../../types/demand.types';

interface ProductDemandCardProps {
  productId: number;
  onOpenPredictModal?: () => void;
}

export function ProductDemandCard({
  productId,
  onOpenPredictModal,
}: ProductDemandCardProps) {
  const [summary, setSummary] = useState<DemandSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadSummary() {
      setLoading(true);
      try {
        const data = await demandService.getDemandSummary(productId);
        if (isMounted) {
          setSummary(data);
          setError(null);
        }
      } catch (err) {
        console.error('Error al cargar métricas de demanda:', err);
        if (isMounted) {
          setError('Sin métricas históricas suficientes.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadSummary();
    return () => {
      isMounted = false;
    };
  }, [productId]);

  const getRotationColor = (rot?: string) => {
    if (!rot) return '#94a3b8';
    if (rot.includes('Alta')) return '#10b981';
    if (rot.includes('Media')) return '#38bdf8';
    return '#f59e0b';
  };

  const getAlertBg = (nivel?: string) => {
    if (nivel === 'critico') return 'rgba(239, 68, 68, 0.15)';
    if (nivel === 'atencion') return 'rgba(245, 158, 11, 0.15)';
    return 'rgba(16, 185, 129, 0.12)';
  };

  const getAlertColor = (nivel?: string) => {
    if (nivel === 'critico') return '#ef4444';
    if (nivel === 'atencion') return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="pricing-card" style={{ borderLeft: '3px solid #8b5cf6' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={19} color="#8b5cf6" />
          <h3
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--text-strong)',
            }}
          >
            Inteligencia de Demanda & Rotación
          </h3>
        </div>

        {summary && (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              backgroundColor: `${getRotationColor(summary.rotacionClasificacion)}22`,
              color: getRotationColor(summary.rotacionClasificacion),
              border: `1px solid ${getRotationColor(summary.rotacionClasificacion)}55`,
            }}
          >
            {summary.rotacionClasificacion}
          </span>
        )}
      </div>

      {loading ? (
        <div
          style={{
            padding: '1.5rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
          }}
        >
          Calculando velocidad de rotación y proyección...
        </div>
      ) : error || !summary ? (
        <div
          style={{
            padding: '1rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            background: 'var(--bg-alt)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <HelpCircle
            size={22}
            style={{ margin: '0 auto 0.5rem auto', display: 'block', opacity: 0.6 }}
          />
          {error || 'No hay datos de ventas para este repuesto.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {/* Banner de alerta de stock */}
          <div
            style={{
              padding: '0.75rem 0.9rem',
              borderRadius: 'var(--radius-sm)',
              background: getAlertBg(summary.nivelRiesgo),
              border: `1px solid ${getAlertColor(summary.nivelRiesgo)}44`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
            }}
          >
            {summary.nivelRiesgo === 'critico' ? (
              <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
            ) : (
              <CheckCircle size={18} color={getAlertColor(summary.nivelRiesgo)} style={{ flexShrink: 0 }} />
            )}
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: getAlertColor(summary.nivelRiesgo),
              }}
            >
              {summary.alertaStock}
            </span>
          </div>

          {/* Grilla de Métricas Rápidas */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.6rem',
              marginTop: '0.2rem',
            }}
          >
            <div
              style={{
                background: 'var(--bg-alt)',
                padding: '0.65rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  textTransform: 'uppercase',
                }}
              >
                <TrendingUp size={12} color="#10b981" />
                Ritmo 30 Días
              </span>
              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: 'var(--text-strong)',
                  marginTop: '0.2rem',
                }}
              >
                {summary.ventasUltimos30Dias} uds.
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    fontWeight: 400,
                    marginLeft: '0.3rem',
                  }}
                >
                  ({summary.ventasPromedioMensual} / mes)
                </span>
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-alt)',
                padding: '0.65rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  textTransform: 'uppercase',
                }}
              >
                <Clock size={12} color="#38bdf8" />
                Agotamiento Estimado
              </span>
              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color:
                    summary.diasAgotamientoEstimados < 30
                      ? '#ef4444'
                      : summary.diasAgotamientoEstimados < 60
                      ? '#f59e0b'
                      : 'var(--text-strong)',
                  marginTop: '0.2rem',
                }}
              >
                {summary.diasAgotamientoEstimados > 900
                  ? '+3 años'
                  : `~${summary.diasAgotamientoEstimados} días`}
              </div>
            </div>
          </div>

          {/* Atributos del mercado automotor */}
          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.4rem',
              paddingTop: '0.4rem',
              borderTop: '1px solid var(--border)',
            }}
          >
            <span
              style={{
                background: 'rgba(99, 102, 241, 0.1)',
                color: '#818cf8',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
              }}
            >
              Cat: {summary.categoriaRepuesto || 'General'}
            </span>
            <span
              style={{
                background: 'rgba(236, 72, 153, 0.1)',
                color: '#f472b6',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
              }}
            >
              Desgaste: {summary.tipoDesgaste ? summary.tipoDesgaste.replace(/_/g, ' ') : 'Frecuente'}
            </span>
            <span
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#34d399',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
              }}
            >
              Parque: {summary.segmentoParque || 'Medio'}
            </span>
            {summary.tasaDevolucionPorcentaje > 0 && (
              <span
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                }}
              >
                Devoluciones: {summary.tasaDevolucionPorcentaje}%
              </span>
            )}
          </div>

          {/* Botón Simular Viabilidad con IA */}
          {onOpenPredictModal && (
            <button
              type="button"
              className="btn-secondary"
              onClick={onOpenPredictModal}
              style={{
                width: '100%',
                marginTop: '0.4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                fontSize: '0.85rem',
                background: 'rgba(139, 92, 246, 0.1)',
                borderColor: 'rgba(139, 92, 246, 0.3)',
                color: '#c084fc',
              }}
            >
              <BarChart2 size={15} />
              <span>Evaluar Nuevo Lote o Repuesto Similar</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

