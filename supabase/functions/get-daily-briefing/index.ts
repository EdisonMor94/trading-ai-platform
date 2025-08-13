import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts';

// Función para obtener la fecha actual en formato YYYY-MM-DD
const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0];
};

Deno.serve(async (req) => {
  // Manejo de la petición pre-vuelo (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Seguridad: Verificar que el usuario esté autenticado
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Acceso denegado: Usuario no autenticado.');

    // 2. Obtener claves de API de forma segura
    const FMP_API_KEY = Deno.env.get("FMP_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!FMP_API_KEY || !GEMINI_API_KEY) {
      throw new Error("Las claves de API (FMP o Gemini) no están configuradas.");
    }

    // 3. Obtener eventos de alto impacto para HOY desde FMP
    const today = getTodayDateString();
    const calendarUrl = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${today}&to=${today}&apikey=${FMP_API_KEY}`;
    
    const fmpResponse = await fetch(calendarUrl);
    if (!fmpResponse.ok) throw new Error('No se pudieron obtener los datos del calendario económico.');
    
    const allEventsToday = await fmpResponse.json();
    const highImpactEvents = allEventsToday
      .filter((event: any) => event.impact === 'High')
      .map((event: any) => `- ${event.event} (${event.currency}) a las ${new Date(event.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`)
      .join('\n');

    // 4. Construir el Prompt para Gemini
    const prompt = `
      **Rol:** Eres "AImpatfx", un analista de mercados senior que escribe el resumen matutino para un trader profesional.
      **Contexto:** Hoy es ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
      **Eventos Clave del Día (Alto Impacto):**
      ${highImpactEvents.length > 0 ? highImpactEvents : "No hay eventos de alto impacto programados para hoy."}

      **Tarea:**
      Basado en los eventos clave, escribe un resumen de mercado conciso y profesional de 1 a 2 frases (máximo 40 palabras). El resumen debe ser directo, informativo y destacar el evento más importante que podría generar volatilidad. Si no hay eventos, menciona que se espera un día tranquilo.
    `;

    // 5. Llamar a la API de Gemini para generar el texto
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      })
    });

    if (!geminiResponse.ok) {
      throw new Error(`Error en la API de Gemini: ${await geminiResponse.text()}`);
    }

    const geminiData = await geminiResponse.json();
    const briefingText = geminiData.candidates[0].content.parts[0].text;

    // 6. Devolver el resumen en un objeto JSON
    return new Response(JSON.stringify({ briefing: briefingText.trim() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error en la función get-daily-briefing:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

