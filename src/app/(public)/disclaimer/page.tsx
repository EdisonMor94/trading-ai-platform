import styles from './disclaimer.module.css';

export default function DisclaimerPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Descargo de Responsabilidad</h1>
        <p className={styles.subtitle}>
          Fecha de última actualización: 4 de agosto de 2025
        </p>
      </header>

      <div className={styles.content}>
        <p>
          La información proporcionada por AImpatfx ("nosotros", "nuestro") en esta plataforma se ofrece exclusivamente con fines informativos y educativos. Si bien toda la información se presenta de buena fe, no realizamos ninguna declaración ni ofrecemos garantía de ningún tipo, ya sea expresa o implícita, sobre la exactitud, adecuación, validez, fiabilidad, disponibilidad o integridad de dicha información.
        </p>

        <section className={styles.section}>
          <h2>1. Carácter No Profesional de la Información</h2>
          <p>
            La plataforma AImpatfx no puede y no contiene asesoramiento financiero, legal o de cualquier otro tipo profesional. La información se proporciona únicamente con fines educativos y de entretenimiento, y no debe ser considerada un sustituto del asesoramiento por parte de profesionales cualificados. Antes de tomar cualquier medida basada en dicha información, le instamos a que consulte con los expertos adecuados. El uso o la confianza en cualquier información contenida en este sitio es exclusivamente bajo su propio riesgo.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Limitaciones Inherentes a la Inteligencia Artificial</h2>
          <p>
            Usted reconoce y acepta que todos los análisis, recomendaciones y datos generados en esta plataforma son producidos por modelos de inteligencia artificial (IA). La IA posee limitaciones inherentes, que incluyen, entre otras:
          </p>
          <ul>
            <li>La posibilidad de generar información incorrecta, incompleta o sesgada.</li>
            <li>La incapacidad para comprender el contexto completo del mercado o anticipar eventos imprevistos ("cisnes negros").</li>
            <li>Una dependencia estricta de los datos históricos con los que fue entrenada, los cuales pueden no ser representativos de las condiciones actuales o futuras del mercado.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. Precisión de Datos de Terceros</h2>
          <p>
            La plataforma puede emplear datos de mercado proporcionados por fuentes de terceros. No garantizamos la exactitud, puntualidad, integridad o fiabilidad de estos datos. Cualquier confianza que usted deposite en esta información es estrictamente bajo su propio riesgo.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Asunción de Riesgo por Parte del Usuario</h2>
          <p>
            Usted es el único responsable de evaluar los méritos y riesgos asociados con el uso de cualquier contenido de la plataforma antes de tomar decisiones de inversión. Al utilizar AImpatfx, usted acepta eximir de toda responsabilidad a nuestra empresa, sus afiliados y proveedores, por cualquier posible reclamación por daños y perjuicios que surja de cualquier decisión que tome basada en la información disponible a través de esta plataforma.
          </p>
        </section>
      </div>
    </div>
  );
}


