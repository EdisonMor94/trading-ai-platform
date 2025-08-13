import styles from './risk-warning.module.css';

export default function RiskWarningPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Advertencia de Riesgo</h1>
        <p className={styles.subtitle}>
          Lea esta advertencia detenidamente antes de utilizar nuestros servicios.
        </p>
      </header>

      <div className={styles.content}>
        <p className={styles.intro}>
          El trading de instrumentos financieros, incluyendo divisas (Forex), criptomonedas, acciones y otros derivados, conlleva un **nivel de riesgo sustancial** y puede no ser adecuado para todos los inversores. Al utilizar la plataforma AImpatfx, usted reconoce y acepta los riesgos inherentes que se detallan a continuación.
        </p>

        <section className={styles.section}>
          <h2>1. Riesgo de Pérdida de Capital</h2>
          <p>
            La principal advertencia es que existe la posibilidad real de que usted pueda sostener una pérdida parcial o total de su capital invertido. El valor de los instrumentos financieros es fluctuante y puede verse afectado por una volatilidad impredecible. **Nunca invierta fondos que no pueda permitirse perder.**
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Inexistencia de Garantía de Resultados</h2>
          <p>
            AImpatfx es una herramienta de software que proporciona análisis automatizados mediante inteligencia artificial. Es fundamental que comprenda lo siguiente:
          </p>
          <ul>
            <li>
              <strong>El rendimiento pasado no es indicativo de resultados futuros.</strong> No existe ninguna garantía, expresa o implícita, de que los análisis o estrategias generadas por la plataforma resulten en ganancias.
            </li>
            <li>
              <strong>La IA no es infalible.</strong> Los modelos algorítmicos pueden cometer errores, interpretar datos de forma incorrecta o no tener en cuenta factores cualitativos o eventos súbitos del mercado. Las decisiones basadas únicamente en la salida de la plataforma se toman bajo su propio y exclusivo riesgo.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. Su Responsabilidad como Inversor</h2>
          <p>
            Usted es el único y final responsable de todas sus decisiones de inversión y de cualquier pérdida que pueda incurrir como resultado de ellas.
          </p>
          <ul>
            <li>
              Le recomendamos encarecidamente que realice su propia investigación y debida diligencia.
            </li>
            <li>
              Considere buscar el consejo de un asesor financiero independiente y cualificado que pueda evaluar su situación financiera personal y su tolerancia al riesgo.
            </li>
          </ul>
        </section>

        <p className={styles.acceptance}>
          Al utilizar la plataforma AImpatfx, usted confirma que ha leído, comprendido y aceptado esta advertencia de riesgo, y exime de toda responsabilidad a la plataforma, sus creadores y afiliados por cualquier pérdida o daño que resulte del uso de su información.
        </p>
      </div>
    </div>
  );
}

