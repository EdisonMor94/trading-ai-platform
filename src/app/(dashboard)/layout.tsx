'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import DashboardNav from './components/DashboardNav';
import styles from './layout.module.css';
import { ThemeProvider } from './ThemeContext';
import { UserProvider, useUser } from './UserContext'; // Importamos el Proveedor y el hook

// Componente interno que se renderiza dentro de los proveedores
// y por lo tanto, tiene acceso a sus contextos (tema y usuario).
function DashboardUI({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useUser(); // Obtenemos los datos del UserContext
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Muestra un estado de carga mientras se obtienen los datos del usuario
  if (loading) {
    return <div className={styles.loadingState}>Cargando plataforma...</div>;
  }

  return (
    <div className={`${styles.dashboardContainer} ${isCollapsed ? styles.collapsed : ''}`}>
      <DashboardNav 
        user={user} 
        profile={profile} 
        handleLogout={handleLogout}
        isCollapsed={isCollapsed}
        toggleSidebar={toggleSidebar}
      />
      <main className={styles.contentArea}>
        {children}
      </main>
    </div>
  );
}

// El layout principal ahora solo se encarga de anidar los proveedores
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider>
      <UserProvider>
        <DashboardUI>{children}</DashboardUI>
      </UserProvider>
    </ThemeProvider>
  );
}

