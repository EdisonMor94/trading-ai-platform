'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import styles from './subscription.module.css'

// Interfaz para el perfil del usuario
interface Profile {
  analysis_credits: number;
  subscription_plan: string | null;
  subscription_status: string | null;
}

// Componente para una tarjeta de información
const InfoCard = ({ label, value, children }: { label: string, value?: string | number | null, children?: React.ReactNode }) => (
  <div className={styles.infoCard}>
    <p className={styles.infoLabel}>{label}</p>
    {value && <p className={styles.infoValue}>{value}</p>}
    {children}
  </div>
);

export default function SubscriptionPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('analysis_credits, subscription_plan, subscription_status')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error("Error al obtener el perfil:", error);
        } else {
          setProfile(data);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, [supabase]);

  const getStatusChip = (status: string | null | undefined) => {
    if (status === 'active') {
      return <span className={`${styles.chip} ${styles.chipActive}`}>Activo</span>;
    }
    if (status === 'past_due' || status === 'canceled') {
      return <span className={`${styles.chip} ${styles.chipError}`}>Inactivo</span>;
    }
    return <span className={`${styles.chip} ${styles.chipInactive}`}>Sin Suscripción</span>;
  };

  if (loading) {
    return <p>Cargando información de la suscripción...</p>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Mi Suscripción</h1>
        <p className={styles.headerSubtitle}>Consulta el estado de tu plan y tus créditos de análisis.</p>
      </header>

      <div className={styles.grid}>
        <InfoCard label="Plan Actual" value={profile?.subscription_plan || 'Plan Gratuito'} />
        <InfoCard label="Estado del Plan">
          {getStatusChip(profile?.subscription_status)}
        </InfoCard>
        <InfoCard label="Créditos Restantes" value={profile?.analysis_credits} />
      </div>

      <div className={styles.manageCard}>
        <h2 className={styles.manageTitle}>Gestiona tu Plan</h2>
        <p className={styles.manageText}>
          Puedes mejorar, cambiar o cancelar tu plan en cualquier momento a través de nuestro portal de pagos seguro. También puedes actualizar tu método de pago y ver tu historial de facturación.
        </p>
        <button 
          className={styles.manageButton} 
          onClick={() => alert('Redirigiendo al portal de pagos...')}
        >
          Ir al Portal de Pagos
        </button>
      </div>
    </div>
  );
}
