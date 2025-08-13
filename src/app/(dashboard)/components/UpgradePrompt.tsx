'use client';

import Link from 'next/link';
import styles from './UpgradePrompt.module.css';

// Icono para la tarjeta
const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
);

export default function UpgradePrompt({ featureName }: { featureName: string }) {
  return (
    <div className={styles.container}>
        <div className={styles.card}>
            <div className={styles.iconWrapper}>
                <LockIcon />
            </div>
            <h2 className={styles.title}>Función Premium Bloqueada</h2>
            <p className={styles.description}>
                La herramienta "{featureName}" es una característica exclusiva de nuestros planes de pago. Mejora tu suscripción para desbloquear esta y muchas otras funcionalidades avanzadas.
            </p>
            <Link href="/pricing" className={styles.upgradeButton}>
                Ver Planes de Suscripción
            </Link>
        </div>
    </div>
  );
}
