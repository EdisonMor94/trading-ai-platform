'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import Image from 'next/image';
import Link from 'next/link';
import styles from './history.module.css'

// --- Interfaces para los Datos (100% Completas) ---
interface FinalRecommendation {
  resumen_analitico?: {
    analisis_fundamental: string;
    puntos_confluencia: string[];
    puntos_divergencia: string[];
  };
  indice_confianza?: {
    puntuacion: number;
    justificacion: string;
  };
  recomendacion_estrategica?: {
    estrategia: 'COMPRAR' | 'VENDER' | 'ESPERAR';
    justificacion_estrategia: string;
    plan_de_trading: {
      entrada_sugerida: string;
      stop_loss: string;
      take_profit: string;
    };
    plan_de_vigilancia?: {
        condicion_compra: string;
        condicion_venta: string;
    }
  };
}

interface AnalysisResultData {
    activo: string;
    temporalidad: string;
    patrones_identificados: any[];
    indicadores: any[];
    patrones_velas: any[];
    niveles_clave: object;
    evaluacion_niveles: string;
    sentimiento_analisis: string;
}

interface AnalysisRequest {
  id: string;
  status: string;
  created_at: string;
  notes: string | null;
  image_path: string;
  analysis_result: AnalysisResultData | null;
  final_recommendation: FinalRecommendation | null;
}

