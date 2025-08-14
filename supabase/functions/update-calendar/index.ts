import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts';

// --- INICIO DE LA MODIFICACIÓN ---
// La función ahora genera descripciones para un LOTE de eventos en una sola llamada.
async function generateDescriptionsInBatch(eventNames: string[], apiKey: string): Promise<Record<string, string>> {
  if (!apiKey || eventNames.length === 0) {
    return {};
  }

  const prompt = `
    Eres un analista financiero y economista experto.
    Tu tarea es generar una descripción clara y concisa para cada uno de los siguientes indicadores económicos.
    La descripción debe explicar qué mide el indicador y por qué es importante para los mercados.
    
    Devuelve tu respuesta como un único objeto JSON. Las claves del objeto deben ser los nombres exactos de los eventos que te proporciono, y los valores deben ser sus respectivas descripciones.
    
    Ejemplo de formato de respuesta:
    {
      "Existing Home Sales (MoM)": "Mide el cambio mensual en el número de viviendas de segunda mano vendidas. Es un indicador clave de la salud del sector inmobiliario y del gasto del consumidor.",
      "Unemployment Rate": "Representa el porcentaje de la fuerza laboral total que está desempleada pero buscando activamente empleo. Es uno de los indicadores más importantes de la salud económica general."
    }

    Lista de eventos a describir:
    ${eventNames.join('\n')}
  `;

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });

    if (!response.ok) {
      console.error(`[AI Batch] La API de Gemini falló con estado: ${response.status}`);
      return {};
    }

    const data = await response.json();
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      // Parseamos el texto JSON que nos devuelve la IA
      return JSON.parse(data.candidates[0].content.parts[0].text);
    }
    return {};
  } catch (error) {
    console.error(`[AI Batch] Error procesando el lote de descripciones:`, error);
    return {};
  }
}
// --- FIN DE LA MODIFICACIÓN ---


async function translateTexts(texts: string[], apiKey: string): Promise<string[]> {
  if (texts.length === 0) return [];
  if (!apiKey) {
    console.error("[Translate] La clave de API de Google Translate no está configurada.");
    return texts;
  }
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  const batchSize = 128;
  let allTranslatedTexts: string[] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: batch, target: 'es', source: 'en' }),
      });
      if (!response.ok) {
        console.error(`[Translate] La API de Google Translate falló: ${await response.text()}`);
        allTranslatedTexts = allTranslatedTexts.concat(batch);
      } else {
        const result = await response.json();
        const translatedBatch = result.data.translations.map((t: { translatedText: string }) => t.translatedText);
        allTranslatedTexts = allTranslatedTexts.concat(translatedBatch);
      }
    } catch (error) {
        console.error("[Translate] Error en fetch a Google Translate:", error);
        allTranslatedTexts = allTranslatedTexts.concat(batch);
    }
  }
  return allTranslatedTexts;
}

Deno.serve(async (_req) => {
  try {
    const FMP_API_KEY = Deno.env.get("FMP_API_KEY");
    const GOOGLE_TRANSLATE_API_KEY = Deno.env.get("GOOGLE_TRANSLATE_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!FMP_API_KEY || !GOOGLE_TRANSLATE_API_KEY || !GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Una o más variables de entorno críticas no están configuradas.");
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 14);
    const fromDate = today.toISOString().split('T')[0];
    const toDate = futureDate.toISOString().split('T')[0];

    const calendarUrl = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${fromDate}&to=${toDate}&apikey=${FMP_API_KEY}`;
    const response = await fetch(calendarUrl);
    if (!response.ok) throw new Error(`Error al obtener datos de FMP: ${response.statusText}`);
    const rawData = await response.json();
    if (!Array.isArray(rawData)) throw new Error("La respuesta de FMP no es un formato válido.");

    const uniqueEvents = new Map();
    rawData.forEach(event => { uniqueEvents.set(`${event.date}-${event.event}`, event); });
    const filteredRawData = Array.from(uniqueEvents.values());
    console.log(`[update-calendar] Se encontraron ${filteredRawData.length} eventos únicos.`);

    if (filteredRawData.length === 0) {
      return new Response(JSON.stringify({ message: "No hay eventos nuevos para procesar." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    const eventIdsFromFMP = filteredRawData.map(event => `${event.date}-${event.event}`);
    const batchSize = 100;
    let existingEvents: { event_id: string, event_description: string }[] = [];

    for (let i = 0; i < eventIdsFromFMP.length; i += batchSize) {
        const batch = eventIdsFromFMP.slice(i, i + batchSize);
        const { data, error } = await supabaseClient
            .from('economic_events')
            .select('event_id, event_description')
            .in('event_id', batch)
            .not('event_description', 'is', null);

        if (error) throw error;
        if (data) existingEvents = existingEvents.concat(data);
    }

    const describedEventIds = new Set(existingEvents.map(e => e.event_id));
    
    // --- LÓGICA DE IA POR LOTES ---
    const eventsToDescribe = filteredRawData.filter(event => !describedEventIds.has(`${event.date}-${event.event}`));
    const eventNamesToDescribe = [...new Set(eventsToDescribe.map(e => e.event_original))]; // Nombres únicos
    
    let descriptions: Record<string, string> = {};
    const aiBatchSize = 25; // Hacemos lotes de 25 para la IA
    for (let i = 0; i < eventNamesToDescribe.length; i += aiBatchSize) {
        const batch = eventNamesToDescribe.slice(i, i + aiBatchSize);
        console.log(`[AI Batch] Solicitando descripciones para un lote de ${batch.length} eventos.`);
        const batchDescriptions = await generateDescriptionsInBatch(batch, GEMINI_API_KEY);
        descriptions = { ...descriptions, ...batchDescriptions };
    }
    // --- FIN DE LÓGICA DE IA POR LOTES ---

    const translatedEventNames = await translateTexts(filteredRawData.map(e => e.event), GOOGLE_TRANSLATE_API_KEY);

    const eventsToUpsert = filteredRawData.map((event, i) => {
        const event_id = `${event.date}-${event.event}`;
        const description = descriptions[event.event_original] || null;

        return {
            event_id,
            date: event.date,
            country: event.country,
            currency: event.currency,
            event_original: event.event,
            event_translated: translatedEventNames[i] || event.event,
            impact: event.impact,
            actual: event.actual ?? '---',
            estimate: event.estimate ?? '---',
            previous: event.previous ?? event.prev ?? '---',
            ...(description && { event_description: description }),
        };
    });

    console.log(`[Supabase] Guardando/Actualizando ${eventsToUpsert.length} eventos.`);
    const { error } = await supabaseClient.from('economic_events').upsert(eventsToUpsert, { onConflict: 'event_id' });
    if (error) throw error;

    return new Response(JSON.stringify({ message: `${eventsToUpsert.length} eventos actualizados.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    console.error("[update-calendar] Error General:", error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});













