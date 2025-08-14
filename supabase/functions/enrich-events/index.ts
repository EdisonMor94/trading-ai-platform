import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts';

// Función auxiliar para generar descripciones en lotes con reintentos
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

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

  const maxRetries = 3;
  let delayTime = 2000;

  for (let i = 0; i < maxRetries; i++) {
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

      if (response.ok) {
        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          return JSON.parse(data.candidates[0].content.parts[0].text);
        }
        return {};
      }

      if (response.status === 503 && i < maxRetries - 1) {
        console.log(`[AI Batch] API sobrecargada. Reintentando en ${delayTime / 1000}s...`);
        await delay(delayTime);
        delayTime *= 2;
        continue;
      }
      
      throw new Error(`La API de Gemini falló con estado: ${response.status}`);

    } catch (error) {
      console.error(`[AI Batch] Error procesando el lote (intento ${i + 1}):`, error);
      if (i === maxRetries - 1) return {};
    }
  }
  return {};
}


Deno.serve(async (_req) => {
  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Una o más variables de entorno críticas no están configuradas.");
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Buscar hasta 1000 eventos que no tengan descripción
    console.log("[Enricher] Buscando eventos sin descripción...");
    const { data: eventsToEnrich, error: fetchError } = await supabaseClient
      .from('economic_events')
      .select('id, event_original')
      .is('event_description', null)
      .limit(1000);

    if (fetchError) throw fetchError;

    if (!eventsToEnrich || eventsToEnrich.length === 0) {
      console.log("[Enricher] No se encontraron eventos para enriquecer.");
      return new Response(JSON.stringify({ message: "No hay eventos nuevos para enriquecer." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    
    console.log(`[Enricher] Se encontraron ${eventsToEnrich.length} eventos para enriquecer.`);

    // 2. Obtener una lista de nombres de eventos únicos para no pedir la misma descripción varias veces
    const uniqueEventNames = [...new Set(eventsToEnrich.map(e => e.event_original))];
    console.log(`[Enricher] De los cuales, ${uniqueEventNames.length} son nombres únicos.`);

    // 3. Generar las descripciones en lotes
    let allDescriptions: Record<string, string> = {};
    const aiBatchSize = 25;

    for (let i = 0; i < uniqueEventNames.length; i += aiBatchSize) {
      const batch = uniqueEventNames.slice(i, i + aiBatchSize);
      console.log(`[AI Batch] Solicitando descripciones para un lote de ${batch.length} eventos.`);
      const batchDescriptions = await generateDescriptionsInBatch(batch, GEMINI_API_KEY);
      allDescriptions = { ...allDescriptions, ...batchDescriptions };
    }

    // 4. Actualizar la base de datos
    let updatedCount = 0;
    for (const eventName in allDescriptions) {
      const description = allDescriptions[eventName];
      if (description) {
        console.log(`[Supabase] Actualizando descripción para "${eventName}"...`);
        const { error: updateError } = await supabaseClient
          .from('economic_events')
          .update({ event_description: description })
          .eq('event_original', eventName)
          .is('event_description', null); // Solo actualiza si sigue siendo null

        if (updateError) {
          console.error(`[Supabase] Falló la actualización para "${eventName}":`, updateError);
        } else {
          updatedCount++;
        }
      }
    }

    return new Response(JSON.stringify({ message: `Proceso completado. Se actualizaron las descripciones para ${updatedCount} tipos de eventos únicos.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("[Enricher] Error General:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

