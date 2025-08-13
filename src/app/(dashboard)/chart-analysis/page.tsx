'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
// CORRECCIÓN: Importamos el nuevo archivo CSS
import styles from './chart-analysis.module.css'

// --- INTERFACES DE DATOS ---
interface Profile {
  id: string;
  analysis_credits: number;
  subscription_plan: string | null;
  subscription_status: string | null;
}

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

interface Analysis {
  id: string;
  status: string;
  error_message: string | null;
  final_recommendation: FinalRecommendation | null;
}

// --- Componentes (los mismos que tenías antes) ---
const UploadArea = ({ onFileChange, imagePreview }: { onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void; imagePreview: string | null }) => (
    <label htmlFor="file-upload" className={styles.uploadArea}>
      {imagePreview ? (
        <img src={imagePreview} alt="Vista previa del análisis" style={{ maxHeight: '10rem', borderRadius: '0.5rem', margin: 'auto' }} />
      ) : (
        <>
          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 16a4 4 0 01-4-4V7a4 4 0 014-4h10a4 4 0 014 4v5a4 4 0 01-4 4H7z"></path><path d="M12 11v6m0 0l-3-3m3 3l3-3"></path></svg>
          <p>Arrastra tu imagen aquí o haz clic para</p>
          <span className={styles.customUploadButton}>
            Seleccionar Archivo
          </span>
          <span className={styles.fileTypeHint}>JPG, PNG, WEBP hasta 5MB</span>
        </>
      )}
      <input id="file-upload" type="file" accept="image/png, image/jpeg, image/webp" onChange={onFileChange} style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: 0 }}/>
    </label>
  );

const AnalysisChecklist = ({ status }: { status: string }) => {
  const steps = [
    { id: 'analyzing', text: 'Validando e interpretando imagen...' },
    { id: 'enriching', text: 'Consultando datos de mercado...' },
    { id: 'generating', text: 'Generando recomendación final...' },
    { id: 'complete', text: 'Análisis completado.' },
  ];
  const getStepStatus = (stepId: string) => {
    if (status === 'complete') return '✅';
    if (status === 'failed') return '⚠️';
    const stepOrder = ['pending', 'analyzing', 'enriching', 'generating'];
    const stepIndex = stepOrder.indexOf(stepId);
    const currentStatusIndex = stepOrder.indexOf(status);
    if (stepIndex < currentStatusIndex) return '✅';
    if (stepIndex === currentStatusIndex || (status === 'pending' && stepIndex === 0)) return '🔵';
    return '⚪️';
  };
  return (
    <div className={styles.newAnalysisContainer}>
      <h2 className={styles.newAnalysisTitle}>Procesando tu Análisis</h2>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: '1.5rem' }}>
        {steps.map(step => (
          <li key={step.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', color: '#d1d5db' }}>
            <span style={{ marginRight: '1rem', fontSize: '1.5rem' }}>{getStepStatus(step.id)}</span>
            {step.text}
          </li>
        ))}
      </ul>
    </div>
  );
};

const AnalysisResult = ({ recommendation }: { recommendation: FinalRecommendation }) => {
    const { resumen_analitico, indice_confianza, recomendacion_estrategica } = recommendation;
    if (!resumen_analitico || !indice_confianza || !recomendacion_estrategica) {
        return (
          <div className={styles.newAnalysisContainer} style={{ marginTop: '2rem', borderColor: '#f59e0b' }}>
            <h3 className={styles.newAnalysisTitle} style={{ color: '#f59e0b' }}>Respuesta Incompleta de la IA</h3>
            <p style={{ color: '#fcd34d' }}>La IA devolvió una respuesta parcial o en un formato inesperado. Por favor, intenta el análisis de nuevo.</p>
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
          <h3 className={styles.resultHeader}>Resultado del Análisis</h3>
          <div className={styles.resultGrid}>
            <div className={styles.resultCard}>
              <h4 className={styles.resultCardTitle}>Estrategia Recomendada</h4>
              <p className={`${styles.resultStrategy} ${getStrategyClass(recomendacion_estrategica.estrategia)}`}>{recomendacion_estrategica.estrategia}</p>
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
                <div className={styles.tradingPlanItem}><p>Entrada</p><p>{recomendacion_estrategica.plan_de_trading?.entrada_sugerida || 'N/A'}</p></div>
                <div className={styles.tradingPlanItem}><p>Stop Loss</p><p style={{ color: '#f87171' }}>{recomendacion_estrategica.plan_de_trading?.stop_loss || 'N/A'}</p></div>
                <div className={styles.tradingPlanItem}><p>Take Profit</p><p style={{ color: '#4ade80' }}>{recomendacion_estrategica.plan_de_trading?.take_profit || 'N/A'}</p></div>
              </div>
            </div>
          )}
          <div className={styles.resultCard}>
            <h4 className={styles.resultCardTitle}>Resumen Analítico</h4>
            <p className={styles.resultJustification}><strong style={{ color: 'white' }}>Análisis Fundamental:</strong> {resumen_analitico.analisis_fundamental}</p>
            <div style={{ marginTop: '1rem' }}><h5 style={{ fontWeight: 600, color: '#4ade80' }}>Puntos de Confluencia:</h5><ul className={styles.confluenceList}>{resumen_analitico.puntos_confluencia?.map((point, i) => <li key={i}>{point}</li>)}</ul></div>
            <div style={{ marginTop: '1rem' }}><h5 style={{ fontWeight: 600, color: '#f87171' }}>Puntos de Divergencia:</h5><ul className={styles.divergenceList}>{resumen_analitico.puntos_divergencia?.map((point, i) => <li key={i}>{point}</li>)}</ul></div>
          </div>
        </div>
    );
};

