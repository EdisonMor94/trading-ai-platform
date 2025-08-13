import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// --- Mapeo de nuestras temporalidades al formato de FMP ---
const mapTimeframeToFMP = (timeframe: string) => {
  const mapping = {
    '1m': '1min',
    '5m': '5min',
    '15m': '15min',
    '30m': '30min',
    'H1': '1hour',
    'H4': '4hour',
    'D1': 'daily',
  };
  return mapping[timeframe] || 'daily';
};

// --- FUNCIÓN PRINCIPAL DEL SERVIDOR ---
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  let request_id = null;

  try {
    const FMP_API_KEY = Deno.env.get("FMP_API_KEY");
    if (!FMP_API_KEY) throw new Error("FMP_API_KEY no está configurada.");

    const body = await req.json();
    const record = body.record;
    request_id = record.id;

    if (!request_id) {
      throw new Error("Falta el ID del registro en el payload.");
    }
    if (record.status !== 'enriching') {
      return new Response(JSON.stringify({ message: `No action needed for status: ${record.status}` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { activo, temporalidad } = record.analysis_result;
    if (!activo) {
      throw new Error("El análisis no contiene un 'activo' válido.");
    }
    
    console.log(`[${request_id}] - Iniciando enriquecimiento con FMP para ${activo}.`);
    const symbol = activo.replace('/', '');
    const fmpTimeframe = mapTimeframeToFMP(temporalidad);

    // --- 1. OBTENER CALENDARIO ECONÓMICO (CON LÓGICA DINÁMICA) ---
    const today = new Date().toISOString().split('T')[0];
    const calendarUrl = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${today}&to=${today}&apikey=${FMP_API_KEY}`;
    const economicEventsPromise = fetch(calendarUrl).then(res => res.json());

    // --- 2. OBTENER NOTICIAS FINANCIERAS ---
    const newsUrl = `https://financialmodelingprep.com/api/v3/stock_news?tickers=${symbol}&limit=5&apikey=${FMP_API_KEY}`;
    const financialNewsPromise = fetch(newsUrl).then(res => res.json());

    // --- 3. OBTENER INDICADORES TÉCNICOS ---
    const indicatorsToFetch = ['rsi', 'macd', 'sma', 'ema', 'bbands'];
    
    const indicatorPromises = indicatorsToFetch.map(indicator => {
      const period = (indicator === 'sma' || indicator === 'ema') ? 50 : 14;
      const indicatorUrl = `https://financialmodelingprep.com/api/v3/technical_indicator/${fmpTimeframe}/${symbol}?type=${indicator}&period=${period}&apikey=${FMP_API_KEY}`;
      return fetch(indicatorUrl).then(res => res.json());
    });
    
    // --- Ejecutamos todas las llamadas en paralelo ---
    const [economicEvents, financialNews, ...indicatorResults] = await Promise.all([
      economicEventsPromise,
      financialNewsPromise,
      ...indicatorPromises
    ]);

    // --- 4. FORMATEAR LOS DATOS RECOPILADOS ---
    
    // --- CORRECCIÓN: Lógica para extraer divisas del activo ---
    let currenciesToWatch = ['USD']; // Por defecto, siempre vigilamos el USD
    if (activo.includes('/')) {
        const parts = activo.split('/');
        currenciesToWatch = [...new Set([...currenciesToWatch, ...parts])]; // Añade las divisas del par sin duplicados
    }

    const marketData = {
      calendario_economico: (economicEvents || [])
        // Filtramos por las divisas relevantes y por impacto
        .filter(e => currenciesToWatch.includes(e.currency) && (e.impact === 'High' || e.impact === 'Medium'))
        .map(e => ({
          noticia: e.event,
          divisa: e.currency,
          importancia: e.impact,
          hora: new Date(e.date).toLocaleTimeString(),
        })),
      
      noticias_recientes: (financialNews || []).map(n => ({
        titular: n.title,
        fuente: n.site,
        sentimiento: n.sentiment,
      })),
      
      indicadores_tecnicos: {},
    };

    indicatorResults.forEach((result, index) => {
        const indicatorName = indicatorsToFetch[index].toUpperCase();
        if (result && result.length > 0) {
            marketData.indicadores_tecnicos[indicatorName] = result[0];
        } else {
            marketData.indicadores_tecnicos[indicatorName] = null;
        }
    });

    console.log(`[${request_id}] - Enriquecimiento con FMP completado.`);

    // --- 5. ACTUALIZAR LA BASE DE DATOS ---
    const { error: updateError } = await supabaseAdmin
      .from('analysis_requests')
      .update({
        status: 'generating',
        market_data: marketData,
      })
      .eq('id', request_id);

    if (updateError) {
      throw new Error(`Error al actualizar estado a 'generating': ${updateError.message}`);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error(`[${request_id || 'ID no disponible'}] - Error FATAL en enrich-analysis:`, error);
    if (request_id) {
      await supabaseAdmin
        .from('analysis_requests')
        .update({
          status: 'failed',
          error_message: `Error en enriquecimiento: ${errorMessage}`,
        })
        .eq('id', request_id);
    }
    return new Response(JSON.stringify({ error: "Ocurrió un error interno." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
