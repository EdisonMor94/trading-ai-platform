'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState, useCallback } from 'react';
import { useUser } from '../UserContext';
import UpgradePrompt from '../components/UpgradePrompt';
import styles from './market-pulse.module.css';

// --- Interfaces para los Datos ---
interface MarketQuote {
  symbol: string;
  name?: string;
  price: number;
  changesPercentage: number;
}
interface MarketData {
  indexes: MarketQuote[];
  metals: MarketQuote[];
  forex: MarketQuote[];
  crypto: MarketQuote[];
}
interface ProfileData {
  name: string;
  price: number;
  changesPercentage: number;
  marketCap: number;
  volume: number;
  yearHigh: number;
  yearLow: number;
}
interface NewsArticle {
    symbol: string;
    publishedDate: string;
    title: string;
    image: string;
    site: string;
    text: string;
    url: string;
}

// --- Lista completa de símbolos ---
const allSymbols = {
  indexes: { name: 'Índices', symbols: ['^GSPC', '^IXIC', '^DJI', '^FTSE', '^N225', '^HSI', '^AXJO', '^BSESN'] },
  metals: { name: 'Metales', symbols: ['XAUUSD', 'XAGUSD', 'PAUSD', 'PLUSD', 'XCUUSD', 'XALUSD'] },
  forex: { name: 'Divisas', symbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURGBP'] },
  crypto: { name: 'Criptos', symbols: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'ADAUSD', 'DOGEUSD', 'BNBUSD', 'LTCUSD'] },
};

