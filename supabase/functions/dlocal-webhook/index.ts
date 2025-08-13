// Este archivo se encuentra en: supabase/functions/dlocal-webhook/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// --- MAPA DE CRÉDITOS SEGURO (LADO DEL SERVIDOR) ---
// Para saber cuántos créditos añadir según el plan comprado.
const creditsMap = {
  // Créditos Mensuales
  'plan_basic_monthly': 20,
  'plan_advanced_monthly': 50,
  'plan_pro_monthly': 150,
  'plan_expert_monthly': 500,
  // Créditos Anuales
  'plan_basic_yearly': 240, // 20 * 12
  'plan_advanced_yearly': 600, // 50 * 12
  'plan_pro_yearly': 1800, // 150 * 12
  'plan_expert_yearly': 6000, // 500 * 12
};

serve(async (req) => {
  try {
    // 1. Verificar la firma del Webhook (SEGURIDAD CRUCIAL)
    // dLocal Go envía una firma en los encabezados. Debes verificarla con tu "Secret" del webhook.
    // Esta es una implementación de ejemplo. Consulta la documentación de dLocal Go para la verificación exacta.
    const signature = req.headers.get('X-Signature');
    const webhookSecret = Deno.env.get('DLOCAL_WEBHOOK_SECRET')!;
    const body = await req.json();
    
    // const isVerified = verifySignature(body, signature, webhookSecret); // Función de verificación que debes implementar
    // if (!isVerified) {
    //   throw new Error('Firma del webhook inválida.');
    // }

    const eventType = body.event_type; // ej: 'PAYMENT_COMPLETED'

    // 2. Nos aseguramos de que el evento sea un pago completado
    if (eventType === 'PAYMENT_COMPLETED') {
      const paymentData = body.payment;
      const metadata = paymentData.metadata;
      
      if (!metadata || !metadata.supabase_user_id || !metadata.plan_id) {
        throw new Error('Faltan metadatos esenciales en el webhook.');
      }

      const userId = metadata.supabase_user_id;
      const planId = metadata.plan_id;
      const creditsToAdd = creditsMap[planId];

      if (creditsToAdd === undefined) {
        throw new Error(`Plan ID "${planId}" no encontrado en el mapa de créditos.`);
      }

      // 3. Crear un cliente de Supabase con permisos de administrador
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // 4. Obtener el perfil actual del usuario
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('analysis_credits')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        throw new Error(`Perfil no encontrado para el usuario con ID: ${userId}`);
      }

      // 5. Actualizar el perfil del usuario con los nuevos créditos y estado
      const newCreditTotal = profile.analysis_credits + creditsToAdd;
      const planName = planId.replace(/_monthly|_yearly/g, '').replace('_', ' '); // ej: "plan advanced"

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_plan: planName.charAt(0).toUpperCase() + planName.slice(1),
          subscription_status: 'active',
          analysis_credits: newCreditTotal,
        })
        .eq('id', userId);

      if (updateError) {
        throw new Error(`Error al actualizar el perfil: ${updateError.message}`);
      }

      console.log(`Perfil actualizado para ${userId}. Plan: ${planName}, Créditos añadidos: ${creditsToAdd}`);
    }

    // 6. Devolver una respuesta exitosa a dLocal Go
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error en el webhook de dLocal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400, // Usamos 400 para errores de cliente, 500 para errores de servidor
    });
  }
});
