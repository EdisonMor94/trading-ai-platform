import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts';

// Función auxiliar para traducir textos en lotes (sin cambios)
async function translateTexts(texts: string[], apiKey: string): Promise<string[]> {
  if (texts.length === 0) return [];
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  const batchSize = 128;
  let allTranslatedTexts: string[] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: batch, target: 'es', source: 'en' }),
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Error con la API de Google Translate: ${errorBody}`);
    }
    const result = await response.json();
    const translatedBatch = result.data.translations.map((t: { translatedText: string }) => t.translatedText);
    allTranslatedTexts = allTranslatedTexts.concat(translatedBatch);
  }
  return allTranslatedTexts;
}

Deno.serve(async (_req) => {
  try {
    // Usamos el Service Role Key para tener permisos de escritura en la base de datos
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Obtener claves de API
    const FMP_API_KEY = Deno.env.get("FMP_API_KEY");
    const GOOGLE_TRANSLATE_API_KEY = Deno.env.get("GOOGLE_TRANSLATE_API_KEY");
    if (!FMP_API_KEY || !GOOGLE_TRANSLATE_API_KEY) {
      throw new Error("Una o más claves de API no están configuradas.");
    }

    // 2. Preparar fechas (obtenemos un rango más amplio, ej. 14 días)
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 14);
    const fromDate = today.toISOString().split('T')[0];
    const toDate = futureDate.toISOString().split('T')[0];

    // 3. Llamar a la API de FMP
    const calendarUrl = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${fromDate}&to=${toDate}&apikey=${FMP_API_KEY}`;
    console.log(`[update-calendar] Obteniendo eventos de FMP desde ${fromDate} hasta ${toDate}`);
    const response = await fetch(calendarUrl);
    if (!response.ok) throw new Error(`Error al obtener datos de FMP: ${response.statusText}`);
    const rawData = await response.json();
    if (!Array.isArray(rawData)) throw new Error("La respuesta de FMP no es un formato válido.");

    // 4. Traducir los eventos
    const eventNamesToTranslate = rawData.map(event => event.event);
    const translatedEventNames = await translateTexts(eventNamesToTranslate, GOOGLE_TRANSLATE_API_KEY);

    // 5. Preparar los datos para la base de datos
    const eventsToUpsert = rawData.map((event, index) => {
      const event_id = `${event.date}-${event.event}`; // Creamos el ID único
      const previousValue = event.previous ?? event.prev;

      return {
        event_id: event_id,
        date: event.date,
        country: event.country,
        currency: event.currency,
        event_original: event.event,
        event_translated: translatedEventNames[index] || event.event,
        impact: event.impact,
        actual: event.actual ?? '---',
        estimate: event.estimate ?? '---',
        previous: previousValue ?? '---',
      };
    });

    if (eventsToUpsert.length === 0) {
      console.log("[update-calendar] No hay eventos para actualizar.");
      return new Response(JSON.stringify({ message: "No hay eventos nuevos para actualizar." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 6. Guardar los datos en la tabla 'economic_events'
    // 'upsert' actualizará los eventos existentes y creará los nuevos.
    console.log(`[update-calendar] Guardando/Actualizando ${eventsToUpsert.length} eventos en la base de datos.`);
    const { error } = await supabaseClient
      .from('economic_events')
      .upsert(eventsToUpsert, { onConflict: 'event_id' }); // Le decimos que el conflicto se resuelve con 'event_id'

    if (error) {
      throw error; // Si hay un error con la base de datos, lo lanzamos
    }

    // 7. Devolver una respuesta de éxito
    return new Response(JSON.stringify({ message: `${eventsToUpsert.length} eventos actualizados correctamente.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("[update-calendar] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

