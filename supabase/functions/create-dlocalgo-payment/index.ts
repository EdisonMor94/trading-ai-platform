import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// URL del API de DLocal Go (Sandbox para pruebas)
const DLOCAL_API_URL = 'https://sandbox.dlocalgo.com/v1/payments';

// Obtén las credenciales desde los secretos de Supabase
const X_LOGIN = Deno.env.get('DLOCAL_LOGIN')!;
const X_TRANS_KEY = Deno.env.get('DLOCAL_TRANS_KEY')!;
const SECRET_KEY = Deno.env.get('DLOCAL_SECRET_KEY')!;
const SITE_URL = Deno.env.get('https://khqdqdepmgbdmumfdorv.supabase.co')!;

// Define tus planes aquí. Más adelante, podrías mover esto a una tabla en tu base de datos.
const PLANS = {
  'pro-20': { amount: 20.00, name: 'Pro 20', credits: 20 },
  'pro-50': { amount: 50.00, name: 'Pro 50', credits: 50 },
  'pro-150': { amount: 150.00, name: 'Pro 150', credits: 150 },
  'pro-500': { amount: 500.00, name: 'Pro 500', credits: 500 },
};

// Función para generar la firma de seguridad HMAC-SHA256 que exige DLocal Go
async function createSignature(body: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. AUTENTICAR AL USUARIO Y OBTENER DATOS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('User not found.');

    const { planId } = await req.json(); // ej: 'pro-50'
    const plan = PLANS[planId as keyof typeof PLANS];
    if (!plan) throw new Error(`Plan with id ${planId} not found.`);

    // 2. PREPARAR LA SOLICITUD PARA DLOCAL GO
    const orderId = `user-${user.id}-${Date.now()}`; // ID de orden único y rastreable

    const paymentRequest = {
      amount: plan.amount,
      currency: 'USD', // O la moneda que uses (ej: 'MXN', 'BRL')
      country: 'US',   // Código de país de 2 letras (ej: 'MX', 'BR')
      payment_method_flow: 'REDIRECT',
      payer: {
        name: user.user_metadata?.full_name || 'Valued Customer',
        email: user.email,
      },
      order_id: orderId,
      description: `Suscripción al plan ${plan.name}`,
      success_url: `${SITE_URL}/payment-success`,
      back_url: `${SITE_URL}/pricing`,
      // Esta es la URL de nuestro webhook, que construiremos después
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-dlocalgo-events`
    };

    const requestBody = JSON.stringify(paymentRequest);

    // 3. GENERAR FIRMA Y ENVIAR LA SOLICITUD
    const signature = await createSignature(requestBody);

    const response = await fetch(DLOCAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Login': X_LOGIN,
        'X-Trans-Key': X_TRANS_KEY,
        'X-Version': '2.1',
        'X-Date': new Date().toISOString(),
        'X-Signature': `HMAC-SHA256 ${signature}`
      },
      body: requestBody,
    });
    
    const data = await response.json();

    if (!response.ok) {
      // Si DLocal Go devuelve un error, lo mostramos para depuración
      console.error('Error from DLocal Go:', data);
      throw new Error(data.message || 'Failed to create payment on DLocal Go.');
    }

    // 4. DEVOLVER LA URL DE REDIRECCIÓN AL FRONTEND
    return new Response(
      JSON.stringify({ redirect_url: data.redirect_url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