const AnalysisNotes = ({ notes, setNotes }: { notes: string, setNotes: (notes: string) => void }) => {
    const examples = [
        'Ej: Creo que el EUR/USD va a subir por un patrón de doble suelo...',
        'Ej: Busco una venta en el Oro (XAU/USD) por una divergencia bajista...',
        'Ej: No estoy seguro de esta bandera alcista en el BTC/USD, el volumen es bajo...'
    ];
    const [placeholder, setPlaceholder] = useState(examples[0]);
    useEffect(() => {
        if (notes) return;
        let currentIndex = 0;
        const interval = setInterval(() => {
            currentIndex = (currentIndex + 1) % examples.length;
            setPlaceholder(examples[currentIndex]);
        }, 4000);
        return () => clearInterval(interval);
    }, [notes]);
    return (
        <div className={styles.notesContainer}>
            <label htmlFor="analysis-notes" className={styles.notesLabel}>2. Describe tu Tesis de Trading (Opcional, pero recomendado)</label>
            <p className={styles.notesSubtitle}>Cuanto más contexto nos des, más preciso será el análisis de la IA.</p>
            <textarea id="analysis-notes" className={styles.notesTextarea} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={placeholder} rows={4}/>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
export default function ChartAnalysisPage() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [currentAnalysis, setCurrentAnalysis] = useState<Analysis | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: profileData } = await supabase.from('profiles').select('*').single();
        setProfile(profileData);
      }
    };
    fetchInitialData();
  }, [supabase]);

  useEffect(() => {
    if (!user || !currentAnalysis?.id) return;
    const channel = supabase.channel('analysis_requests_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'analysis_requests', filter: `id=eq.${currentAnalysis.id}` },
        (payload) => {
          setCurrentAnalysis(payload.new as Analysis);
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, supabase, currentAnalysis]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => { setImagePreview(reader.result as string); };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!file || !user || !profile) return;
    if (profile.analysis_credits <= 0) {
      alert("Has agotado tus créditos. Por favor, suscríbete para obtener más.");
      return;
    }
    setCurrentAnalysis({ id: '', status: 'pending', error_message: null, final_recommendation: null });
    const fileName = `${user.id}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage.from('analysis-images').upload(fileName, file);
    if (uploadError) {
      setCurrentAnalysis({ id: '', status: 'failed', error_message: `Error al subir la imagen: ${uploadError.message}`, final_recommendation: null });
      return;
    }
    const { data: requestRecord, error: insertError } = await supabase.from('analysis_requests').insert({ user_id: user.id, image_path: uploadData.path, status: 'pending', notes: notes }).select().single();
    if (insertError) {
      setCurrentAnalysis({ id: '', status: 'failed', error_message: `Error al crear la solicitud: ${insertError.message}`, final_recommendation: null });
      return;
    }
    setCurrentAnalysis(requestRecord);
  };

  const startNewAnalysis = () => {
    setCurrentAnalysis(null); setFile(null); setImagePreview(null); setNotes('');
  };

  const noCredits = profile?.analysis_credits !== undefined && profile.analysis_credits <= 0;

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Análisis de Gráfico con IA</h1>
          <p className={styles.pageSubtitle}>Sube una imagen de tu análisis técnico para recibir un feedback detallado y una estrategia accionable.</p>
        </div>
      </div>

      {!currentAnalysis ? (
        <div className={styles.newAnalysisContainer}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label className={styles.notesLabel}>1. Sube una Imagen de tu Gráfico</label>
              <UploadArea onFileChange={handleFileChange} imagePreview={imagePreview} />
            </div>
            <AnalysisNotes notes={notes} setNotes={setNotes} />
            <div className={styles.buttonWrapper}>
              <button onClick={handleUploadAndAnalyze} disabled={!file || noCredits} className={styles.analyzeButton}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                Analizar Gráfico ({profile?.analysis_credits || 0} créditos restantes)
              </button>
              {noCredits && <span className={styles.tooltip}>No tienes créditos. <Link href="/pricing">Suscríbete</Link>.</span>}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <AnalysisChecklist status={currentAnalysis.status} />
          {currentAnalysis.status === 'complete' && currentAnalysis.final_recommendation && (
            <AnalysisResult recommendation={currentAnalysis.final_recommendation} />
          )}
          {currentAnalysis.status === 'failed' && (
            <div className={styles.newAnalysisContainer} style={{ marginTop: '2rem', borderColor: '#F44336' }}>
              <h3 className={styles.newAnalysisTitle} style={{ color: '#F44336' }}>Ocurrió un Error</h3>
              <p style={{ color: '#f87171' }}>{currentAnalysis.error_message}</p>
            </div>
          )}
          {(currentAnalysis.status === 'complete' || currentAnalysis.status === 'failed') && (
            <button onClick={startNewAnalysis} className={styles.analyzeButton} style={{ background: '#2563eb', marginTop: '2rem' }}>
              Realizar un Nuevo Análisis
            </button>
          )}
        </div>
      )}
    </>
  )
}
