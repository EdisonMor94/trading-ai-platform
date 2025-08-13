import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";

// --- Esquema JSON (sin cambios) ---
const recommendationSchema = {
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
        "puntuacion": { type: "INTEGER", description: "Un número entero (no decimal) entre 0 y 100." },
        "justificacion": { type: "STRING" },
      },
      required: ["puntuacion", "justificacion"]
    },
    "recomendacion_estrategica": {
      type: "OBJECT",
      properties: {
        "estrategia": { type: "STRING", enum: ["COMPRAR", "VENDER", "ESPERAR"] },
        "justificacion_estrategia": { type: "STRING" },
        "plan_de_trading": {
          type: "OBJECT",
          properties: {
            "entrada_sugerida": { type: "STRING" },
            "stop_loss": { type: "STRING" },
            "take_profit": { type: "STRING" },
          },
          required: ["entrada_sugerida", "stop_loss", "take_profit"]
        },
        "plan_de_vigilancia": {
            type: "OBJECT",
            description: "Obligatorio si la estrategia es 'ESPERAR'. Proporciona condiciones claras para actuar.",
            properties: {
                "condicion_compra": { type: "STRING", description: "Describe qué señal o ruptura de nivel activaría una compra." },
                "condicion_venta": { type: "STRING", description: "Describe qué señal o ruptura de nivel activaría una venta." }
            },
        }
      },
      required: ["estrategia", "justificacion_estrategia", "plan_de_trading"]
    },
  },
  required: ["resumen_analitico", "indice_confianza", "recomendacion_estrategica"]
};

// --- Función de limpieza y validación (sin cambios) ---
const sanitizeAndValidateResponse = (data) => {
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
  if (typeof sanitizedData.recomendacion_estrategica?.estrategia !== 'string') {
    errors.push("El campo 'estrategia' debe ser un string.");
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
    if (!request_id) throw new Error("Falta el ID del registro en el payload.");
    if (record.status !== 'generating') {
      return new Response(JSON.stringify({ message: `No action needed for status: ${record.status}` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { analysis_result, market_data, user_id } = record; // Obtenemos el user_id
    if (!analysis_result || !market_data) throw new Error("Faltan datos para generar la recomendación.");
    if (!user_id) throw new Error("Falta el user_id en el registro para deducir el crédito.");

    console.log(`[${request_id}] - Iniciando generación de recomendación final.`);
    
    const finalPrompt = `
      Actúa como un analista de trading cuantitativo experto. Tu tarea es analizar los datos y devolver un JSON estricto que se adhiera al esquema.
      - Para "puntuacion", devuelve un **número entero** entre 0 y 100.
      - **MUY IMPORTANTE:** Si la "estrategia" es 'ESPERAR', DEBES rellenar el objeto "plan_de_vigilancia" con condiciones claras y accionables para comprar o vender. Si la estrategia es 'COMPRAR' o 'VENDER', puedes dejar las condiciones como "N/A".

      Datos de Entrada:
      \`\`\`json
      {
        "analisis_usuario": ${JSON.stringify(analysis_result)},
        "datos_mercado_e_indicadores": ${JSON.stringify(market_data)}
      }
      \`\`\`
    `;

    const geminiPayload = {
      contents: [{ parts: [{ text: finalPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: recommendationSchema,
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
    const recommendationText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!recommendationText) throw new Error("La respuesta de Gemini tiene un formato inesperado.");

    const initialJson = JSON.parse(recommendationText);
    const { isValid, errors, sanitizedData } = sanitizeAndValidateResponse(initialJson);
    if (!isValid) throw new Error(`El JSON de Gemini falló la validación final: ${errors.join(', ')}`);

    // --- CORRECCIÓN: Lógica para deducir el crédito en el backend ---
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('analysis_credits')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      throw new Error(`Perfil no encontrado para el usuario ${user_id} al intentar deducir crédito.`);
    }

    if (profile.analysis_credits > 0) {
      const newCredits = profile.analysis_credits - 1;
      const { error: creditUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({ analysis_credits: newCredits })
        .eq('id', user_id);

      if (creditUpdateError) {
        throw new Error(`Error al actualizar los créditos para el usuario ${user_id}: ${creditUpdateError.message}`);
      }
      console.log(`[${request_id}] - Crédito deducido para ${user_id}. Restantes: ${newCredits}`);
    } else {
      console.warn(`[${request_id}] - Intento de análisis sin créditos para el usuario ${user_id}.`);
    }

    // --- Actualización final del análisis ---
    const { error: updateError } = await supabaseAdmin.from('analysis_requests').update({
      status: 'complete',
      final_recommendation: sanitizedData
    }).eq('id', request_id);

    if (updateError) throw new Error(`Error al actualizar el estado a 'complete': ${updateError.message}`);

    console.log(`[${request_id}] - Proceso completado exitosamente.`);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error(`[${request_id || 'ID no disponible'}] - Error FATAL en generate-recommendation:`, error);
    if (request_id) {
      await supabaseAdmin.from('analysis_requests').update({
        status: 'failed',
        error_message: `Error en recomendación: ${errorMessage}`
      }).eq('id', request_id);
    }
    return new Response(JSON.stringify({ error: "Ocurrió un error interno." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