// --- Componente para una Tarjeta de Mercado ---
const MarketCard = ({ quote, onClick, isSelected }: { quote: MarketQuote, onClick: () => void, isSelected: boolean }) => {
  const isPositive = quote.changesPercentage >= 0;
  const changeClass = isPositive ? styles.changePositive : styles.changeNegative;
  const arrow = isPositive ? '▲' : '▼';
  const cleanSymbol = quote.symbol.replace('^', '');

  return (
    <button onClick={onClick} className={`${styles.marketCard} ${isSelected ? styles.selectedCard : ''}`}>
      <div>
        <p className={styles.symbol}>{cleanSymbol}</p>
        <p className={styles.name}>{quote.name || quote.symbol.replace('USD', '/USD')}</p>
      </div>
      <div className={styles.priceInfo}>
        <p className={styles.price}>{quote.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</p>
        <p className={changeClass}>
          {arrow} {quote.changesPercentage.toFixed(2)}%
        </p>
      </div>
    </button>
  );
};

// --- Componente para el Panel de Detalles del Activo ---
const AssetDetailPanel = ({ symbol, onClose, canUseMovementAnalysis }: { symbol: string, onClose: () => void, canUseMovementAnalysis: boolean }) => {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    const fetchAssetData = async () => {
      setLoading(true);
      setError(null);
      setAnalysis(null);
      setShowUpgrade(false);
      try {
        const FMP_API_KEY = process.env.NEXT_PUBLIC_FMP_API_KEY;
        if (!FMP_API_KEY) throw new Error("Clave de API de FMP no configurada.");

        const cleanSymbol = symbol.replace('^', '');
        const profileUrl = `https://financialmodelingprep.com/api/v3/quote/${cleanSymbol}?apikey=${FMP_API_KEY}`;
        const newsUrl = `https://financialmodelingprep.com/api/v3/stock_news?tickers=${cleanSymbol}&limit=5&apikey=${FMP_API_KEY}`;

        const [profileRes, newsRes] = await Promise.all([fetch(profileUrl), fetch(newsUrl)]);
        if (!profileRes.ok || !newsRes.ok) throw new Error("No se pudieron obtener los datos del activo.");

        const profileData = await profileRes.json();
        const newsData = await newsRes.json();

        if (Array.isArray(profileData) && profileData.length > 0) setProfile(profileData[0]);
        else throw new Error(`No se encontró el perfil para el símbolo: ${cleanSymbol}`);

        if (Array.isArray(newsData)) setNews(newsData);
        else setNews([]);

      } catch (err: any) { setError(err.message); } 
      finally { setLoading(false); }
    };
    fetchAssetData();
  }, [symbol]);

  const handleMovementAnalysisClick = async () => {
    if (!canUseMovementAnalysis) {
        setShowUpgrade(true);
        return;
    }
    setLoadingAnalysis(true);
    setAnalysis(null);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuario no autenticado.");
      
      const { data, error } = await supabase.functions.invoke('get-news-analysis', { body: { symbol } });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setAnalysis(data.analysis);
    } catch (err: any) { setError(err.message); } 
    finally { setLoadingAnalysis(false); }
  };

  return (
    <div className={styles.detailPanel}>
      {loading ? <div className={styles.spinner}></div> : (
        <>
          <div className={styles.detailHeader}>
            <h3>{profile?.name || symbol}</h3>
            <button onClick={onClose} className={styles.closeDetailButton}>&times;</button>
          </div>
          <div className={styles.detailGrid}>
            <div className={styles.detailLeft}>
              <div className={styles.detailCard}>
                <h4 className={styles.detailCardTitle}>"El Porqué" del Movimiento con IA</h4>
                {showUpgrade ? (
                    <UpgradePrompt featureName='"El Porqué" del Movimiento con IA' />
                ) : analysis ? (
                    <div className={styles.analysisResult}><p>{analysis}</p></div>
                ) : loadingAnalysis ? (
                    <div className={styles.spinner}></div>
                ) : error ? (
                    <div className={styles.analysisError}>{error}</div>
                ) : (
                    <>
                      <p className={styles.detailCardSubtitle}>Obtén un resumen instantáneo del sentimiento del mercado.</p>
                      <button onClick={handleMovementAnalysisClick} disabled={loadingAnalysis} className={styles.analyzeButton}>
                          {loadingAnalysis ? 'Analizando...' : '"El Porqué" del Movimiento'}
                      </button>
                    </>
                )}
              </div>
              <div className={styles.detailCard}>
                <h4 className={styles.detailCardTitle}>Noticias Recientes</h4>
                <div className={styles.newsFeed}>
                  {news.length > 0 ? news.map((article, i) => (
                    <a key={i} href={article.url} target="_blank" rel="noopener noreferrer" className={styles.newsItem}>
                      <p className={styles.newsTitle}>{article.title}</p>
                      <p className={styles.newsSource}>{article.site}</p>
                    </a>
                  )) : <p>No hay noticias recientes.</p>}
                </div>
              </div>
            </div>
            <div className={styles.detailRight}>
              <div className={styles.detailCard}>
                <h4 className={styles.detailCardTitle}>Datos del Activo</h4>
                {profile ? (
                  <div className={styles.statsGrid}>
                    <div className={styles.statItem}><span>Precio</span><span>${profile.price.toFixed(2)}</span></div>
                    <div className={styles.statItem}><span>Cambio % (24h)</span><span className={profile.changesPercentage >= 0 ? styles.positive : styles.negative}>{profile.changesPercentage.toFixed(2)}%</span></div>
                    <div className={styles.statItem}><span>Volumen</span><span>{(profile.volume / 1_000_000).toFixed(2)}M</span></div>
                    <div className={styles.statItem}><span>Máx. 52 Semanas</span><span>${profile.yearHigh.toFixed(2)}</span></div>
                    <div className={styles.statItem}><span>Mín. 52 Semanas</span><span>${profile.yearLow.toFixed(2)}</span></div>
                    <div className={styles.statItem}><span>Capitalización</span><span>${(profile.marketCap / 1_000_000_000).toFixed(2)}B</span></div>
                  </div>
                ) : <p className={styles.errorText}>No se pudieron cargar los datos del activo.</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};


// --- Componente para una Sección de Mercado ---
const MarketSection = ({ title, data, onEdit, onCardClick, selectedSymbol }: { title: string, data: MarketQuote[] | undefined, onEdit: () => void, onCardClick: (symbol: string) => void, selectedSymbol: string | null }) => (
    <section className={styles.marketSection}>
        <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{title}</h2>
            <button onClick={onEdit} className={styles.editButton}>Personalizar</button>
        </div>
        <div className={styles.cardsContainer}>
            {data && data.length > 0 ? (
                data.map(quote => <MarketCard key={quote.symbol} quote={quote} onClick={() => onCardClick(quote.symbol)} isSelected={selectedSymbol === quote.symbol} />)
            ) : (<p className={styles.noDataText}>Cargando datos...</p>)}
        </div>
    </section>
);

// --- Componente para el Modal de Edición ---
const EditFavoritesModal = ({ category, allSymbols, currentFavorites, onClose, onSave }: { category: string; allSymbols: { name: string; symbols: string[] }; currentFavorites: string[]; onClose: () => void; onSave: (newFavorites: string[]) => void; }) => {
  const [selected, setSelected] = useState<string[]>(currentFavorites);
  const handleSelect = (symbol: string) => {
    const isSelected = selected.includes(symbol);
    let newSelected;
    if (isSelected) {
      newSelected = selected.filter(s => s !== symbol);
    } else {
      if (selected.length < 4) { newSelected = [...selected, symbol]; } 
      else { 
          alert("Puedes seleccionar un máximo de 4 activos por categoría.");
          return; 
      }
    }
    setSelected(newSelected);
  };
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Personalizar {allSymbols.name}</h3>
          <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>
        <p className={styles.modalSubtitle}>Selecciona hasta 4 activos para mostrar en tu dashboard.</p>
        <div className={styles.symbolList}>
          {allSymbols.symbols.map(symbol => (
            <div key={symbol} className={styles.symbolItem}>
              <input type="checkbox" id={symbol} checked={selected.includes(symbol)} onChange={() => handleSelect(symbol)} />
              <label htmlFor={symbol}>{symbol.replace('^', '')}</label>
            </div>
          ))}
        </div>
        <div className={styles.modalActions}>
          <button onClick={onClose} className={styles.cancelButton}>Cancelar</button>
          <button onClick={() => onSave(selected)} className={styles.saveButton}>Guardar Cambios</button>
        </div>
      </div>
    </div>
  );
};

// --- Componente Principal ---
export default function MarketPulsePage() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { permissions, loading: userLoading } = useUser();
  
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<keyof typeof allSymbols | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const fetchMarketPulse = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuario no autenticado.");
      const { data, error } = await supabase.functions.invoke('get-market-pulse');
      if (error) throw error;
      setMarketData(data);
    } catch (err: any) { setError(err.message); } 
    finally { setLoading(false); }
  }, [supabase]);

  useEffect(() => {
    if (!userLoading) {
      setLoading(true);
      fetchMarketPulse();
    }
  }, [userLoading, fetchMarketPulse]);

  const handleEditClick = (category: keyof typeof allSymbols) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleSaveFavorites = async (newFavorites: string[]) => {
    if (!editingCategory) return;
    setIsModalOpen(false);
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setLoading(false);
        return;
    };
    const { data: profile } = await supabase.from('profiles').select('market_pulse_favorites').single();
    const updatedFavorites = { ...(profile?.market_pulse_favorites || {}), [editingCategory]: newFavorites };
    const { error } = await supabase.from('profiles').update({ market_pulse_favorites: updatedFavorites }).eq('id', user.id);
    if (error) { 
        alert("Error al guardar tus preferencias."); 
        setLoading(false);
    } 
    else { 
        await fetchMarketPulse(); 
    }
  };

  const handleCardClick = (symbol: string) => {
      setSelectedSymbol(prevSymbol => (prevSymbol === symbol ? null : symbol));
  };

  if (userLoading || loading) return <p>Cargando pulso del mercado...</p>;

  if (error) return <div className={styles.errorState}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      {isModalOpen && editingCategory && (
        <EditFavoritesModal
          category={editingCategory}
          allSymbols={allSymbols[editingCategory]}
          currentFavorites={marketData?.[editingCategory]?.map(q => q.symbol) || []}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveFavorites}
        />
      )}
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Pulso del Mercado</h1>
        <p className={styles.headerSubtitle}>Una vista rápida y personalizada de los mercados. Haz clic en un activo para ver más detalles.</p>
      </header>
      <div className={styles.marketGrid}>
        <MarketSection title="Índices Principales" data={marketData?.indexes} onEdit={() => handleEditClick('indexes')} onCardClick={handleCardClick} selectedSymbol={selectedSymbol} />
        {selectedSymbol && marketData?.indexes.find(q => q.symbol === selectedSymbol) && <AssetDetailPanel symbol={selectedSymbol} onClose={() => setSelectedSymbol(null)} canUseMovementAnalysis={permissions.canUseNewsAnalysis} />}
        
        <MarketSection title="Metales Preciosos" data={marketData?.metals} onEdit={() => handleEditClick('metals')} onCardClick={handleCardClick} selectedSymbol={selectedSymbol} />
        {selectedSymbol && marketData?.metals.find(q => q.symbol === selectedSymbol) && <AssetDetailPanel symbol={selectedSymbol} onClose={() => setSelectedSymbol(null)} canUseMovementAnalysis={permissions.canUseNewsAnalysis} />}

        <MarketSection title="Pares de Divisas (Forex)" data={marketData?.forex} onEdit={() => handleEditClick('forex')} onCardClick={handleCardClick} selectedSymbol={selectedSymbol} />
        {selectedSymbol && marketData?.forex.find(q => q.symbol === selectedSymbol) && <AssetDetailPanel symbol={selectedSymbol} onClose={() => setSelectedSymbol(null)} canUseMovementAnalysis={permissions.canUseNewsAnalysis} />}

        <MarketSection title="Criptomonedas" data={marketData?.crypto} onEdit={() => handleEditClick('crypto')} onCardClick={handleCardClick} selectedSymbol={selectedSymbol} />
        {selectedSymbol && marketData?.crypto.find(q => q.symbol === selectedSymbol) && <AssetDetailPanel symbol={selectedSymbol} onClose={() => setSelectedSymbol(null)} canUseMovementAnalysis={permissions.canUseNewsAnalysis} />}
      </div>
    </div>
  );
}