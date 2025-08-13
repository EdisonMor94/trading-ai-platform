import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts';

// --- CONFIGURACIÓN PRINCIPAL ---
// Lista de activos a escanear. Puedes añadir más pares de Forex, Acciones o Criptos.
const ASSETS_TO_SCAN = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'TSLA', 'BTCUSD'];
const TIME_INTERVAL = '4hour'; // Timeframe para el análisis (ej: '1hour', '4hour', 'daily')

// --- Interfaces para los datos ---
interface Technicals {
  rsi: number;
  ema20: number;
  ema50: number;
  ema200: number;
  upperBollinger: number;
  lowerBollinger: number;
  price: number;
}

interface ValidatedSignal {
  asset: string;
  direction: 'COMPRA' | 'VENTA';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  justification: string;
}

// --- Lógica Principal ---
Deno.serve(async (req) => {
  // Solo permitimos que se ejecute a través de una llamada segura, no pública
  const authHeader = req.headers.get('Authorization')!;
  if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Usamos el service_role_key para tener permisos de escritura en la DB
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const FMP_API_KEY = Deno.env.get("FMP_API_KEY");
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

  if (!FMP_API_KEY || !GEMINI_API_KEY) {
    throw new Error("Las claves de API no están configuradas.");
  }

  console.log("Iniciando escaneo de señales...");
  const generatedSignals = [];

  for (const asset of ASSETS_TO_SCAN) {
    try {
      console.log(`--- Escaneando ${asset} ---`);

      // 1. Obtener Indicadores Técnicos de FMP
      const techUrl = `https://financialmodelingprep.com/api/v3/technical_indicator/${TIME_INTERVAL}/${asset}?period=200&apikey=${FMP_API_KEY}`;
      const techResponse = await fetch(techUrl);
      if (!techResponse.ok) continue;
      const techData = await techResponse.json();
      const latest = techData[0];
      if (!latest) continue;

      const technicals: Technicals = {
        price: latest.close,
        rsi: latest.rsi,
        ema20: latest.ema20,
        ema50: latest.ema50,
        ema200: latest.ema200,
        upperBollinger: latest.upperBand,
        lowerBollinger: latest.lowerBand,
      };

      // 2. Aplicar "Recetas" para encontrar confluencias
      let potentialSignal: { type: 'COMPRA' | 'VENTA'; pattern: string } | null = null;

      // Receta Alcista: Rebote en soporte clave con sobreventa
      if (technicals.price <= technicals.ema200 && technicals.rsi <= 35) {
        potentialSignal = { type: 'COMPRA', pattern: 'Rebote en EMA 200 + RSI Sobreventa' };
      }
      // Receta Bajista: Rebote en resistencia clave con sobrecompra
      if (technicals.price >= technicals.ema200 && technicals.rsi >= 65) {
        potentialSignal = { type: 'VENTA', pattern: 'Rechazo en EMA 200 + RSI Sobrecompra' };
      }

      // Si se encuentra una posible señal, pasar a la validación con IA
      if (potentialSignal) {
        console.log(`Posible señal de ${potentialSignal.type} encontrada para ${asset}. Validando con IA...`);
        
        // 3. Validación con IA
        const prompt = `
          **Rol:** Eres un gestor de riesgos senior en un fondo de cobertura.
          **Contexto:** Se ha detectado una señal técnica de ${potentialSignal.type} para ${asset} basada en el patrón: "${potentialSignal.pattern}". El precio actual es ${technicals.price}.
          **Tarea:** Valida esta oportunidad. Si la consideras de alta probabilidad, genera una señal de trading completa. Si no, descártala. Responde únicamente con un objeto JSON.
          - Si es válida, usa esta estructura: {"status": "valida", "signal": {"asset": "${asset}", "direction": "${potentialSignal.type}", "entry_price": ${technicals.price}, "stop_loss": NÚMERO, "take_profit": NÚMERO, "justification": "Justificación profesional y concisa."}}. Calcula el stop_loss y take_profit basándote en la volatilidad reciente y niveles lógicos.
          - Si NO es válida (ej. por condiciones de mercado, falta de confirmación, etc.), usa esta estructura: {"status": "descartada", "justification": "Razón por la que se descarta la señal."}
        `;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: "application/json" }
          })
        });

        if (!geminiResponse.ok) continue;
        const geminiData = await geminiResponse.json();
        const validationResult = JSON.parse(geminiData.candidates[0].content.parts[0].text);

        if (validationResult.status === 'valida') {
          console.log(`IA validó la señal para ${asset}.`);
          const signal: ValidatedSignal = validationResult.signal;
          
          // 4. Guardar la señal en la base de datos
          const { error } = await supabaseAdmin.from('trading_signals').insert({
            asset: signal.asset,
            direction: signal.direction,
            entry_price: signal.entry_price,
            stop_loss: signal.stop_loss,
            take_profit: signal.take_profit,
            justification: signal.justification,
            technical_pattern: potentialSignal.pattern,
          });

          if (error) {
            console.error(`Error al guardar la señal para ${asset}:`, error);
          } else {
            console.log(`¡Señal para ${asset} guardada exitosamente!`);
            generatedSignals.push(signal);
          }
        } else {
          console.log(`IA descartó la señal para ${asset}. Razón: ${validationResult.justification}`);
        }
      }
    } catch (err) {
      console.error(`Error procesando el activo ${asset}:`, err);
    }
  }

  return new Response(JSON.stringify({
    message: "Escaneo completado.",
    signalsGenerated: generatedSignals.length,
    details: generatedSignals
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
});

