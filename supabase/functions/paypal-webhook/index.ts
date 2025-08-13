import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// --- MAPA DE CRÉDITOS SEGURO (LADO DEL SERVIDOR) ---
// Asocia el ID del Plan de PayPal con los datos de tu aplicación.
// DEBES REEMPLAZAR 'P-123...' CON LOS IDs REALES DE TUS PLANES EN PAYPAL.
const creditsMap = {
  // Planes Mensuales
  'P-123ABC456DEF_M_BASIC': { name: 'Básico', credits: 20 },
  'P-123ABC456DEF_M_ADVANCED': { name: 'Avanzado', credits: 50 },
  'P-123ABC456DEF_M_PRO': { name: 'Profesional', credits: 150 },
  'P-123ABC456DEF_M_EXPERT': { name: 'Experto', credits: 500 },
  // Planes Anuales
  'P-789GHI012JKL_Y_BASIC': { name: 'Básico Anual', credits: 240 }, // 20 * 12
  'P-789GHI012JKL_Y_ADVANCED': { name: 'Avanzado Anual', credits: 600 }, // 50 * 12
  'P-789GHI012JKL_Y_PRO': { name: 'Profesional Anual', credits: 1800 }, // 150 * 12
  'P-789GHI012JKL_Y_EXPERT': { name: 'Experto Anual', credits: 6000 }, // 500 * 12
};

// --- FUNCIÓN PARA OBTENER UN TOKEN DE ACCESO DE PAYPAL ---
async function getPayPalAccessToken() {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
  const auth = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', { // Cambia a api-m.paypal.com para producción
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
}


// --- FUNCIÓN PRINCIPAL DEL SERVIDOR ---
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const body = await req.json();
    const eventType = body.event_type;

    // 1. Verificar la autenticidad del Webhook (SEGURIDAD CRUCIAL)
    // Esta es una capa de seguridad esencial para asegurar que la petición viene de PayPal.
    const accessToken = await getPayPalAccessToken();
    const verificationResponse = await fetch('https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature', { // Cambia a api-m.paypal.com para producción
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            transmission_id: req.headers.get('paypal-transmission-id'),
            transmission_time: req.headers.get('paypal-transmission-time'),
            cert_url: req.headers.get('paypal-cert-url'),
            auth_algo: req.headers.get('paypal-auth-algo'),
            transmission_sig: req.headers.get('paypal-transmission-sig'),
            webhook_id: Deno.env.get('PAYPAL_WEBHOOK_ID'),
            webhook_event: body,
        }),
    });

    const verificationData = await verificationResponse.json();
    if (verificationData.verification_status !== 'SUCCESS') {
        console.error('Fallo en la verificación del webhook de PayPal:', verificationData);
        throw new Error('Firma del webhook inválida.');
    }
    
    console.log(`Webhook de PayPal verificado. Evento: ${eventType}`);

    // 2. Procesar el evento si la suscripción se activa
    if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      const subscription = body.resource;
      const planId = subscription.plan_id;
      const customId = subscription.custom_id; // Aquí guardamos el supabase_user_id

      if (!customId || !planId) {
        throw new Error('Faltan custom_id o plan_id en el webhook de suscripción.');
      }

      const planDetails = creditsMap[planId];
      if (!planDetails) {
        throw new Error(`Plan ID "${planId}" no encontrado en el mapa de créditos.`);
      }

      // 3. Obtener el perfil actual del usuario
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('analysis_credits')
        .eq('id', customId)
        .single();

      if (profileError || !profile) {
        throw new Error(`Perfil no encontrado para el usuario con ID: ${customId}`);
      }

      // 4. Actualizar el perfil con los nuevos créditos y estado
      const newCreditTotal = profile.analysis_credits + planDetails.credits;

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_plan: planDetails.name,
          subscription_status: 'active',
          analysis_credits: newCreditTotal,
        })
        .eq('id', customId);

      if (updateError) {
        throw new Error(`Error al actualizar el perfil: ${updateError.message}`);
      }

      console.log(`Suscripción activada para ${customId}. Plan: ${planDetails.name}, Créditos añadidos: ${planDetails.credits}`);
    }

    // 5. Devolver una respuesta exitosa a PayPal
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error en el webhook de PayPal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

