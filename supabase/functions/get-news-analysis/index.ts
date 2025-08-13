import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Autenticar al usuario
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // 2. Obtener las claves de API de forma segura
    const FMP_API_KEY = Deno.env.get("FMP_API_KEY");
    if (!FMP_API_KEY) throw new Error("FMP_API_KEY no está configurada.");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY no está configurada.");
    
    // 3. Obtener el símbolo del activo desde el frontend
    const { symbol } = await req.json();
    if (!symbol) {
      throw new Error("Falta el símbolo del activo.");
    }

    // 4. Obtener las últimas 5 noticias del activo desde FMP
    const newsUrl = `https://financialmodelingprep.com/api/v3/stock_news?tickers=${symbol}&limit=5&apikey=${FMP_API_KEY}`;
    const newsResponse = await fetch(newsUrl);
    if (!newsResponse.ok) {
        throw new Error('No se pudieron obtener las noticias del activo desde FMP.');
    }
    const newsData = await newsResponse.json();

    if (!newsData || newsData.length === 0) {
        return new Response(JSON.stringify({ analysis: "No se encontraron noticias recientes para este activo." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    // 5. Preparar el prompt para Gemini
    const headlines = newsData.map(n => `- ${n.title}`).join('\n');
    const prompt = `
        Actúa como un analista financiero experto. Basándote únicamente en los siguientes titulares de noticias para el activo ${symbol}, explica en un párrafo conciso y claro cuál es la causa más probable del movimiento reciente del precio. Sé directo y enfócate en el sentimiento del mercado.

        Titulares Recientes:
        ${headlines}

        Análisis:
    `;

    // 6. Llamar a la API de Gemini para generar el análisis
    const geminiPayload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 200,
      }
    };
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;
    const geminiResponse = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload)
    });

    if (!geminiResponse.ok) {
      throw new Error('Error al generar el análisis con la IA.');
    }

    const geminiJson = await geminiResponse.json();
    const analysisText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;

    // 7. Devolver la respuesta al frontend
    return new Response(JSON.stringify({ analysis: analysisText || "No se pudo generar un análisis." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error en get-news-analysis:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

