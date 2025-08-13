import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import { corsHeaders } from "../_shared/cors.ts";

// --- Esquema JSON estricto para la respuesta de Gemini ---
const analysisSchema = {
  type: "OBJECT",
  properties: {
    "activo": { type: "STRING", nullable: true },
    "temporalidad": { 
      type: "STRING", 
      enum: ['1m', '5m', '15m', '30m', 'H1', 'H4', 'D1', 'W1', 'MN'],
      nullable: true 
    },
    "patrones_identificados": {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          "nombre_patron": { type: "STRING", nullable: true },
          "descripcion": { type: "STRING", nullable: true },
        },
      },
    },
    "indicadores": {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          "nombre_indicador": { type: "STRING", nullable: true },
          "parametros": { type: "STRING", nullable: true },
          "estado_o_valor": { type: "STRING", nullable: true },
        },
      },
    },
    "patrones_velas": {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          "nombre_patron": { type: "STRING", nullable: true },
          "ubicacion": { type: "STRING", nullable: true },
        },
      },
    },
    "niveles_clave": {
      type: "OBJECT",
      properties: {
        "soportes": { type: "ARRAY", items: { type: "STRING" } },
        "resistencias": { type: "ARRAY", items: { type: "STRING" } },
      },
    },
    "evaluacion_niveles": { type: "STRING", nullable: true },
    "sentimiento_analisis": { 
      type: "STRING", 
      enum: ["Alcista", "Bajista", "Neutral"],
      nullable: true 
    },
  },
  required: ["activo", "temporalidad", "patrones_identificados", "indicadores", "patrones_velas", "niveles_clave", "evaluacion_niveles", "sentimiento_analisis"]
};

// --- Funciones de validación y normalización ---
const normalizeAsset = (asset)=>{
  if (!asset || typeof asset !== 'string') return null;
  let normalized = asset.toUpperCase().replace(/\s+/g, '').replace('-', '');
  if (!normalized.includes('/') && normalized.length === 6) {
    normalized = `${normalized.slice(0, 3)}/${normalized.slice(3)}`;
  }
  return normalized.match(/^[A-Z]{3}\/[A-Z]{3}$/) ? normalized : null;
};
const normalizeTimeframe = (timeframe)=>{
  if (!timeframe || typeof timeframe !== 'string') return null;
  const tf = timeframe.toLowerCase().replace(/\s+/g, '');
  const mapping = { '1min': '1m', '1minute': '1m', '1m': '1m', '5min': '5m', '5minutes': '5m', '5m': '5m', '15min': '15m', '15minutes': '15m', '15m': '15m', '30min': '30m', '30minutes': '30m', '30m': '30m', '30': '30m', '1hour': 'H1', 'h1': 'H1', '1h': 'H1', '60min': 'H1', '4hours': 'H4', 'h4': 'H4', '4h': 'H4', '240min': 'H4', 'daily': 'D1', 'd1': 'D1', 'diario': 'D1', 'weekly': 'W1', 'w1': 'W1', 'semanal': 'W1', 'monthly': 'MN', 'mn': 'MN', 'mensual': 'MN' };
  const validTimeframes = [ '1m', '5m', '15m', '30m', 'H1', 'H4', 'D1', 'W1', 'MN' ];
  const normalized = mapping[tf] || timeframe.toUpperCase();
  return validTimeframes.includes(normalized) ? normalized : null;
};
const validateAnalysisResult = (data)=>{
  const errors = [];
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ["Respuesta de la IA no es un objeto JSON válido."], validatedData: null };
  }
  const finalData = { ...data };
  finalData.activo = normalizeAsset(data.activo);
  if (data.activo !== null && !finalData.activo) errors.push(`Activo Inválido: '${data.activo}'.`);
  finalData.temporalidad = normalizeTimeframe(data.temporalidad);
  if (data.temporalidad !== null && !finalData.temporalidad) errors.push(`Temporalidad Inválida: '${data.temporalidad}'.`);
  return { isValid: errors.length === 0, errors, validatedData: finalData };
};

// --- Función Principal del Servidor ---
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  let request_id = null;
  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("La variable de entorno GEMINI_API_KEY no está configurada.");
    
    const body = await req.json();
    const record = body.record ?? body;
    request_id = record.id;
    const { image_path, notes } = record; // Obtenemos las 'notes' del registro

    if (!image_path || !request_id) {
      throw new Error("El payload no contiene 'image_path' o 'id'.");
    }
    
    await supabaseAdmin.from('analysis_requests').update({ status: 'analyzing' }).eq('id', request_id);
    console.log(`[${request_id}] - Iniciando análisis. Path: ${image_path}`);
    
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage.from('analysis-images').download(image_path);
    if (downloadError) {
      throw new Error(`Error al descargar de Storage: ${downloadError.message}`);
    }
    
    const arrayBuffer = await fileData.arrayBuffer();
    const base64String = encode(arrayBuffer);
    
    // --- PROMPT MODIFICADO PARA INCLUIR LAS NOTAS DEL USUARIO ---
    const promptText = `Tu única tarea es analizar la imagen de un gráfico de trading y devolver un bloque de código JSON que se adhiera estrictamente al esquema proporcionado. Es obligatorio que incluyas TODAS las claves. Si no puedes determinar un valor, usa 'null'.
    
    **Contexto Adicional (Tesis del Usuario):**
    "${notes || 'El usuario no proporcionó notas adicionales.'}"

    Presta especial atención a la dirección de cualquier flecha o dibujo para inferir el 'sentimiento_analisis' del usuario, y considera sus notas para refinar tu interpretación.`;
    
    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: promptText },
            { inline_data: { mime_type: fileData.type, data: base64String } }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
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
    
    console.log(`[${request_id}] - Respuesta recibida de Gemini.`);
    const geminiJson = await geminiResponse.json();
    const analysisResultText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!analysisResultText) {
      throw new Error("La respuesta de Gemini tiene un formato inesperado.");
    }
    
    let analysisJson;
    try {
      analysisJson = JSON.parse(analysisResultText);
    } catch (e) {
      throw new Error(`Gemini devolvió un JSON malformado: ${e.message}`);
    }
    
    const { isValid, errors, validatedData } = validateAnalysisResult(analysisJson);
    if (!isValid) {
      throw new Error(`El JSON de Gemini falló la validación: ${errors.join(', ')}`);
    }
    
    console.log(`[${request_id}] - Validación de datos de IA completada.`);
    const { error: updateError } = await supabaseAdmin.from('analysis_requests').update({
      status: 'enriching',
      analysis_result: validatedData
    }).eq('id', request_id);

    if (updateError) {
      throw new Error(`Error al actualizar el estado a 'enriching': ${updateError.message}`);
    }
    
    console.log(`[${request_id}] - Estado actualizado a 'enriching'. La función terminó con éxito.`);
    return new Response(JSON.stringify({ success: true, message: `Análisis ${request_id} completado.` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error(`[${request_id || 'ID no disponible'}] - Error FATAL en analyze-chart:`, error);
    if (request_id) {
      await supabaseAdmin.from('analysis_requests').update({
        status: 'failed',
        error_message: `Error en análisis: ${errorMessage}`
      }).eq('id', request_id);
    }
    return new Response(JSON.stringify({ error: "Ocurrió un error interno en el servidor." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
