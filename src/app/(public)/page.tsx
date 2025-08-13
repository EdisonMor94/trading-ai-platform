import Link from 'next/link';
import styles from './page.module.css';

// --- Iconos temáticos ---
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const AiIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect x="4" y="12" width="8" height="8" rx="2"/><path d="M12 12v8h4"/><path d="M16 12h4v-4h-4Z"/></svg>;
const ReportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>;

// --- Componentes Reutilizables ---
const FeatureCard = ({ icon, title, text }: { icon: React.ReactNode, title: string, text: string }) => (
  <div className={styles.card}>
    <div className={styles.cardIcon}>{icon}</div>
    <h3 className={styles.cardTitle}>{title}</h3>
    <p className={styles.cardText}>{text}</p>
  </div>
);

const IconFeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className={styles.iconFeatureCard}>
        <div className={styles.iconFeatureIconWrapper}>{icon}</div>
        <h3 className={styles.iconFeatureTitle}>{title}</h3>
        <p className={styles.iconFeatureDescription}>{description}</p>
    </div>
);

const MarketPulseIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;
const ContextIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>;
const PredictiveIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;

const StatItem = ({ number, label }: { number: string, label: string }) => (
    <div className={styles.statItem}>
        <p className={styles.statNumber}>{number}</p>
        <p className={styles.statLabel}>{label}</p>
    </div>
);

const TestimonialCard = ({ text, author, role }: { text: string, author: string, role: string }) => (
    <div className={styles.testimonialCard}>
        <p className={styles.testimonialText}>"{text}"</p>
        <p className={styles.testimonialAuthor}>{author} - <span className={styles.testimonialRole}>{role}</span></p>
    </div>
);

