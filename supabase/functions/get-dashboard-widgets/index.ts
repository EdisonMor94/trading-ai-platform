import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Autenticar usuario
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado.');

    const FMP_API_KEY = Deno.env.get("FMP_API_KEY");
    if (!FMP_API_KEY) throw new Error("FMP_API_KEY no está configurada.");

    // 2. Obtener la lista de seguimiento (watchlist) del perfil del usuario
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('watchlist')
      .eq('id', user.id)
      .single();

    if (profileError) throw new Error('No se pudo obtener el perfil del usuario.');
    
    // Usamos la lista del usuario o los valores por defecto si está vacía
    const watchlistSymbols = profile?.watchlist && profile.watchlist.length > 0
      ? profile.watchlist
      : ['EURUSD', 'XAUUSD', 'BTCUSD'];

    // 3. Obtener datos de precios para la watchlist desde FMP
    const symbolsString = watchlistSymbols.join(',');
    const quoteUrl = `https://financialmodelingprep.com/api/v3/quote/${symbolsString}?apikey=${FMP_API_KEY}`;
    const quoteResponse = await fetch(quoteUrl);
    if (!quoteResponse.ok) throw new Error('Error al obtener datos de precios.');
    const watchlistData = await quoteResponse.json();

    // 4. Obtener próximos eventos económicos de FMP (próximas 48 horas)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 2);
    const fromDate = today.toISOString().split('T')[0];
    const toDate = tomorrow.toISOString().split('T')[0];

    const calendarUrl = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${fromDate}&to=${toDate}&apikey=${FMP_API_KEY}`;
    const calendarResponse = await fetch(calendarUrl);
    if (!calendarResponse.ok) throw new Error('Error al obtener el calendario.');
    const allEvents = await calendarResponse.json();

    // Filtramos solo los próximos 3 eventos de impacto Medio o Alto
    const upcomingEvents = allEvents
      .filter((event: any) => 
        new Date(event.date) > new Date() && // Solo eventos futuros
        (event.impact === 'High' || event.impact === 'Medium')
      )
      .slice(0, 3);

    // 5. Devolver todos los datos juntos
    return new Response(JSON.stringify({
      watchlistData,
      upcomingEvents
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error en get-dashboard-widgets:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
