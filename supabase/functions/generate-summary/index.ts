import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// --- CORRECCIÓN: La ruta de importación ahora es correcta ---
import { corsHeaders } from '../_shared/cors.ts';

// --- Esquema JSON con 'puntuacion' como INTEGER ---
const summarySchema = {
    type: "OBJECT",
    properties: {
        "resumen_analitico": {
            type: "OBJECT",
            properties: {
                "analisis_fundamental": { type: "STRING" },
                "puntos_confluencia": { type: "ARRAY", items: { type: "STRING" } },
                "puntos_divergencia": { type: "ARRAY", items: { type: "STRING" } },
            },
            required: ["analisis_fundamental", "puntos_confluencia", "puntos_divergencia"]
        },
        "indice_confianza": {
            type: "OBJECT",
            properties: {
                "puntuacion": { 
                    type: "INTEGER",
                    description: "Un número entero (no decimal) entre 0 y 100."
                },
                "justificacion": { type: "STRING" },
            },
            required: ["puntuacion", "justificacion"]
        },
    },
    required: ["resumen_analitico", "indice_confianza"]
};

// --- Función de limpieza y validación ---
const sanitizeAndValidateSummary = (data) => {
    let sanitizedData = { ...data };
    if (sanitizedData.indice_confianza && typeof sanitizedData.indice_confianza.puntuacion === 'string') {
        const parsedScore = parseInt(sanitizedData.indice_confianza.puntuacion, 10);
        if (!isNaN(parsedScore)) {
            sanitizedData.indice_confianza.puntuacion = parsedScore;
        }
    }
    const errors = [];
    if (typeof sanitizedData.indice_confianza?.puntuacion !== 'number') {
        errors.push("El campo 'puntuacion' debe ser un número.");
    }
    return { isValid: errors.length === 0, errors, sanitizedData };
};

// --- FUNCIÓN PRINCIPAL DEL SERVIDOR ---
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    let request_id = null;
    try {
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY no está configurada.");

        const body = await req.json();
        const record = body.record;
        request_id = record.id;
        if (!request_id) throw new Error("Falta el ID del registro en el payload del webhook.");
        if (record.status !== 'generating') {
            return new Response(JSON.stringify({ message: `No action needed for status: ${record.status}` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { analysis_result, market_data } = record;
        if (!analysis_result || !market_data) throw new Error("Faltan datos para generar el resumen.");

        console.log(`[${request_id}] - Iniciando generación de resumen y confianza.`);
        
        const summaryPrompt = `
            Actúa como un analista de trading cuantitativo. Tu tarea es analizar dos fuentes de datos y devolver tu evaluación en un formato JSON estricto que se adhiera al esquema proporcionado.
            Para "puntuacion", debes devolver un **número entero (integer)** entre 0 y 100. Por ejemplo: 85, no 0.85.

            **Datos de Entrada:**
            \`\`\`json
            {
              "analisis_usuario": ${JSON.stringify(analysis_result)},
              "datos_mercado_e_indicadores": ${JSON.stringify(market_data)}
            }
            \`\`\`
        `;

        const geminiPayload = {
            contents: [{ parts: [{ text: summaryPrompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: summarySchema,
            }
        };

        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;
        const geminiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload)
        });

        if (!geminiResponse.ok) {
            const errorBody = await geminiResponse.text();
            throw new Error(`Error en la API de Gemini (${geminiResponse.status}): ${errorBody}`);
        }

        const geminiJson = await geminiResponse.json();
        const summaryText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!summaryText) throw new Error("La respuesta de Gemini para el resumen tiene un formato inesperado.");

        const initialJson = JSON.parse(summaryText);
        const { isValid, errors, sanitizedData } = sanitizeAndValidateSummary(initialJson);
        if (!isValid) throw new Error(`El JSON de Gemini falló la validación del resumen: ${errors.join(', ')}`);

        const { error: updateError } = await supabaseAdmin.from('analysis_requests').update({
            status: 'generating-plan',
            summary_result: sanitizedData
        }).eq('id', request_id);

        if (updateError) throw new Error(`Error al actualizar el estado a 'generating-plan': ${updateError.message}`);

        console.log(`[${request_id}] - Resumen generado exitosamente.`);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";
        console.error(`[${request_id || 'ID no disponible'}] - Error FATAL en generate-summary:`, error);
        if (request_id) {
            await supabaseAdmin.from('analysis_requests').update({
                status: 'failed',
                error_message: `Error en resumen: ${errorMessage}`
            }).eq('id', request_id);
        }
        return new Response(JSON.stringify({ error: "Ocurrió un error interno." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});

