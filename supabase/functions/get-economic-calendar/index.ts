import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { dateRange } = await req.json();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let fromDate: Date;
    let toDate: Date;

    switch (dateRange) {
      case 'tomorrow':
        fromDate = new Date(today);
        fromDate.setDate(today.getDate() + 1);
        toDate = new Date(fromDate);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'thisWeek':
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        fromDate = new Date(today.setDate(diff));
        toDate = new Date(fromDate);
        toDate.setDate(fromDate.getDate() + 6);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'today':
      default:
        fromDate = today;
        toDate = new Date(today);
        toDate.setHours(23, 59, 59, 999);
        break;
    }
    
    const fromISO = fromDate.toISOString();
    const toISO = toDate.toISOString();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // --- INICIO DE LA CORRECCIÓN ---
    // Se corrige el nombre de la columna 'event' por 'event_translated'.
    // Usamos un alias "event: event_translated" para que la respuesta JSON
    // siga teniendo la propiedad 'event' que el frontend espera.
    const { data, error } = await supabaseClient
      .from('economic_events')
      .select('date, country, currency, event: event_translated, impact, actual, estimate, previous, event_description')
      .gte('date', fromISO)
      .lte('date', toISO)
      .order('date', { ascending: true });
    // --- FIN DE LA CORRECCIÓN ---

    if (error) {
      console.error('[get-calendar] Error en la consulta a Supabase:', error);
      throw new Error(`Error al obtener los eventos: ${error.message}`);
    }

    console.log(`[get-calendar] Se encontraron ${data.length} eventos.`);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("[get-calendar] Error general en la función:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});





