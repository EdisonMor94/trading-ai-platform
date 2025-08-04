'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

// --- Interfaces para los Datos ---
interface Analysis {
  id: string;
  status: string;
  error_message: string | null;
  final_recommendation: FinalRecommendation | null;
}
interface FinalRecommendation {
  resumen_analitico?: any;
  indice_confianza?: any;
  recomendacion_estrategica?: any;
}
interface Stats {
  total: number;
  completed: number;
  inProcess: number;
}

// --- Componentes de la Interfaz ---

const StatCard = ({ title, value, icon }: { title: string, value: number, icon: React.ReactNode }) => (
  <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl flex items-center justify-between">
    <div>
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
    <div className="bg-gray-700 p-3 rounded-lg">
      {icon}
    </div>
  </div>
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
    <div className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
      <h2 className="text-2xl font-semibold text-white mb-4">Procesando tu Análisis</h2>
      <ul className="space-y-3">
        {steps.map(step => (
          <li key={step.id} className="flex items-center text-gray-300 text-lg">
            <span className="mr-4 text-2xl">{getStepStatus(step.id)}</span>
            {step.text}
          </li>
        ))}
      </ul>
    </div>
  );
};

const AnalysisResult = ({ recommendation }: { recommendation: FinalRecommendation }) => {
  const resumen_analitico = recommendation?.resumen_analitico;
  const indice_confianza = recommendation?.indice_confianza;
  const recomendacion_estrategica = recommendation?.recomendacion_estrategica;

  if (!resumen_analitico || !indice_confianza || !recomendacion_estrategica) {
    return (
      <div className="mt-8 p-6 bg-yellow-900 bg-opacity-30 border border-yellow-500 rounded-lg">
        <h3 className="text-2xl font-semibold text-yellow-400 mb-4">Respuesta Incompleta de la IA</h3>
        <p className="text-yellow-300">La IA devolvió una respuesta parcial o en un formato inesperado. Por favor, intenta el análisis de nuevo.</p>
      </div>
    )
  }

  const getStrategyClass = (strategy: string) => {
    switch (strategy) {
      case 'COMPRAR': return 'text-green-400';
      case 'VENDER': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  return (
    <div className="mt-8 p-6 bg-gray-800 border border-gray-700 rounded-lg space-y-6">
      <h3 className="text-3xl font-bold text-white border-b border-gray-600 pb-4">Resultado del Análisis</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 p-4 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-400 mb-2">Estrategia Recomendada</h4>
          <p className={`text-4xl font-bold ${getStrategyClass(recomendacion_estrategica.estrategia)}`}>
            {recomendacion_estrategica.estrategia || 'N/A'}
          </p>
          <p className="text-gray-400 mt-2">{recomendacion_estrategica.justificacion_estrategia}</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-400 mb-2">Índice de Confianza</h4>
          <p className="text-4xl font-bold text-white">{indice_confianza.puntuacion || 'N/A'} / 100</p>
          <p className="text-gray-400 mt-2">{indice_confianza.justificacion}</p>
        </div>
      </div>

      {recomendacion_estrategica.estrategia !== 'ESPERAR' && (
        <div className="bg-gray-900 p-4 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-400 mb-3">Plan de Trading Sugerido</h4>
          <div className="flex justify-around text-center">
            <div>
              <p className="text-sm text-gray-500">Entrada</p>
              <p className="text-xl font-semibold">{recomendacion_estrategica.plan_de_trading?.entrada_sugerida || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Stop Loss</p>
              <p className="text-xl font-semibold text-red-500">{recomendacion_estrategica.plan_de_trading?.stop_loss || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Take Profit</p>
              <p className="text-xl font-semibold text-green-500">{recomendacion_estrategica.plan_de_trading?.take_profit || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-900 p-4 rounded-lg">
        <h4 className="text-lg font-semibold text-gray-400 mb-2">Resumen Analítico</h4>
        <p className="text-gray-300 mb-4"><strong className="text-white">Análisis Fundamental:</strong> {resumen_analitico.analisis_fundamental}</p>
        <div className="space-y-2">
          <div>
            <h5 className="font-semibold text-green-400">Puntos de Confluencia:</h5>
            <ul className="list-disc list-inside text-gray-300">
              {resumen_analitico.puntos_confluencia?.map((point, i) => <li key={i}>{point}</li>)}
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-red-400">Puntos de Divergencia:</h5>
            <ul className="list-disc list-inside text-gray-300">
              {resumen_analitico.puntos_divergencia?.map((point, i) => <li key={i}>{point}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Componente Principal del Dashboard ---
export default function Dashboard() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const [user, setUser] = useState<User | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [currentAnalysis, setCurrentAnalysis] = useState<Analysis | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, inProcess: 0 });

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data, error } = await supabase.from('analysis_requests').select('status');
        if (error) {
          console.error("Error fetching stats:", error);
          return;
        }
        const total = data.length;
        const completed = data.filter(item => item.status === 'complete').length;
        const inProcess = data.filter(item => item.status !== 'complete' && item.status !== 'failed').length;
        setStats({ total, completed, inProcess });
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!currentAnalysis?.id) return;
    const channel = supabase.channel(`analysis-updates-${currentAnalysis.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'analysis_requests', filter: `id=eq.${currentAnalysis.id}` },
        (payload) => {
          const updatedAnalysis = payload.new as Analysis;
          setCurrentAnalysis(updatedAnalysis);
          if (updatedAnalysis.status === 'complete' || updatedAnalysis.status === 'failed') {
            channel.unsubscribe();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentAnalysis?.id, supabase]);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

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
    if (!file || !user) { alert('Por favor, selecciona un archivo.'); return; }
    setCurrentAnalysis({ id: '', status: 'pending', error_message: null, final_recommendation: null });
    const fileName = `${user.id}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage.from('analysis-images').upload(fileName, file);
    if (uploadError) { setCurrentAnalysis({ id: '', status: 'failed', error_message: `Error al subir la imagen: ${uploadError.message}`, final_recommendation: null }); return; }
    const { data: requestRecord, error: insertError } = await supabase.from('analysis_requests').insert({ user_id: user.id, image_path: uploadData.path, status: 'pending', notes: notes }).select().single();
    if (insertError) { setCurrentAnalysis({ id: '', status: 'failed', error_message: `Error al crear la solicitud: ${insertError.message}`, final_recommendation: null }); return; }
    setCurrentAnalysis(requestRecord);
  };

  const startNewAnalysis = () => {
    setCurrentAnalysis(null);
    setFile(null);
    setImagePreview(null);
    setNotes('');
  };

  return (
    <div className="w-full">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Dashboard</h1>
          {user && <p className="text-gray-400 mt-1">Bienvenido, {user.email}</p>}
        </div>
        <button 
          onClick={handleLogout}
          className="bg-gray-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          Cerrar Sesión
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Análisis" value={stats.total} icon={<svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>} />
        <StatCard title="Completados" value={stats.completed} icon={<svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>} />
        <StatCard title="En Proceso" value={stats.inProcess} icon={<svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>} />
      </div>

      {!currentAnalysis ? (
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-green-500 p-2 rounded-full">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Nuevo Análisis</h2>
              <p className="text-gray-400">Sube una imagen de tu gráfico para obtener un análisis con IA</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-900/50 border-2 border-dashed border-gray-600 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:border-purple-500 transition-colors">
              {imagePreview ? ( <img src={imagePreview} alt="Vista previa del análisis" className="mx-auto max-h-40 rounded-md" /> ) : ( <>
                  <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-4-4V7a4 4 0 014-4h10a4 4 0 014 4v5a4 4 0 01-4 4H7z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 11v6m0 0l-3-3m3 3l3-3"></path></svg>
                  <span className="mt-4 font-semibold text-white">Arrastra tu imagen o haz clic</span>
                  <span className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP hasta 5MB</span>
                </>
              )}
              <input id="file-upload" type="file" className="sr-only" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
            </label>
            <button 
              onClick={handleUploadAndAnalyze} 
              disabled={!file} 
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-lg transition-all hover:from-purple-700 hover:to-pink-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              Analizar Gráfico
            </button>
          </div>
        </div>
      ) : (
        <div>
          <AnalysisChecklist status={currentAnalysis.status} />
          {currentAnalysis.status === 'complete' && currentAnalysis.final_recommendation && (
            <AnalysisResult recommendation={currentAnalysis.final_recommendation} />
          )}
          {currentAnalysis.status === 'failed' && (
            <div className="mt-8 p-6 bg-red-900 bg-opacity-30 border border-red-500 rounded-lg">
              <h3 className="text-2xl font-semibold text-red-400 mb-4">Ocurrió un Error</h3>
              <p className="text-red-300">{currentAnalysis.error_message}</p>
            </div>
          )}
          {(currentAnalysis.status === 'complete' || currentAnalysis.status === 'failed') && (
            <button onClick={startNewAnalysis} className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg">
              Realizar un Nuevo Análisis
            </button>
          )}
        </div>
      )}
    </div>
  )
}