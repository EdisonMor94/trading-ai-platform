'use client'; // Esta directiva lo convierte en un Componente de Cliente

import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css'; // Asumimos que el css está en el mismo directorio

// La definición del componente es la misma que antes
export default function FeatureShowcase({ title, subtitle, description, imageUrl, reverse = false }: { title: string, subtitle: string, description: string, imageUrl: string, reverse?: boolean }) {
    return (
        <div className={`${styles.featureShowcase} ${reverse ? styles.reversed : ''}`}>
            <div className={styles.featureImageWrapper}>
                <Image 
                    src={imageUrl} 
                    alt={title} 
                    width={600} 
                    height={400} 
                    className={styles.featureImage} 
                    // El onError ahora es válido porque estamos en un Componente de Cliente
                    onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400/e5e7eb/111827?text=Imagen+no+disponible'; }} 
                />
            </div>
            <div className={styles.featureTextWrapper}>
                <h3 className={styles.featureSubtitle}>{subtitle}</h3>
                <h2 className={styles.featureTitle}>{title}</h2>
                <p className={styles.featureDescription}>{description}</p>
                <Link href="/register" className={styles.featureLink}>
                    Descubre cómo →
                </Link>
            </div>
        </div>
    );
}