export default function HomePage() {
  return (
    <>
      {/* --- SECCIÓN 1: HÉROE --- */}
      <section className={styles.heroContainer}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Decisiones de Trading más Inteligentes, <span>Potenciadas por IA.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            AImpatfx es tu co-piloto de análisis. Validamos tu estrategia contra datos de mercado en tiempo real para que operes con la máxima confianza y precisión.
          </p>
          <Link href="/register" className={styles.ctaButton}>
            Prueba Gratis con 3 Análisis
          </Link>
        </div>
      </section>

      {/* --- SECCIÓN 2: "CÓMO FUNCIONA" --- */}
      <div className={`${styles.darkBgWrapper} ${styles.curvedBottom}`}>
        <div className={styles.contentWrapper}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Transforma tu Análisis en 3 Simples Pasos</h2>
            <p className={styles.sectionSubtitle}>Pasa de la duda a la decisión en minutos. Nuestro proceso está diseñado para ser rápido, intuitivo y potente.</p>
            <div className={styles.grid}>
              <FeatureCard icon={<UploadIcon />} title="1. Carga tu Gráfico y Tesis" text="Sube una captura de tu análisis y describe tu estrategia. Cuanto más contexto nos des, más preciso será el feedback." />
              <FeatureCard icon={<AiIcon />} title="2. Enriquecemos con Datos Reales" text="Contrastamos tu análisis con datos de mercado en tiempo real, indicadores técnicos, noticias y eventos económicos de FMP." />
              <FeatureCard icon={<ReportIcon />} title="3. Recibe tu Informe de IA" text="Obtén un análisis completo con un índice de confianza, un plan de trading accionable y una evaluación de riesgos." />
            </div>
          </section>
        </div>
      </div>
      
      {/* --- SECCIÓN 3: ECOSISTEMA DE HERRAMIENTAS --- */}
      <div className={styles.lightBgWrapper}>
        <div className={styles.contentWrapper}>
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} ${styles.lightText}`}>Un Ecosistema de Herramientas para el Trader Moderno</h2>
            <p className={`${styles.sectionSubtitle} ${styles.lightText}`}>Más allá del análisis de gráficos, te ofrecemos un conjunto de herramientas para que tengas una visión 360° del mercado.</p>
            <div className={styles.featuresGrid}>
                <IconFeatureCard icon={<MarketPulseIcon />} title="Pulso del Mercado" description="Obtén una visión instantánea del rendimiento de los principales índices, divisas y metales en un dashboard personalizable."/>
                <IconFeatureCard icon={<ContextIcon />} title="'El Porqué' del Movimiento" description="Con un solo clic, nuestra IA analiza las noticias y te explica por qué se movió el precio, dándote el contexto que necesitas para actuar."/>
                <IconFeatureCard icon={<PredictiveIcon />} title="Análisis Predictivo de Eventos" description="Nuestra IA analiza datos históricos y te ofrece escenarios de trading accionables para las noticias de alto impacto. Tu ventaja estratégica."/>
            </div>
          </section>
        </div>
      </div>

      {/* --- INICIO DE LA NUEVA SECCIÓN DE SEÑALES --- */}
      <div className={styles.signalsShowcaseSection}>
        <div className={styles.contentWrapper}>
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Recibe Señales de Trading, Validadas por IA</h2>
                <p className={styles.sectionSubtitle}>Deja que nuestro sistema trabaje por ti. Escaneamos el mercado 24/7 en busca de oportunidades de alta probabilidad, las validamos con IA para eliminar el ruido y te las entregamos listas para actuar.</p>
                <div className={styles.mockSignalsContainer}>
                    <div className={`${styles.mockSignalCard} ${styles.buySignal}`}>
                        <div className={styles.mockSignalHeader}>
                            <h3>EUR/USD</h3>
                            <span className={styles.buyChip}>COMPRA</span>
                        </div>
                        <p className={styles.mockSignalJustification}>Señal validada por IA basada en un rebote en la media móvil de 200 periodos y un RSI en zona de sobreventa.</p>
                        <div className={styles.mockSignalLevels}>
                            <div><span>Entrada</span><span>1.0850</span></div>
                            <div><span>Stop Loss</span><span>1.0810</span></div>
                            <div><span>Take Profit</span><span>1.0930</span></div>
                        </div>
                    </div>
                     <div className={`${styles.mockSignalCard} ${styles.sellSignal}`}>
                        <div className={styles.mockSignalHeader}>
                            <h3>XAU/USD (Oro)</h3>
                            <span className={styles.sellChip}>VENTA</span>
                        </div>
                        <p className={styles.mockSignalJustification}>Oportunidad detectada por un patrón de doble techo en el gráfico de 4H, confirmada por una divergencia bajista en el MACD.</p>
                        <div className={styles.mockSignalLevels}>
                            <div><span>Entrada</span><span>2350.50</span></div>
                            <div><span>Stop Loss</span><span>2365.00</span></div>
                            <div><span>Take Profit</span><span>2325.00</span></div>
                        </div>
                    </div>
                </div>
                <Link href="/pricing" className={styles.ctaButton} style={{marginTop: '3rem'}}>
                    Descubre los Planes con Señales
                </Link>
            </section>
        </div>
      </div>
      {/* --- FIN DE LA NUEVA SECCIÓN DE SEÑALES --- */}

      {/* --- SECCIÓN 5: NÚMEROS --- */}
      <div className={`${styles.darkBgWrapper} ${styles.fullyCurved}`}>
        <div className={styles.contentWrapper}>
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Resultados que Hablan por Sí Mismos</h2>
                <p className={styles.sectionSubtitle}>Nuestra plataforma impulsa decisiones más acertadas. Estos son nuestros números.</p>
                <div className={styles.statsGrid}>
                    <StatItem number=">90%" label="Precisión en Backtesting" />
                    <StatItem number="+10K" label="Análisis Realizados" />
                    <StatItem number="85%" label="Confianza del Usuario" />
                    <StatItem number="<1 min" label="Tiempo de Respuesta" />
                </div>
            </section>
        </div>
      </div>

      {/* --- SECCIÓN 6 y 7: TESTIMONIOS Y CTA FINAL --- */}
      <div className={styles.lightBgWrapper}>
        <div className={styles.contentWrapper}>
            <section className={styles.section}>
                <h2 className={`${styles.sectionTitle} ${styles.lightText}`}>Amado por Traders como Tú</h2>
                <p className={`${styles.sectionSubtitle} ${styles.lightText}`}>No solo lo decimos nosotros. Escucha a quienes ya operan con más seguridad.</p>
                <div className={styles.testimonialsGrid}>
                    <TestimonialCard text="AImpatfx cambió mi forma de ver el mercado. Ahora valido cada una de mis entradas y he reducido mis operaciones perdedoras drásticamente." author="Carlos Villanueva" role="Trader de Forex"/>
                    <TestimonialCard text="La herramienta de 'El Porqué' es increíble. Entender el contexto detrás de un movimiento de precio en segundos no tiene precio. Totalmente recomendada." author="Sofia Rodriguez" role="Analista de Mercados"/>
                    <TestimonialCard text="Como principiante, me daba miedo cometer errores. Esta plataforma es como tener un mentor 24/7 que revisa mi trabajo. Mi confianza ha crecido exponencialmente." author="Javier Mendoza" role="Trader Principiante"/>
                </div>
            </section>
            <section className={styles.section}>
                <h2 className={`${styles.sectionTitle} ${styles.lightText}`}>¿Listo para tomar decisiones con más confianza?</h2>
                <p className={`${styles.sectionSubtitle} ${styles.lightText}`}>Únete a miles de traders que ya están potenciando su análisis con AImpatfx. Tu cuenta gratuita te espera.</p>
                <Link href="/register" className={styles.ctaButton}>
                Crear Cuenta y Empezar Gratis
                </Link>
            </section>
        </div>
      </div>
    </>
  );
}

