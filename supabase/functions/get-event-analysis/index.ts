import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts';

interface AIAnalysis {
  professional_description: string;
  historical_analysis: string;
  forecast_scenarios: {
    scenario: string;
    recommendation: string;
  }[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { eventName, currency, date, estimate, previous } = await req.json();
    if (!eventName || !currency || !date) {
      throw new Error('Faltan parámetros en la petición (eventName, currency, date).');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Acceso denegado: Usuario no autenticado.');

    const eventDate = new Date(date).toISOString().split('T')[0];
    const eventIdentifier = `${eventName}-${currency}-${eventDate}`;

    const { data: cachedAnalysis } = await supabaseClient
      .from('ai_event_analyses')
      .select('analysis_data')
      .eq('event_identifier', eventIdentifier)
      .single();

    if (cachedAnalysis) {
      console.log(`Análisis encontrado en caché para: ${eventIdentifier}`);
      return new Response(JSON.stringify(cachedAnalysis.analysis_data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`No se encontró en caché. Generando nuevo análisis para: ${eventIdentifier}`);
    const { data: profile } = await supabaseClient.from('profiles').select('subscription_plan').eq('id', user.id).single();
    if (profile?.subscription_plan !== 'Profesional') {
      throw new Error('Acceso denegado: Esta función requiere el plan Profesional.');
    }

    const FMP_API_KEY = Deno.env.get("FMP_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!FMP_API_KEY || !GEMINI_API_KEY) throw new Error("Claves de API no configuradas.");

    const historyUrl = `https://financialmodelingprep.com/api/v3/historical-economic-calendar/${currency}?apikey=${FMP_API_KEY}`;
    const fmpResponse = await fetch(historyUrl);
    if (!fmpResponse.ok) throw new Error('Error al obtener datos históricos de FMP.');
    
    const historicalData = await fmpResponse.json();
    const relevantHistory = historicalData
      .filter((item: any) => item.event === eventName)
      .slice(0, 5)
      .map((item: any) => `  - Fecha: ${new Date(item.date).toLocaleDateString()}, Actual: ${item.actual ?? 'N/A'}, Previsión: ${item.estimate ?? 'N/A'}`)
      .join('\n');

    // --- INICIO DEL PROMPT MEJORADO ---
    const prompt = `
      **ROL Y OBJETIVO:**
      Eres "AImpatfx", un analista financiero cuantitativo senior. Tu objetivo es proporcionar un análisis claro, conciso y accionable para traders profesionales. Tu tono es autoritario y basado en datos. No uses frases como "se requiere más análisis" o "es difícil decirlo"; en su lugar, ofrece la mejor interpretación posible con la información disponible.

      **CONTEXTO DEL EVENTO:**
      - Nombre del Evento: "${eventName}"
      - Divisa Afectada: ${currency}
      - Previsión del Mercado (Consenso): ${estimate ?? 'N/A'}
      - Dato del Periodo Previo: ${previous ?? 'N/A'}

      **DATOS HISTÓRICOS (ÚLTIMOS 5 PERIODOS):**
      ${relevantHistory.length > 0 ? relevantHistory : "No se encontraron datos históricos para este evento específico."}

      **TAREA - GENERAR ANÁLISIS EN FORMATO JSON:**
      Analiza toda la información y genera una respuesta JSON válida con la siguiente estructura y claves exactas. Sé específico y directo en tus recomendaciones.

      {
        "professional_description": "Explica qué es este indicador, qué mide exactamente y por qué es fundamental para la valoración de la divisa ${currency} y las decisiones del banco central correspondiente. Conecta el indicador con la salud económica general.",
        "historical_analysis": "Analiza la tendencia de los datos históricos. Si no hay datos, explica qué implica esa ausencia para los traders (ej. 'La falta de un historial de datos consistente para este evento aumenta la incertidumbre y la probabilidad de una reacción volátil...'). Si hay datos, indica si el mercado ha sido sorprendido consistentemente (actual vs. previsión) y qué revela la tendencia sobre la economía.",
        "forecast_scenarios": [
          {
            "scenario": "Resultado > Previsión (Dato Fuerte)",
            "recommendation": "Describe la reacción más probable del mercado si el dato real supera la previsión. Proporciona una estrategia de trading clara, mencionando pares de divisas clave (ej. 'Un resultado fuerte podría impulsar al ${currency}. Considerar posiciones largas en ${currency}/JPY o cortas en EUR/${currency}...') y niveles de referencia o invalidación si es posible."
          },
          {
            "scenario": "Resultado ≈ Previsión (Dato en Línea)",
            "recommendation": "Describe la reacción probable si el dato real coincide con la previsión. Analiza si el foco se desplazaría hacia el dato previo para determinar la tendencia. Ofrece una estrategia, que podría ser neutral o de esperar a una mayor claridad (ej. 'Una reacción limitada es probable. El mercado podría entrar en un rango. Se recomienda cautela hasta la siguiente publicación...')."
          },
          {
            "scenario": "Resultado < Previsión (Dato Débil)",
            "recommendation": "Describe la reacción más probable del mercado si el dato real es inferior a la previsión. Proporciona una estrategia de trading clara y opuesta al escenario fuerte (ej. 'Un dato débil podría presionar al ${currency}. Evaluar posiciones cortas en ${currency}/CHF o largas en AUD/${currency}...') y menciona los riesgos asociados."
          }
        ]
      }
    `;
    // --- FIN DEL PROMPT MEJORADO ---

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });

    if (!geminiResponse.ok) throw new Error(`Error en la API de Gemini: ${await geminiResponse.text()}`);

    const geminiData = await geminiResponse.json();
    const analysisJsonText = geminiData.candidates[0].content.parts[0].text;
    const analysisObject: AIAnalysis = JSON.parse(analysisJsonText);

    const { error: insertError } = await supabaseClient
      .from('ai_event_analyses')
      .insert({
        event_identifier: eventIdentifier,
        analysis_data: analysisObject,
        requested_by: user.id
      });

    if (insertError) {
      console.error("Error al guardar el nuevo análisis en caché:", insertError);
    }

    return new Response(JSON.stringify(analysisObject), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error en la función get-event-analysis:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});





