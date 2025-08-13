'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useUser } from '../UserContext';
import Link from 'next/link';
import styles from './dashboard.module.css';

// --- Interfaces para los datos de los widgets ---
interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
}
interface UpcomingEvent {
  date: string;
  currency: string;
  event: string;
  impact: 'High' | 'Medium' | 'Low';
}

// --- Iconos ---
const ClockIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const SparkleIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2z"/></svg>;
const StarIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const ChartIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>;
const EditIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;


// --- Componentes de Widgets Dinámicos ---
const AIBriefingWidget = ({ briefing, loading }: { briefing: string | null, loading: boolean }) => (
     <div className={styles.widgetCard}>
        <div className={styles.widgetHeader}>
            <SparkleIcon />
            <h3>Resumen del Mercado con IA</h3>
        </div>
        {loading ? <div className={styles.skeletonText}></div> : <p className={styles.widgetText}>{briefing || "No se pudo cargar el resumen del día."}</p>}
    </div>
);

const UpcomingEventsWidget = ({ events, loading }: { events: UpcomingEvent[], loading: boolean }) => (
    <div className={styles.widgetCard}>
        <div className={styles.widgetHeader}>
            <ClockIcon />
            <h3>Próximos Eventos Clave</h3>
        </div>
        {loading ? <div className={styles.skeletonList}></div> : (
            <ul className={styles.widgetList}>
                {events.length > 0 ? events.map(event => (
                    <li key={event.event + event.date}>
                        <span className={styles.eventTime}>{new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className={styles.eventCurrency}>{event.currency}</span>
                        <span className={styles.eventName}>{event.event}</span>
                        <span className={`${styles.impactChip} ${styles[event.impact.toLowerCase()]}`}>{event.impact}</span>
                    </li>
                )) : <p className={styles.widgetText}>No hay eventos de alto impacto próximos.</p>}
            </ul>
        )}
        <Link href="/economic-calendar" className={styles.widgetLink}>Ver calendario completo →</Link>
    </div>
);

const MarketPulseWidget = ({ watchlist, loading, onEdit }: { watchlist: WatchlistItem[], loading: boolean, onEdit: () => void }) => (
    <div className={styles.widgetCard}>
        <div className={styles.widgetHeader}>
            <StarIcon />
            <h3>Mi Lista de Seguimiento</h3>
            <button onClick={onEdit} className={styles.editButton}><EditIcon /></button>
        </div>
        {loading ? <div className={styles.skeletonList}></div> : (
            <ul className={styles.widgetList}>
                {watchlist.map(item => (
                    <li key={item.symbol}>
                        <span className={styles.assetName}>{item.name || item.symbol}</span>
                        <span className={styles.assetPrice}>{item.price.toFixed(2)}</span>
                        <span className={`${styles.assetChange} ${item.changesPercentage >= 0 ? styles.positive : styles.negative}`}>
                            {item.changesPercentage >= 0 ? '+' : ''}{item.changesPercentage.toFixed(2)}%
                        </span>
                    </li>
                ))}
            </ul>
        )}
        <Link href="/market-pulse" className={styles.widgetLink}>Ir al Pulso de Mercado →</Link>
    </div>
);

const ChartAnalysisCTA = () => (
    <div className={styles.ctaCard}>
        <div className={styles.ctaIcon}><ChartIcon /></div>
        <div className={styles.ctaContent}>
            <h3>¿Tienes una nueva idea de trading?</h3>
            <p>Sube una captura de tu gráfico para obtener un análisis detallado con IA y opera con mayor confianza.</p>
        </div>
        <Link href="/chart-analysis" className={styles.ctaButton}>Iniciar Nuevo Análisis</Link>
    </div>
);

// --- NUEVO: Modal para editar la Watchlist ---
const EditWatchlistModal = ({ isOpen, onClose, currentWatchlist, onSave }: { isOpen: boolean, onClose: () => void, currentWatchlist: string[], onSave: (newWatchlist: string[]) => void }) => {
    const [assets, setAssets] = useState(['', '', '']);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (currentWatchlist) {
            setAssets([...currentWatchlist, '', ''].slice(0, 3));
        }
    }, [currentWatchlist]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        const finalAssets = assets.map(a => a.toUpperCase().trim()).filter(Boolean);
        await onSave(finalAssets);
        setIsSaving(false);
        onClose();
    };
    
    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h3>Editar Lista de Seguimiento</h3>
                <p>Introduce los símbolos de los 3 activos que quieres monitorear (ej: EURUSD, TSLA, BTCUSD).</p>
                <div className={styles.modalInputs}>
                    <input type="text" value={assets[0]} onChange={e => setAssets([e.target.value, assets[1], assets[2]])} placeholder="Activo 1"/>
                    <input type="text" value={assets[1]} onChange={e => setAssets([assets[0], e.target.value, assets[2]])} placeholder="Activo 2"/>
                    <input type="text" value={assets[2]} onChange={e => setAssets([assets[0], assets[1], e.target.value])} placeholder="Activo 3"/>
                </div>
                <div className={styles.modalActions}>
                    <button onClick={onClose} className={styles.modalButtonSecondary}>Cancelar</button>
                    <button onClick={handleSave} className={styles.modalButtonPrimary} disabled={isSaving}>
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Componente Principal del Dashboard ---
export default function DashboardPage() {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { profile, loading: userLoading, refreshProfile } = useUser();
    
    const [dailyBriefing, setDailyBriefing] = useState<string | null>(null);
    const [briefingLoading, setBriefingLoading] = useState(true);
    const [widgetsData, setWidgetsData] = useState<{ watchlistData: WatchlistItem[], upcomingEvents: UpcomingEvent[] } | null>(null);
    const [widgetsLoading, setWidgetsLoading] = useState(true);
    const [greeting, setGreeting] = useState('Buenos días');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Efecto para el saludo dinámico
    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Buenos días');
        else if (hour < 19) setGreeting('Buenas tardes');
        else setGreeting('Buenas noches');
    }, []);

    // Efecto para cargar todos los datos
    useEffect(() => {
        const fetchAllData = async () => {
            // Fetch para el resumen de IA
            supabase.functions.invoke('get-daily-briefing').then(({ data, error }) => {
                if (error || data.error) console.error("Error briefing:", error || data.error);
                setDailyBriefing(data?.briefing || "El resumen del mercado no está disponible.");
                setBriefingLoading(false);
            });

            // Fetch para los widgets de datos
            supabase.functions.invoke('get-dashboard-widgets').then(({ data, error }) => {
                if (error || data.error) console.error("Error widgets:", error || data.error);
                setWidgetsData(data);
                setWidgetsLoading(false);
            });
        };
        fetchAllData();
    }, [supabase]);

    const handleSaveWatchlist = async (newWatchlist: string[]) => {
        if (!profile) return;
        const { error } = await supabase
            .from('profiles')
            .update({ watchlist: newWatchlist })
            .eq('id', profile.id);

        if (error) {
            alert('Error al guardar la lista. Inténtalo de nuevo.');
        } else {
            // Refrescar datos para mostrar los cambios
            setWidgetsLoading(true);
            supabase.functions.invoke('get-dashboard-widgets').then(({ data, error }) => {
                if (error || data.error) console.error("Error widgets:", error || data.error);
                setWidgetsData(data);
                setWidgetsLoading(false);
            });
            refreshProfile(); // Actualiza el perfil en el contexto global
        }
    };

    if (userLoading) {
        return <p>Cargando dashboard...</p>;
    }

    return (
        <div>
            <header className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>{greeting}, {profile?.full_name || 'Trader'}</h1>
                <p className={styles.pageSubtitle}>Aquí tienes tu centro de mando para el día de hoy.</p>
            </header>

            <div className={styles.dashboardGrid}>
                <div className={styles.mainColumn}>
                    <AIBriefingWidget briefing={dailyBriefing} loading={briefingLoading} />
                    <ChartAnalysisCTA />
                </div>
                <div className={styles.sidebarColumn}>
                    <UpcomingEventsWidget events={widgetsData?.upcomingEvents || []} loading={widgetsLoading} />
                    <MarketPulseWidget watchlist={widgetsData?.watchlistData || []} loading={widgetsLoading} onEdit={() => setIsModalOpen(true)} />
                </div>
            </div>

            <EditWatchlistModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                currentWatchlist={profile?.watchlist || []}
                onSave={handleSaveWatchlist}
            />
        </div>
    );
}









