'use client'
import { createBrowserClient } from '@supabase/ssr';
import { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import Link from 'next/link';
import styles from './pricing.module.css';

// --- ESTRUCTURA DE 3 PLANES ACTUALIZADA ---
// --- IMPORTANTE: Reemplaza los IDs de PayPal con los tuyos ---
const plans = [
  { 
    name: 'Básico', 
    description: 'Perfecto para traders que están empezando y quieren validar sus primeras estrategias.',
    monthly: { id: 'P-2B427913SR8387537NCNBUGY', price: 14.99 },
    yearly: { id: 'P-67W36541XN5756533NCNBBYEA', price: 152.89 },
    features: [
        '30 análisis/mes', 
        'Análisis de IA Estándar', 
        'Pulso del Mercado en Tiempo Real', 
        'Calendario Económico'
    ] 
  },
  { 
    name: 'Avanzado', 
    description: 'La solución ideal para traders consistentes que necesitan herramientas avanzadas y mayor volumen.',
    monthly: { id: 'P-3JA15531TF858463ANCNBWTA', price: 33.99 },
    yearly: { id: 'P-9LY634811M5534711NCNBZII', price: 346.70 },
    features: [
        '90 análisis/mes', 
        'Todo lo de Básico, más:', 
        '"El Porqué" del Movimiento con IA', 
        'Explorador de Activos (Screener)'
    ], 
    tag: { text: 'Más Popular', type: 'popular' }
  },
  { 
    name: 'Profesional', 
    description: 'La ventaja definitiva con análisis predictivo y soporte prioritario para traders de alto rendimiento.',
    monthly: { id: 'P-52E72801UA850030SNCNBXJI', price: 64.99 },
    yearly: { id: 'P-9HN47635GH447432NNCNBZUI', price: 662.90 },
    features: [
        '250 análisis/mes', 
        'Todo lo de Avanzado, más:', 
        'Análisis de Eventos con IA',
        'Señales de Trading con IA', // <-- INICIO DE LA MODIFICACIÓN
        'Soporte Prioritario'
    ], // <-- FIN DE LA MODIFICACIÓN
    tag: { text: 'Valor Élite', type: 'value' }
  },
];


// --- Datos para la sección de FAQ (sin cambios) ---
const faqItems = [
    {
        question: '¿Puedo cambiar de plan más adelante?',
        answer: '¡Por supuesto! Puedes mejorar o cambiar tu plan en cualquier momento desde la sección de "Suscripción" en tu dashboard. Los cambios se aplicarán en tu próximo ciclo de facturación.'
    },
    {
        question: '¿Qué pasa si agoto mis análisis mensuales?',
        answer: 'Si agotas tus créditos de análisis, tendrás la opción de mejorar tu plan para obtener más. No podrás realizar nuevos análisis hasta que tu plan se renueve o lo mejores.'
    },
    {
        question: '¿Cómo funciona la cancelación?',
        answer: 'Puedes cancelar tu suscripción en cualquier momento desde el portal de pagos. Seguirás teniendo acceso a los beneficios de tu plan hasta el final de tu ciclo de facturación actual.'
    },
    {
        question: '¿Qué métodos de pago aceptan?',
        answer: 'Aceptamos las principales tarjetas de crédito y débito a través de nuestra pasarela de pago segura, PayPal.'
    }
];

// --- Componente PlanCard (sin cambios en la lógica interna) ---
const PlanCard = ({ plan, billingCycle, userId }: { plan: typeof plans[0], billingCycle: 'monthly' | 'yearly', userId: string | undefined }) => {
  const [error, setError] = useState<string | null>(null);
  const priceDetails = plan[billingCycle];
  const monthlyPrice = billingCycle === 'yearly' ? (priceDetails.price / 12).toFixed(2) : plan.monthly.price.toFixed(2);

  if (!userId) {
    return (
      <div className={`${styles.planCard} ${plan.tag ? styles[plan.tag.type] : ''}`}>
        {plan.tag && <div className={`${styles.tag} ${styles[plan.tag.type + 'Tag']}`}>{plan.tag.text}</div>}
        <div className={styles.cardContent}>
            <h3 className={styles.planName}>{plan.name}</h3>
            <p className={styles.planDescription}>{plan.description}</p>
            <div className={styles.priceContainer}>
              <p className={styles.planPrice}>${monthlyPrice}<span>/mes</span></p>
              {billingCycle === 'yearly' && <p className={styles.yearlyPriceTotal}>Facturado como ${priceDetails.price}/año</p>}
            </div>
            <ul className={styles.featureList}>
              {plan.features.map((feature, index) => (
                <li key={index} className={styles.featureItem}>
                  <svg className={styles.featureIcon} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className={styles.loginPrompt}>
                <Link href="/login">Inicia sesión para suscribirte</Link>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.planCard} ${plan.tag ? styles[plan.tag.type] : ''}`}>
      {plan.tag && <div className={`${styles.tag} ${styles[plan.tag.type + 'Tag']}`}>{plan.tag.text}</div>}
      <div className={styles.cardContent}>
        <h3 className={styles.planName}>{plan.name}</h3>
        <p className={styles.planDescription}>{plan.description}</p>
        <div className={styles.priceContainer}>
          <p className={styles.planPrice}>${monthlyPrice}<span>/mes</span></p>
          {billingCycle === 'yearly' && <p className={styles.yearlyPriceTotal}>Facturado como ${priceDetails.price}/año</p>}
        </div>
        <ul className={styles.featureList}>
          {plan.features.map((feature, index) => (
            <li key={index} className={styles.featureItem}>
              <svg className={styles.featureIcon} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <div className={styles.paypalButtonContainer}>
          <PayPalButtons
            key={priceDetails.id}
            style={{ layout: "vertical", label: "subscribe" }}
            createSubscription={(data, actions) => {
              return actions.subscription.create({
                plan_id: priceDetails.id,
                custom_id: userId,
              });
            }}
            onApprove={(data, actions) => {
              alert('¡Gracias por suscribirte! Tu plan se activará en breve.');
              window.location.href = '/dashboard';
              return Promise.resolve();
            }}
            onError={(err) => {
              setError("Ocurrió un error con el pago. Por favor, inténtalo de nuevo.");
              console.error("Error de PayPal:", err);
            }}
          />
        </div>
        {error && <p className={styles.errorMessage}>{error}</p>}
      </div>
    </div>
  );
};

// --- Componente FaqItem (sin cambios) ---
const FaqItem = ({ item, isOpen, onClick }: { item: typeof faqItems[0], isOpen: boolean, onClick: () => void }) => (
    <div className={styles.faqItem}>
        <button className={styles.faqQuestion} onClick={onClick}>
            <span>{item.question}</span>
            <span className={`${styles.faqIcon} ${isOpen ? styles.faqIconOpen : ''}`}>+</span>
        </button>
        {isOpen && <div className={styles.faqAnswer}><p>{item.answer}</p></div>}
    </div>
);

// --- Componente Principal de la Página (sin cambios en la lógica) ---
export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [userId, setUserId] = useState<string | undefined>();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const getUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUserId(user?.id);
    };
    getUser();
  }, [supabase]);

  const handleFaqToggle = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  if (!paypalClientId) {
    return (
        <div className={styles.container}>
            <div className={styles.errorState}>
                <h2>Error de Configuración</h2>
                <p>La pasarela de pagos no está disponible en este momento. Por favor, contacta al soporte.</p>
            </div>
        </div>
    );
  }

  return (
    <PayPalScriptProvider options={{ "client-id": paypalClientId, intent: "subscription", vault: true }}>
      <div className={styles.container}>
        <header className={styles.header}>
            <h1 className={styles.headerTitle}>Planes Flexibles para Cada Trader</h1>
            <p className={styles.headerSubtitle}>
              Comienza con 3 análisis gratuitos. Cuando estés listo, elige el plan que mejor se adapte a tu ritmo de trading. Sin compromisos, cancela cuando quieras.
            </p>
            <div className={styles.billingToggle}>
              <span>Mensual</span>
              <label className={styles.switch}>
                <input 
                  type="checkbox" 
                  checked={billingCycle === 'yearly'}
                  onChange={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')} 
                />
                <span className={styles.slider}></span>
              </label>
              <span className={styles.annualLabel}>
                Anual <span className={styles.discountBadge}>Ahorra 15%</span>
              </span>
            </div>
        </header>

        <div className={styles.pricingGrid}>
          {plans.map(plan => (
            <PlanCard key={plan.name + billingCycle} plan={plan} billingCycle={billingCycle} userId={userId} />
          ))}
        </div>

        <section className={styles.faqSection}>
          <h2 className={styles.faqTitle}>Preguntas Frecuentes</h2>
          <div className={styles.faqList}>
              {faqItems.map((item, index) => (
                  <FaqItem 
                      key={index} 
                      item={item} 
                      isOpen={openFaq === index} 
                      onClick={() => handleFaqToggle(index)}
                  />
              ))}
          </div>
        </section>
      
        <footer className={styles.securityNote}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          <span>
            <strong>Pago Seguro:</strong> Todos los pagos se procesan de forma segura a través de PayPal. AImpatfx no guarda ni recopila información de tu tarjeta.
          </span>
        </footer>
      </div>
    </PayPalScriptProvider>
  );
}


