import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";

// --- NUEVA FUNCIÓN DE VALIDACIÓN ---
const validateRecommendationResult = (data: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (!data || typeof data !== 'object') {
        return { isValid: false, errors: ["La respuesta no es un objeto JSON."] };
    }

    const topLevelKeys = ['resumen_analitico', 'indice_confianza', 'recomendacion_estrategica'];
    for (const key of topLevelKeys) {
        if (data[key] === undefined || data[key] === null) {
            errors.push(`Falta el objeto principal: '${key}'.`);
        }
    }

    if (errors.length > 0) {
        return { isValid: false, errors };
    }

    // Puedes añadir validaciones más profundas aquí si es necesario
    if (typeof data.indice_confianza.puntuacion !== 'number') {
        errors.push("El campo 'puntuacion' debe ser un número.");
    }
    if (typeof data.recomendacion_estrategica.estrategia !== 'string') {
        errors.push("El campo 'estrategia' debe ser un string.");
    }

    return { isValid: errors.length === 0, errors };
};


// --- FUNCIÓN PRINCIPAL DEL SERVIDOR ---
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    let request_id: string | null = null;

    try {
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY no está configurada.");

        const body = await req.json();
        const record = body.record;
        request_id = record.id;
        if (!request_id) { throw new Error("Falta el ID del registro en el payload."); }

        if (record.status !== 'generating') {
            return new Response(JSON.stringify({ message: `No action needed for status: ${record.status}` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        const { analysis_result, market_data } = record;
        if (!analysis_result || !market_data) { throw new Error("Faltan datos para generar la recomendación."); }
        
        console.log(`[${request_id}] - Iniciando generación de recomendación mejorada.`);

        const finalPrompt = `
            Actúa como un analista de trading cuantitativo y gestor de riesgos. Tu tarea es analizar tres fuentes de datos: el análisis técnico subjetivo de un usuario, un set de datos de mercado objetivos, y un resumen del calendario económico. Debes devolver tu evaluación en un formato JSON estricto y sin ningún texto adicional fuera del bloque JSON.

            Datos de Entrada:
            \`\`\`json
            {
              "analisis_usuario": ${JSON.stringify(analysis_result)},
              "datos_mercado_e_indicadores": ${JSON.stringify(market_data)}
            }
            \`\`\`

            Tu Salida Debe Ser el Siguiente JSON, incluyendo siempre todas las claves:
            \`\`\`json
            {
              "resumen_analitico": {
                "analisis_fundamental": "String. Describe el sentimiento derivado de las noticias y su impacto potencial.",
                "puntos_confluencia": ["String. Lista de puntos donde el análisis técnico y fundamental coinciden."],
                "puntos_divergencia": ["String. Lista de puntos donde el análisis técnico y fundamental se contradicen."]
              },
              "indice_confianza": {
                "puntuacion": "Integer. Un valor numérico de 0 a 100.",
                "justificacion": "String. Justifica la puntuación basándote en el balance entre confluencias, divergencias y el riesgo de las noticias futuras."
              },
              "recomendacion_estrategica": {
                "estrategia": "String. Una de tres opciones: 'COMPRAR', 'VENDER' o 'ESPERAR'.",
                "justificacion_estrategia": "String. Explica por qué se elige esa estrategia, especialmente en relación a las noticias económicas.",
                "plan_de_trading": {
                  "entrada_sugerida": "String. Nivel de precio para la entrada o 'N/A'.",
                  "stop_loss": "String. Nivel de precio para el stop-loss, posiblemente más amplio si se espera volatilidad, o 'N/A'.",
                  "take_profit": "String. Nivel de precio para el take-profit o 'N/A'."
                }
              }
            }
            \`\`\`
        `;

        const geminiPayload = {
            contents: [{ parts: [{ text: finalPrompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        };

        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;
        
        const geminiResponse = await fetch(geminiApiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiPayload) });

        if (!geminiResponse.ok) {
            const errorBody = await geminiResponse.text();
            throw new Error(`Error en la API de Gemini (${geminiResponse.status}): ${errorBody}`);
        }
        
        const geminiJson = await geminiResponse.json();
        const recommendationText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!recommendationText) { throw new Error("La respuesta de Gemini tiene un formato inesperado."); }
        
        const finalRecommendationJson = JSON.parse(recommendationText);

        // --- VALIDACIÓN AÑADIDA ---
        const { isValid, errors } = validateRecommendationResult(finalRecommendationJson);
        if (!isValid) {
            throw new Error(`El JSON de Gemini falló la validación final: ${errors.join(', ')}`);
        }

        const { error: updateError } = await supabaseAdmin.from('analysis_requests').update({
            status: 'complete',
            final_recommendation: finalRecommendationJson
        }).eq('id', request_id);

        if (updateError) { throw new Error(`Error al actualizar el estado a 'complete': ${updateError.message}`); }
        
        console.log(`[${request_id}] - Proceso completado exitosamente.`);

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        console.error(`[${request_id || 'ID no disponible'}] - Error FATAL en generate-recommendation:`, error);
        if (request_id) {
            await supabaseAdmin.from('analysis_requests').update({ status: 'failed', error_message: `Error en recomendación: ${errorMessage}` }).eq('id', request_id);
        }
        return new Response(JSON.stringify({ error: "Ocurrió un error interno." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});