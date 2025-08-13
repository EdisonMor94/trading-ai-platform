'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useUser } from '../UserContext'; // Importamos el hook de usuario
import UpgradePrompt from '../components/UpgradePrompt'; // Importamos el componente de mejora
import styles from './signals.module.css';

// --- Interfaces (sin cambios) ---
interface Signal {
  id: number;
  created_at: string;
  asset: string;
  direction: 'COMPRA' | 'VENTA';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  justification: string;
  technical_pattern: string;
  status: 'activa' | 'cerrada_tp' | 'cerrada_sl';
}

// --- Componente de Tarjeta de Señal (sin cambios) ---
const SignalCard = ({ signal }: { signal: Signal }) => {
  const isBuy = signal.direction === 'COMPRA';
  const timeAgo = new Date(signal.created_at).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
  return (
    <div className={`${styles.signalCard} ${isBuy ? styles.buySignal : styles.sellSignal}`}>
      <div className={styles.cardHeader}>
        <div className={styles.assetInfo}>
          <h3 className={styles.assetName}>{signal.asset}</h3>
          <span className={`${styles.directionChip} ${isBuy ? styles.buyChip : styles.sellChip}`}>{signal.direction}</span>
        </div>
        <span className={styles.timeAgo}>{timeAgo}</span>
      </div>
      <p className={styles.justification}>{signal.justification}</p>
      <div className={styles.levelsGrid}>
        <div className={styles.levelItem}><span className={styles.levelLabel}>Entrada</span><span className={styles.levelValue}>{signal.entry_price}</span></div>
        <div className={styles.levelItem}><span className={styles.levelLabel}>Stop Loss</span><span className={`${styles.levelValue} ${styles.stopLoss}`}>{signal.stop_loss}</span></div>
        <div className={styles.levelItem}><span className={styles.levelLabel}>Take Profit</span><span className={`${styles.levelValue} ${styles.takeProfit}`}>{signal.take_profit}</span></div>
      </div>
      <div className={styles.patternInfo}>Patrón Técnico: {signal.technical_pattern}</div>
    </div>
  );
};

// --- Componente Principal de la Página ---
export default function SignalsPage() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- INICIO DE LA MODIFICACIÓN ---
  const { permissions, loading: userLoading } = useUser();

  useEffect(() => {
    // Solo hacemos fetch de los datos si el usuario tiene permiso
    if (permissions.canUseTradingSignals) {
      const fetchInitialSignals = async () => {
        const { data, error } = await supabase.from('trading_signals').select('*').order('created_at', { ascending: false });
        if (error) {
          console.error("Error fetching initial signals:", error);
        } else {
          setSignals(data as Signal[]);
        }
        setLoading(false);
      };
      fetchInitialSignals();

      const channel = supabase.channel('trading_signals_feed')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trading_signals' },
          (payload) => {
            setSignals(currentSignals => [payload.new as Signal, ...currentSignals]);
          }
        ).subscribe();
      return () => { supabase.removeChannel(channel); };
    } else {
      setLoading(false);
    }
  }, [supabase, permissions]);

  // Si el usuario está cargando, mostramos un mensaje
  if (userLoading || loading) {
    return <p>Cargando...</p>;
  }

  // Si el usuario NO tiene permiso, mostramos el componente de mejora
  if (!permissions.canUseTradingSignals) {
    return <UpgradePrompt featureName="Señales de Trading con IA" />;
  }
  // --- FIN DE LA MODIFICACIÓN ---

  // Si el usuario SÍ tiene permiso, mostramos el contenido de la página
  return (
    <div>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Señales de Trading con IA</h1>
        <p className={styles.pageSubtitle}>
          Oportunidades de mercado detectadas por nuestro sistema y validadas por IA, actualizadas en tiempo real.
        </p>
      </header>

      {signals.length === 0 && (
        <div className={styles.emptyState}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          <h3>Esperando Nuevas Oportunidades</h3>
          <p>Nuestro sistema está escaneando el mercado. Las nuevas señales de alta probabilidad aparecerán aquí automáticamente.</p>
        </div>
      )}

      <div className={styles.signalsGrid}>
        {signals.map(signal => (
          <SignalCard key={signal.id} signal={signal} />
        ))}
      </div>
    </div>
  );
}