// --- Componente para mostrar el resultado detallado (100% Completo) ---
const AnalysisResult = ({ recommendation }: { recommendation: FinalRecommendation }) => {
  const { resumen_analitico, indice_confianza, recomendacion_estrategica } = recommendation;

  if (!resumen_analitico || !indice_confianza || !recomendacion_estrategica) {
    return (
      <div className={styles.resultCard} style={{ borderColor: '#f59e0b' }}>
        <h3 className={styles.resultCardTitle} style={{ color: '#f59e0b' }}>Respuesta Incompleta</h3>
        <p>La IA devolvió una respuesta parcial. No se pueden mostrar los detalles.</p>
      </div>
    )
  }

  const getStrategyClass = (strategy: string) => {
    if (strategy === 'COMPRAR') return styles.resultStrategyBuy;
    if (strategy === 'VENDER') return styles.resultStrategySell;
    return styles.resultStrategyWait;
  };

  return (
    <div className={styles.resultContainer}>
      <div className={styles.resultGrid}>
        <div className={styles.resultCard}>
          <h4 className={styles.resultCardTitle}>Estrategia Recomendada</h4>
          <p className={`${styles.resultStrategy} ${getStrategyClass(recomendacion_estrategica.estrategia)}`}>
            {recomendacion_estrategica.estrategia}
          </p>
          <p className={styles.resultJustification}>{recomendacion_estrategica.justificacion_estrategia}</p>
        </div>
        <div className={styles.resultCard}>
          <h4 className={styles.resultCardTitle}>Índice de Confianza</h4>
          <p className={styles.resultConfidenceScore}>{indice_confianza.puntuacion} / 100</p>
          <p className={styles.resultJustification}>{indice_confianza.justificacion}</p>
        </div>
      </div>

      {recomendacion_estrategica.estrategia === 'ESPERAR' && recomendacion_estrategica.plan_de_vigilancia && (
        <div className={styles.resultCard}>
          <h4 className={styles.resultCardTitle}>Plan de Vigilancia</h4>
          <div className={styles.vigilanceGrid}>
            <div className={styles.vigilanceItem}>
              <span className={styles.vigilanceLabelBuy}>Condición para Comprar</span>
              <p>{recomendacion_estrategica.plan_de_vigilancia.condicion_compra}</p>
            </div>
            <div className={styles.vigilanceItem}>
              <span className={styles.vigilanceLabelSell}>Condición para Vender</span>
              <p>{recomendacion_estrategica.plan_de_vigilancia.condicion_venta}</p>
            </div>
          </div>
        </div>
      )}

      {recomendacion_estrategica.estrategia !== 'ESPERAR' && (
        <div className={styles.resultCard}>
          <h4 className={styles.resultCardTitle}>Plan de Trading Sugerido</h4>
          <div className={styles.tradingPlanGrid}>
            <div className={styles.tradingPlanItem}>
              <p>Entrada</p>
              <p>{recomendacion_estrategica.plan_de_trading?.entrada_sugerida || 'N/A'}</p>
            </div>
            <div className={styles.tradingPlanItem}>
              <p>Stop Loss</p>
              <p style={{ color: '#f87171' }}>{recomendacion_estrategica.plan_de_trading?.stop_loss || 'N/A'}</p>
            </div>
            <div className={styles.tradingPlanItem}>
              <p>Take Profit</p>
              <p style={{ color: '#4ade80' }}>{recomendacion_estrategica.plan_de_trading?.take_profit || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      <div className={styles.resultCard}>
        <h4 className={styles.resultCardTitle}>Resumen Analítico</h4>
        <p className={styles.resultJustification}><strong style={{ color: 'var(--text-primary)' }}>Análisis Fundamental:</strong> {resumen_analitico.analisis_fundamental}</p>
        <div style={{ marginTop: '1rem' }}>
          <h5 style={{ fontWeight: 600, color: '#4ade80' }}>Puntos de Confluencia:</h5>
          <ul className={styles.confluenceList}>
            {resumen_analitico.puntos_confluencia?.map((point, i) => <li key={i}>{point}</li>)}
          </ul>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <h5 style={{ fontWeight: 600, color: '#f87171' }}>Puntos de Divergencia:</h5>
          <ul className={styles.divergenceList}>
            {resumen_analitico.puntos_divergencia?.map((point, i) => <li key={i}>{point}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
};


// --- Componente de la Fila del Historial ---
const HistoryRow = ({ analysis, onToggle, isExpanded, supabase }: { analysis: AnalysisRequest, onToggle: () => void, isExpanded: boolean, supabase: any }) => {
  
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'complete':
        return { icon: '✅', chipClass: styles.statusComplete, text: 'Completado' };
      case 'failed':
        return { icon: '❌', chipClass: styles.statusFailed, text: 'Fallido' };
      default:
        return { icon: '⏱️', chipClass: styles.statusInProgress, text: 'En Proceso' };
    }
  };

  const statusInfo = getStatusInfo(analysis.status);
  const strategy = analysis.final_recommendation?.recomendacion_estrategica?.estrategia || 'N/A';
  const assetName = analysis.analysis_result?.activo || `Análisis #${analysis.id.substring(0, 8)}`;

  const { data: imageUrl } = supabase.storage.from('analysis-images').getPublicUrl(analysis.image_path);

  return (
    <li className={styles.historyItem}>
      <button onClick={onToggle} className={`${styles.historyRow} ${isExpanded ? styles.expanded : ''}`}>
        <div className={styles.historyInfo}>
          <div className={styles.historyIcon}>{statusInfo.icon}</div>
          <div className={styles.historyDetails}>
            <p>{assetName}</p>
            <p>{new Date(analysis.created_at).toLocaleString()}</p>
          </div>
        </div>
        <div className={styles.statusContainer}>
          <span className={`${styles.statusChip} ${statusInfo.chipClass}`}>{statusInfo.text}</span>
          {analysis.status === 'complete' && (
            <span className={`${styles.statusChip} ${styles.strategyChip}`}>{strategy}</span>
          )}
          <span className={`${styles.chevronIcon} ${isExpanded ? styles.chevronExpanded : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </span>
        </div>
      </button>
      
      {isExpanded && (
        <div className={styles.detailsPanel}>
            <div className={styles.detailsGrid}>
                <div className={styles.userSubmission}>
                    {analysis.notes && (
                        <div className={styles.notesSection}>
                            <h4>Tu Tesis de Trading</h4>
                            <p>{analysis.notes}</p>
                        </div>
                    )}
                    <div className={styles.imageSection}>
                        <h4>Gráfico Analizado</h4>
                        {/* --- CORRECCIÓN AQUÍ --- */}
                        <Image 
                          src={encodeURI(imageUrl.publicUrl)} // Envolvemos la URL en encodeURI()
                          alt={`Análisis de ${assetName}`} 
                          width={500} 
                          height={300} 
                          className={styles.historyImage} 
                        />
                    </div>
                </div>
                <div className={styles.aiResult}>
                    {analysis.status === 'complete' && analysis.final_recommendation ? (
                        <AnalysisResult recommendation={analysis.final_recommendation} />
                    ) : (
                        <p style={{textAlign: 'center', color: 'var(--text-secondary)'}}>
                            {analysis.status === 'failed' ? 'Este análisis no se pudo completar.' : 'Los detalles completos aparecerán aquí una vez que el análisis finalice.'}
                        </p>
                    )}
                </div>
            </div>
        </div>
      )}
    </li>
  );
};

// --- Componente Principal de la Página de Historial ---
export default function HistoryPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const [history, setHistory] = useState<AnalysisRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAnalysisId, setExpandedAnalysisId] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from('analysis_requests')
          .select('id, status, created_at, notes, image_path, analysis_result, final_recommendation')
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error al obtener el historial:", error);
        } else {
          setHistory(data as AnalysisRequest[]);
        }
      }
      setLoading(false);
    };
    fetchHistory();
  }, [supabase]);

  const handleToggleAnalysis = (analysisId: string) => {
    setExpandedAnalysisId(prevId => (prevId === analysisId ? null : analysisId));
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Mi Historial</h1>
        <p className={styles.headerSubtitle}>Revisa, aprende y mejora con cada análisis pasado.</p>
      </header>

      <ul className={styles.historyList}>
        {loading ? (
          <p>Cargando historial...</p>
        ) : history.length > 0 ? (
          history.map(analysis => (
            <HistoryRow 
              key={analysis.id} 
              analysis={analysis}
              isExpanded={expandedAnalysisId === analysis.id}
              onToggle={() => handleToggleAnalysis(analysis.id)}
              supabase={supabase}
            />
          ))
        ) : (
          <div className={styles.emptyState}>
            <p>Aún no has realizado ningún análisis.</p>
            <Link href="/dashboard" className={styles.emptyStateButton}>Empezar mi Primer Análisis</Link>
          </div>
        )}
      </ul>
    </div>
  );
}

