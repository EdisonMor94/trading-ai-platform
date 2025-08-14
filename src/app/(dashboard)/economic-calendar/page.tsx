'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState, useMemo, useCallback, Fragment, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../UserContext';
import UpgradePrompt from '../components/UpgradePrompt';
import styles from './economic-calendar.module.css';

// --- Interfaces y Datos ---
interface EconomicEvent {
  date: string;
  country: string;
  currency: string;
  event: string;
  impact: 'High' | 'Medium' | 'Low';
  actual: number | string | null;
  estimate: number | string | null;
  previous: number | string | null;
  event_description?: string; // <-- 1. AÑADIDO: Se añade la nueva propiedad
}
interface AIAnalysis {
  professional_description: string;
  historical_analysis: string;
  forecast_scenarios: {
    scenario: string;
    recommendation: string;
  }[];
}
const regions = {
  all: { name: 'Todas las Regiones', countries: [] },
  g7: { name: 'G7', countries: ['US', 'CA', 'JP', 'GB', 'DE', 'FR', 'IT'] },
  eurozone: { name: 'Zona Euro', countries: ['EZ', 'DE', 'FR', 'IT', 'ES'] },
  north_america: { name: 'Norteamérica', countries: ['US', 'CA', 'MX'] },
  asia_pacific: { name: 'Asia-Pacífico', countries: ['JP', 'CN', 'AU', 'NZ'] },
};

// --- Tipos para el nuevo filtro de fecha ---
type DateFilter = 'today' | 'tomorrow' | 'thisWeek';


// --- Componentes Internos ---
const CountdownTimer = ({ eventDate }: { eventDate: string }) => {
    const calculateTimeLeft = useCallback(() => {
        const difference = +new Date(eventDate) - +new Date();
        let timeLeft: {h?: number, m?: number, s?: number} = {};
        if (difference > 0) {
            timeLeft = { 
                h: Math.floor((difference / (1000 * 60 * 60))), 
                m: Math.floor((difference / 1000 / 60) % 60), 
                s: Math.floor((difference / 1000) % 60) 
            };
        }
        return timeLeft;
    }, [eventDate]);

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => { setTimeLeft(calculateTimeLeft()); }, 1000);
        return () => clearTimeout(timer);
    });

    return (
        <span className={styles.countdown}>
            {timeLeft.h > 0 && `${timeLeft.h}h `}
            {timeLeft.m > 0 && `${timeLeft.m}m `}
            {timeLeft.s > 0 && `${timeLeft.s}s`}
        </span>
    );
};

