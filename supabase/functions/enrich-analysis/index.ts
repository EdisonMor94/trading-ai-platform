import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";

// Mapeo de nombres de indicadores a funciones de Alpha Vantage
const INDICATOR_MAP: { [key: string]: string } = {
    'RSI': 'RSI', 'SMA': 'SMA', 'EMA': 'EMA',
    'MACD': 'MACD', 'STOCH': 'STOCH', 'BBANDS': 'BBANDS', 'SAR': 'SAR',
};

// Función para mapear nuestra temporalidad al formato de Alpha Vantage
const mapTimeframeToAlphaVantage = (timeframe: string) => {
    const mapping: { [key: string]: { interval: string; time_period: string } } = {
        '1m': { interval: '1min', time_period: '14' }, '5m': { interval: '5min', time_period: '14' },
        '15m': { interval: '15min', time_period: '14' }, '30m': { interval: '30min', time_period: '14' },
        'H1': { interval: '60min', time_period: '14' }, 'H4': { interval: 'daily', time_period: '20' },
        'D1': { interval: 'daily', time_period: '14' }, 'W1': { interval: 'weekly', time_period: '14' },
        'MN': { interval: 'monthly', time_period: '14' },
    };
    return mapping[timeframe] || mapping['D1'];
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    let request_id: string | null = null;

    try {
        const ALPHA_VANTAGE_API_KEY = Deno.env.get("ALPHA_VANTAGE_API_KEY");
        if (!ALPHA_VANTAGE_API_KEY) throw new Error("ALPHA_VANTAGE_API_KEY no está configurada.");

        const body = await req.json();
        const record = body.record;
        request_id = record.id;
        if (!request_id) { throw new Error("Falta el ID del registro en el payload."); }

        if (record.status !== 'enriching') {
            return new Response(JSON.stringify({ message: `No action needed for status: ${record.status}` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        const { activo, temporalidad, indicadores: userIndicators } = record.analysis_result;
        if (!activo) { throw new Error("El análisis no contiene un 'activo' válido."); }
        
        console.log(`[${request_id}] - Iniciando enriquecimiento híbrido para ${activo}.`);

        const symbol = activo.replace('/', '');
        const { interval, time_period } = mapTimeframeToAlphaVantage(temporalidad);
        
        // Lógica del calendario económico
        const currencies = activo.split('/');
        let economicEvents: { noticias_pasadas: any[], noticias_futuras: any[] } = { noticias_pasadas: [], noticias_futuras: [] };
        
        try {
            const calendarResponse = await fetch(`https://www.alphavantage.co/query?function=ECONOMIC_CALENDAR&horizon=7days&apikey=${ALPHA_VANTAGE_API_KEY}`).then(res => res.json());
            if (calendarResponse.data && typeof calendarResponse.data === 'string') {
                const eventsRaw = JSON.parse(calendarResponse.data);
                const now = new Date();
                
                const relevantEvents = eventsRaw.filter((event: any) => currencies.includes(event.currency));
                
                relevantEvents.forEach((event: any) => {
                    const eventDate = new Date(event.utc_time);
                    const eventSummary = {
                        noticia: event.event,
                        importancia: event.impact,
                        actual: event.actual,
                        prevision: event.forecast,
                        previo: event.previous
                    };

                    if (eventDate <= now) {
                        economicEvents.noticias_pasadas.push(eventSummary);
                    } else {
                        economicEvents.noticias_futuras.push({
                            ...eventSummary,
                            tiempo_restante: `${Math.round((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60))} horas`
                        });
                    }
                });
            }
        } catch(e) {
            console.error(`[${request_id}] - Error al procesar calendario económico: ${e.message}`);
        }

        // Lógica de indicadores
        const baselineIndicators = ['RSI', 'SMA', 'MACD'];
        let userIndicatorFunctions: string[] = [];

        if (userIndicators && Array.isArray(userIndicators) && userIndicators.length > 0) {
            userIndicatorFunctions = userIndicators
                .map((ind: { nombre_indicador: string }) => ind.nombre_indicador ? INDICATOR_MAP[ind.nombre_indicador.toUpperCase()] : null)
                .filter(Boolean) as string[];
        }
        
        const indicatorsToFetch = [...new Set([...baselineIndicators, ...userIndicatorFunctions])];
        
        const apiPromises = [
            fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`).then(res => res.json()),
            ...indicatorsToFetch.map(apiFunction => {
                let period = time_period;
                if (apiFunction === 'SMA') { period = '200'; }
                const apiUrl = `https://www.alphavantage.co/query?function=${apiFunction}&symbol=${symbol}&interval=${interval}&time_period=${period}&series_type=close&apikey=${ALPHA_VANTAGE_API_KEY}`;
                return fetch(apiUrl).then(res => res.json());
            })
        ];

        const [quoteResult, ...indicatorResults] = await Promise.all(apiPromises);

        const marketData: { [key: string]: any } = {};
        if (quoteResult.Note) { throw new Error("Límite de la API de Alpha Vantage alcanzado en la consulta de precio."); }
        marketData.precio_actual = quoteResult['Global Quote']?.['05. price'] || null;
        marketData.calendario_economico = economicEvents;

        indicatorResults.forEach((result, index) => {
            const indicatorName = indicatorsToFetch[index];
            if (result.Note) {
                console.warn(`[${request_id}] - Límite de API alcanzado para el indicador ${indicatorName}.`);
                marketData[indicatorName] = "Límite de API alcanzado";
            } else {
                const techAnalysisKey = Object.keys(result).find(k => k.startsWith('Technical Analysis:'));
                if (techAnalysisKey) {
                    marketData[indicatorName] = Object.values(result[techAnalysisKey])[0] as any;
                }
            }
        });

        console.log(`[${request_id}] - Enriquecimiento híbrido completado.`);
        
        const { error: updateError } = await supabaseAdmin.from('analysis_requests').update({
            status: 'generating',
            market_data: marketData
        }).eq('id', request_id);

        if (updateError) {
            throw new Error(`Error al actualizar estado a 'generating': ${updateError.message}`);
        }

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        console.error(`[${request_id || 'ID no disponible'}] - Error FATAL en enrich-analysis:`, error);
        if (request_id) {
            await supabaseAdmin.from('analysis_requests').update({ status: 'failed', error_message: `Error en enriquecimiento: ${errorMessage}` }).eq('id', request_id);
        }
        return new Response(JSON.stringify({ error: "Ocurrió un error interno." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});