import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verificar autenticación del usuario (como antes)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // 2. Preparar las fechas para la consulta a nuestra base de datos
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Empezar desde el inicio del día de hoy
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    // 3. Leer los eventos directamente desde la tabla 'economic_events'
    console.log(`[get-calendar] Obteniendo eventos desde la base de datos.`);
    const { data: events, error } = await supabaseClient
      .from('economic_events')
      .select('*')
      .gte('date', today.toISOString()) // Mayor o igual que hoy
      .lte('date', nextWeek.toISOString()) // Menor o igual que la próxima semana
      .order('date', { ascending: true }); // Ordenar por fecha

    if (error) throw error;
    
    // 4. Renombrar 'event_translated' a 'event' para que coincida con lo que el frontend espera
    const formattedEvents = events.map(event => {
        // Hacemos una copia para no modificar el objeto original directamente
        const newEvent = { ...event };
        // Renombramos la propiedad
        newEvent.event = newEvent.event_translated;
        // Eliminamos las propiedades que el frontend no necesita
        delete newEvent.event_translated;
        delete newEvent.event_original;
        return newEvent;
    });

    // 5. Devolver los datos al frontend
    return new Response(JSON.stringify(formattedEvents), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("[get-economic-calendar] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});


