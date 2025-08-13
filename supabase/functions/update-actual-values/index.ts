import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (_req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Obtener la clave de API de FMP
    const FMP_API_KEY = Deno.env.get("FMP_API_KEY");
    if (!FMP_API_KEY) throw new Error("FMP_API_KEY no está configurada.");

    // 2. Preparar un rango de tiempo corto (desde hace 15 minutos hasta ahora)
    const now = new Date();
    const pastDate = new Date(now.getTime() - 15 * 60 * 1000); // 15 minutos atrás
    
    const fromDate = pastDate.toISOString().split('T')[0];
    const toDate = now.toISOString().split('T')[0];

    // 3. Llamar a la API de FMP pidiendo solo los eventos en este rango corto
    const calendarUrl = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${fromDate}&to=${toDate}&apikey=${FMP_API_KEY}`;
    console.log(`[update-actuals] Obteniendo valores actuales recientes...`);
    const response = await fetch(calendarUrl);
    if (!response.ok) throw new Error(`Error al obtener datos de FMP: ${response.statusText}`);
    const recentEvents = await response.json();
    if (!Array.isArray(recentEvents)) throw new Error("La respuesta de FMP no es un formato válido.");

    // 4. Filtrar solo los eventos que tienen un valor 'actual' real
    const eventsToUpdate = recentEvents.filter(event => event.actual !== null && event.actual !== undefined);

    if (eventsToUpdate.length === 0) {
      return new Response(JSON.stringify({ message: "No hay valores actuales para actualizar." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    // 5. Actualizar cada evento en la base de datos
    console.log(`[update-actuals] Actualizando ${eventsToUpdate.length} eventos.`);
    for (const event of eventsToUpdate) {
      const event_id = `${event.date}-${event.event}`;
      
      await supabaseClient
        .from('economic_events')
        .update({ actual: event.actual })
        .eq('event_id', event_id);
    }

    return new Response(JSON.stringify({ message: `${eventsToUpdate.length} valores actuales actualizados.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    console.error("[update-actual-values] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
