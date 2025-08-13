import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts';

// --- FUNCIÓN DE TRADUCCIÓN MODIFICADA ---
async function translateTexts(texts: string[], apiKey: string): Promise<string[]> {
  if (texts.length === 0) {
    return [];
  }

  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  const batchSize = 128; // El límite máximo de la API de Google
  let allTranslatedTexts: string[] = [];

  console.log(`Total de textos a traducir: ${texts.length}. Procesando en lotes de ${batchSize}...`);

  // Dividir el array de textos en lotes más pequeños
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    console.log(`Traduciendo lote ${Math.floor(i / batchSize) + 1}...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: batch,
        target: 'es',
        source: 'en',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      // Si un lote falla, lanzamos un error para detener el proceso
      throw new Error(`Error al conectar con la API de Google Translate: ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json();
    const translatedBatch = result.data.translations.map((t: { translatedText: string }) => t.translatedText);
    
    // Añadir los resultados de este lote al array principal
    allTranslatedTexts = allTranslatedTexts.concat(translatedBatch);
  }

  console.log("Traducción completada para todos los lotes.");
  return allTranslatedTexts;
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verificar autenticación (sin cambios)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // 2. Obtener claves de API de forma segura (sin cambios)
    const FMP_API_KEY = Deno.env.get("FMP_API_KEY");
    if (!FMP_API_KEY) {
      throw new Error("FMP_API_KEY no está configurada.");
    }
    
    const GOOGLE_TRANSLATE_API_KEY = Deno.env.get("GOOGLE_TRANSLATE_API_KEY");
    if (!GOOGLE_TRANSLATE_API_KEY) {
      throw new Error("GOOGLE_TRANSLATE_API_KEY no está configurada.");
    }

    // 3. Preparar fechas (sin cambios)
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const fromDate = today.toISOString().split('T')[0];
    const toDate = nextWeek.toISOString().split('T')[0];

    // 4. Llamar a la API de FMP (sin cambios)
    const calendarUrl = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${fromDate}&to=${toDate}&apikey=${FMP_API_KEY}`;
    console.log(`Fetching economic calendar from: ${fromDate} to ${toDate}`);
    const response = await fetch(calendarUrl);
    if (!response.ok) {
      throw new Error(`Error al obtener datos de FMP: ${response.statusText}`);
    }
    const rawData = await response.json();

    // 5. Procesar, TRADUCIR y limpiar los datos (sin cambios en esta sección)
    if (!Array.isArray(rawData)) {
      if (rawData["Error Message"]) {
        throw new Error(`Error de la API de FMP: ${rawData["Error Message"]}`);
      }
      throw new Error("La respuesta de FMP no es un formato de eventos válido.");
    }

    const eventNamesToTranslate = rawData.map(event => event.event);
    const translatedEventNames = await translateTexts(eventNamesToTranslate, GOOGLE_TRANSLATE_API_KEY);

    const processedData = rawData.map((event, index) => {
      const previousValue = event.previous ?? event.prev;

      return {
        ...event,
        event: translatedEventNames[index] || event.event,
        actual: event.actual ?? '---',
        estimate: event.estimate ?? '---',
        previous: previousValue ?? '---'
      };
    });

    // 6. Devolver los datos ya traducidos y procesados (sin cambios)
    return new Response(JSON.stringify(processedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error en la función get-economic-calendar:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