const EventRow = ({ event, onToggle, isExpanded }: { event: EconomicEvent, onToggle: () => void, isExpanded: boolean }) => {
  const isToday = new Date(event.date).toDateString() === new Date().toDateString();
  const isFuture = new Date(event.date) > new Date();

  return (
    <tr className={`${styles.eventRow} ${styles.clickableRow} ${isExpanded ? styles.expandedRow : ''}`} onClick={onToggle}>
      <td className={styles.timeCell}>
        {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        {isToday && isFuture && <CountdownTimer eventDate={event.date} />}
      </td>
      <td className={styles.currencyCell}>{event.currency}</td>
      {/* --- 2. INICIO DE LA MODIFICACIÓN --- */}
      <td className={styles.eventCell}>
        <div>{event.event}</div>
        {event.event_description && (
            <p className={styles.eventDescription}>{event.event_description}</p>
        )}
      </td>
      {/* --- FIN DE LA MODIFICACIÓN --- */}
      <td>
        <span className={styles[event.impact.toLowerCase()]}>{event.impact}</span>
      </td>
      <td className={styles.dataCell}>{event.actual}</td>
      <td className={styles.dataCell}>{event.estimate}</td>
      <td className={styles.dataCell}>{event.previous}</td>
    </tr>
  );
};

const AIAnalysisDisplay = ({ analysis }: { analysis: AIAnalysis }) => (
    <div className={styles.aiAnalysisContainer}>
        <div>
            <h4 className={styles.aiTitle}>Descripción Profesional</h4>
            <p className={styles.aiText}>{analysis.professional_description}</p>
        </div>
        <div>
            <h4 className={styles.aiTitle}>Análisis Histórico</h4>
            <p className={styles.aiText}>{analysis.historical_analysis}</p>
        </div>
        <div>
            <h4 className={styles.aiTitle}>Escenarios de Trading</h4>
            <div className={styles.scenariosGrid}>
                {Array.isArray(analysis.forecast_scenarios) && analysis.forecast_scenarios.map(item => (
                    <div key={item.scenario} className={styles.scenarioCard}>
                        <h5 className={styles.scenarioTitle}>{item.scenario}</h5>
                        <p className={styles.scenarioText}>{item.recommendation}</p>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const EventAnalysisContainer = ({ event, supabase, canUseEventAnalysis }: { event: EconomicEvent, supabase: any, canUseEventAnalysis: boolean }) => {
    const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showUpgrade, setShowUpgrade] = useState(false);

    const handleAnalysisClick = async () => {
        if (!canUseEventAnalysis) {
            setShowUpgrade(true);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: invokeError } = await supabase.functions.invoke('get-event-analysis', { 
                body: { 
                    eventName: event.event, 
                    currency: event.currency, 
                    date: event.date, 
                    estimate: event.estimate, 
                    previous: event.previous 
                } 
            });
            
            if (invokeError) {
                throw invokeError;
            }

            const isValidAnalysis = data && 
                                    typeof data.professional_description === 'string' && 
                                    data.professional_description.trim() !== '' &&
                                    Array.isArray(data.forecast_scenarios);

            if (isValidAnalysis) {
                setAnalysis(data);
            } else {
                throw new Error("Respuesta de la IA inválida.");
            }

        } catch (err: any) {
            console.error('Error detallado al generar análisis (solo visible para desarrolladores):', err);
            setError('No se pudo generar el análisis en este momento. Por favor, inténtelo de nuevo más tarde.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <tr className={styles.detailsRow}>
            <td colSpan={7} className={styles.detailsCell}>
                <div className={styles.detailsContentWrapper}>
                    {showUpgrade ? (
                        <UpgradePrompt featureName="Análisis de Eventos con IA" />
                    ) : analysis ? (
                        <AIAnalysisDisplay analysis={analysis} />
                    ) : isLoading ? (
                        <div className={styles.spinner}></div>
                    ) : error ? (
                        <div className={styles.analysisError}>{error}</div>
                    ) : (
                        <button onClick={handleAnalysisClick} className={styles.analyzeButton}>Analizar con IA</button>
                    )}
                </div>
            </td>
        </tr>
    );
};


// --- Componente Principal de la Página ---
export default function EconomicCalendarPage() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { profile, permissions, loading: userLoading } = useUser();
  
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  
  const [impactFilter, setImpactFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (userLoading) return;

    setLoading(true);
    setExpandedEventId(null);

    const fetchInitialData = async () => {
      try {
        if (profile?.calendar_preferences) {
          setImpactFilter(profile.calendar_preferences.impact || 'all');
          setCurrencyFilter(profile.calendar_preferences.currency || '');
          setRegionFilter(profile.calendar_preferences.region || 'all');
        }

        const { data: calendarData, error: calendarError } = await supabase.functions.invoke('get-economic-calendar', {
          body: { dateRange: dateFilter }
        });

        if (calendarError) throw calendarError;
        
        // --- MANEJO DE ERRORES / DEBUGGING ---
        // Imprime en la consola del navegador los datos recibidos para verificar si 'event_description' está llegando.
        console.log("Datos recibidos del calendario:", calendarData);

        setEvents(calendarData || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [userLoading, profile?.id, dateFilter]);

  useEffect(() => {
    if (isInitialMount.current || loading) {
      isInitialMount.current = false;
      return;
    }

    const handler = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const preferences = { impact: impactFilter, currency: currencyFilter, region: regionFilter };
      await supabase.from('profiles').update({ calendar_preferences: preferences }).eq('id', user.id);
    }, 1000);

    return () => clearTimeout(handler);
  }, [impactFilter, currencyFilter, regionFilter, supabase, loading]);

  const filteredAndGroupedEvents = useMemo(() => {
    const filtered = events.filter(event => {
      const impactMatch = impactFilter === 'all' || event.impact.toLowerCase() === impactFilter.toLowerCase();
      const currencyMatch = currencyFilter === '' || event.currency.toLowerCase().includes(currencyFilter.toLowerCase());
      const regionMatch = regionFilter === 'all' || regions[regionFilter as keyof typeof regions].countries.includes(event.country);
      return impactMatch && currencyMatch && regionMatch;
    });
    return filtered.reduce((acc, event) => {
      const date = new Date(event.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      if (!acc[date]) acc[date] = [];
      acc[date].push(event);
      return acc;
    }, {} as Record<string, EconomicEvent[]>);
  }, [events, impactFilter, currencyFilter, regionFilter]);

  const handleToggleRow = (eventId: string) => {
    setExpandedEventId(prevId => (prevId === eventId ? null : eventId));
  };

  if (userLoading) {
    return <p>Cargando calendario...</p>;
  }
  
  if (error) return <div className={styles.errorState}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Calendario Económico</h1>
        <p className={styles.headerSubtitle}>Anticípate a la volatilidad con los eventos más importantes de la semana.</p>
      </header>
      
      <div className={styles.dateFilterContainer}>
        <button 
          onClick={() => setDateFilter('today')} 
          className={`${styles.dateFilterButton} ${dateFilter === 'today' ? styles.active : ''}`}>
          Hoy
        </button>
        <button 
          onClick={() => setDateFilter('tomorrow')} 
          className={`${styles.dateFilterButton} ${dateFilter === 'tomorrow' ? styles.active : ''}`}>
          Mañana
        </button>
        <button 
          onClick={() => setDateFilter('thisWeek')} 
          className={`${styles.dateFilterButton} ${dateFilter === 'thisWeek' ? styles.active : ''}`}>
          Esta Semana
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}><label htmlFor="region-filter">Filtrar por Región</label><select id="region-filter" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>{Object.entries(regions).map(([key, value]) => (<option key={key} value={key}>{value.name}</option>))}</select></div>
        <div className={styles.filterGroup}><label htmlFor="currency-filter">Filtrar por Divisa</label><input id="currency-filter" type="text" placeholder="Ej: USD, EUR..." value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)} /></div>
        <div className={styles.filterGroup}><label htmlFor="impact-filter">Filtrar por Impacto</label><select id="impact-filter" value={impactFilter} onChange={(e) => setImpactFilter(e.target.value)}><option value="all">Todos</option><option value="High">Alto</option><option value="Medium">Medio</option><option value="Low">Bajo</option></select></div>
      </div>
      
      <div className={styles.calendar}>
        {loading ? <div className={styles.spinner}></div> : Object.keys(filteredAndGroupedEvents).length > 0 ? (
            Object.entries(filteredAndGroupedEvents).map(([date, eventsInDay]) => (
              <div key={date} className={styles.dayGroup}>
                <h2 className={styles.dateHeader}>{date.charAt(0).toUpperCase() + date.slice(1)}</h2>
                <table className={styles.eventsTable}>
                  <thead><tr><th>Hora</th><th>Divisa</th><th>Evento</th><th>Impacto</th><th>Actual</th><th>Previsión</th><th>Previo</th></tr></thead>
                  <tbody>
                    {eventsInDay.flatMap((event, index) => {
                      const eventId = `${event.date}-${event.event}-${index}`; 
                      const isExpanded = expandedEventId === eventId;
                      const canUseAI = permissions.canUseEventAnalysis;
                      const rows = [<EventRow key={eventId} event={event} onToggle={() => handleToggleRow(eventId)} isExpanded={isExpanded}/>];
                      if (isExpanded) {
                        rows.push(<EventAnalysisContainer key={`${eventId}-analysis`} event={event} supabase={supabase} canUseEventAnalysis={canUseAI} />);
                      }
                      return rows;
                    })}
                  </tbody>
                </table>
              </div>
            ))
        ) : ( <div className={styles.emptyState}>No se encontraron eventos con los filtros seleccionados.</div> )}
      </div>
    </div>
  );
}





