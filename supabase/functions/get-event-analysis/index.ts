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

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { eventName: translatedEventName, currency, date, estimate, previous } = await req.json();
    if (!translatedEventName || !currency || !date) {
      throw new Error('Faltan parámetros en la petición (eventName, currency, date).');
    }

    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log(`Buscando el nombre original para: "${translatedEventName}"`);
    const { data: eventData, error: dbError } = await adminSupabaseClient
      .from('economic_events')
      .select('event_original')
      .eq('event_translated', translatedEventName)
      .limit(1)
      .single();

    if (dbError || !eventData) {
      throw new Error(`No se pudo encontrar el evento original para "${translatedEventName}". Error: ${dbError?.message}`);
    }

    const originalEventName = eventData.event_original;
    console.log(`Nombre original encontrado: "${originalEventName}"`);

    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await userSupabaseClient.auth.getUser();
    if (!user) throw new Error('Acceso denegado: Usuario no autenticado.');

    const eventDate = new Date(date).toISOString().split('T')[0];
    const eventIdentifier = `${originalEventName}-${currency}-${eventDate}`;

    const { data: cachedAnalysis } = await adminSupabaseClient
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
    const { data: profile } = await userSupabaseClient.from('profiles').select('subscription_plan').eq('id', user.id).single();
    if (profile?.subscription_plan !== 'Profesional') {
      throw new Error('Acceso denegado: Esta función requiere el plan Profesional.');
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("Clave de API de Gemini no configurada.");

    console.log(`Obteniendo historial desde la base de datos para: "${originalEventName}"`);
    const { data: historicalData, error: historyError } = await adminSupabaseClient
      .from('economic_events')
      .select('date, actual, estimate')
      .eq('event_original', originalEventName)
      .lt('date', date)
      .order('date', { ascending: false })
      .limit(5);

    if (historyError) {
      throw new Error(`Error al obtener datos históricos de la base de datos: ${historyError.message}`);
    }

    const relevantHistory = historicalData
      .map((item: any) => `  - Fecha: ${new Date(item.date).toLocaleDateString()}, Actual: ${item.actual ?? 'N/A'}, Previsión: ${item.estimate ?? 'N/A'}`)
      .join('\n');

    // --- INICIO DE LA CORRECCIÓN DEL PROMPT ---
    const prompt = `
      Eres un analista financiero experto para traders. Analiza los siguientes datos de un evento económico.
      Tu respuesta DEBE ser únicamente un objeto JSON, sin texto introductorio ni explicaciones adicionales.
      El objeto JSON debe tener EXACTAMENTE la siguiente estructura y nombres de claves:
      {
        "professional_description": "Una descripción técnica y detallada del evento y su impacto esperado en el mercado.",
        "historical_analysis": "Un análisis basado en los datos históricos proporcionados, explicando cómo ha reaccionado el mercado en el pasado.",
        "forecast_scenarios": [
          {
            "scenario": "Resultado > Previsión (Dato Fuerte)",
            "recommendation": "Una recomendación de trading clara y concisa para este escenario."
          },
          {
            "scenario": "Resultado ≈ Previsión (Dato en Línea)",
            "recommendation": "Una recomendación de trading clara y concisa para este escenario."
          },
          {
            "scenario": "Resultado < Previsión (Dato Débil)",
            "recommendation": "Una recomendación de trading clara y concisa para este escenario."
          }
        ]
      }

      DATOS DEL EVENTO:
      - Nombre del Evento: ${originalEventName}
      - Divisa Afectada: ${currency}
      - Fecha del Evento: ${new Date(date).toLocaleDateString()}
      - Previsión (Estimate): ${estimate ?? 'N/A'}
      - Dato Previo (Previous): ${previous ?? 'N/A'}
      - Historial Reciente (Últimos 5):
      ${relevantHistory || "No hay datos históricos disponibles."}
    `;
    // --- FIN DE LA CORRECCIÓN DEL PROMPT ---

    let geminiResponse;
    const maxRetries = 3;
    let delayTime = 1000;

    for (let i = 0; i < maxRetries; i++) {
      console.log(`Intento ${i + 1} de llamar a la API de Gemini...`);
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
      geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });

      if (geminiResponse.ok) {
        console.log("Llamada a Gemini exitosa.");
        break;
      }

      if (geminiResponse.status === 503 && i < maxRetries - 1) {
        console.log(`API de Gemini sobrecargada. Reintentando en ${delayTime / 1000} segundos...`);
        await delay(delayTime);
        delayTime *= 2;
      } else {
        throw new Error(`Error en la API de Gemini: ${await geminiResponse.text()}`);
      }
    }

    if (!geminiResponse || !geminiResponse.ok) {
        throw new Error("No se pudo obtener una respuesta exitosa de la API de Gemini después de varios intentos.");
    }

    const geminiData = await geminiResponse.json();
    const analysisJsonText = geminiData.candidates[0].content.parts[0].text;
    const analysisObject: AIAnalysis = JSON.parse(analysisJsonText);

    console.log(`Análisis generado. Guardando en caché para: ${eventIdentifier}`);
    const { error: insertError } = await adminSupabaseClient
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












