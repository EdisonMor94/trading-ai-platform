import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts';

// Listas de activos por defecto
const defaultFavorites = {
  indexes: ['^GSPC', '^IXIC', '^DJI', '^FTSE'], // S&P 500, NASDAQ, Dow Jones, FTSE 100
  metals: ['XAUUSD', 'XAGUSD', 'PAUSD', 'PLUSD'], // Gold, Silver, Palladium, Platinum
  forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'],
  crypto: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD'],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const FMP_API_KEY = Deno.env.get("FMP_API_KEY");
    if (!FMP_API_KEY) throw new Error("FMP_API_KEY no está configurada.");

    // 1. Obtener los favoritos del usuario
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('market_pulse_favorites')
      .eq('id', user.id)
      .single();
      
    const favorites = profile?.market_pulse_favorites || defaultFavorites;

    // 2. Construir las URLs basadas en los favoritos o los valores por defecto
    const symbolsToFetch = {
        indexes: favorites.indexes || defaultFavorites.indexes,
        metals: favorites.metals || defaultFavorites.metals,
        forex: favorites.forex || defaultFavorites.forex,
        crypto: favorites.crypto || defaultFavorites.crypto,
    };

    const indexesUrl = `https://financialmodelingprep.com/api/v3/quote/${symbolsToFetch.indexes.join(',')}?apikey=${FMP_API_KEY}`;
    const metalsUrl = `https://financialmodelingprep.com/api/v3/quote/${symbolsToFetch.metals.join(',')}?apikey=${FMP_API_KEY}`;
    const forexUrl = `https://financialmodelingprep.com/api/v3/quote/${symbolsToFetch.forex.join(',')}?apikey=${FMP_API_KEY}`;
    const cryptoUrl = `https://financialmodelingprep.com/api/v3/quote/${symbolsToFetch.crypto.join(',')}?apikey=${FMP_API_KEY}`;
    
    // 3. Realizar todas las llamadas en paralelo
    const [indexesRes, metalsRes, forexRes, cryptoRes] = await Promise.all([
      fetch(indexesUrl),
      fetch(metalsUrl),
      fetch(forexUrl),
      fetch(cryptoUrl)
    ]);

    const marketPulseData = {
        indexes: await indexesRes.json(),
        metals: await metalsRes.json(),
        forex: await forexRes.json(),
        crypto: await cryptoRes.json(),
    };

    return new Response(JSON.stringify(marketPulseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error en get-market-pulse:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});


