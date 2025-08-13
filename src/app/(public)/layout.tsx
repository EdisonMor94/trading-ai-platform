'use client'; 

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import Image from 'next/image';
import styles from './layout.module.css'; 

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [user, setUser] = useState<User | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const getInitialSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
    }
    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className={styles.pageWrapper}>
      {/* El header es el contenedor de fondo de ancho completo */}
      <header className={`${styles.header} ${isScrolled ? styles.headerScrolled : ''}`}>
        {/* El headerContainer centra el contenido para que se alinee con la página */}
        <div className={styles.headerContainer}>
          <Link href="/" className={styles.logo}>
            <Image 
              src="/logo-aimpatfx.svg"
              alt="AImpatfx Logo" 
              width={35}
              height={35}
              priority
            />
            <span className={styles.logoText}>AImpatfx</span>
          </Link>
          <nav className={styles.navLinks}>
            <Link href="/" className={styles.navLink}>
              Inicio
            </Link>
            <Link href="/pricing" className={styles.navLink}>
              Precios
            </Link>
            
            {user ? (
              <Link href="/dashboard" className={styles.navButton}>
                Mi Perfil
              </Link>
            ) : (
              <>
                <Link href="/login" className={styles.navLink}>
                  Iniciar Sesión
                </Link>
                <Link href="/register" className={styles.navButton}>
                  Regístrate
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className={styles.mainContent}>
        {children}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerWarning}>
            <strong>Comercie de forma responsable:</strong> El trading de instrumentos financieros conlleva un alto nivel de riesgo y puede no ser adecuado para todos los inversores. Existe la posibilidad de que pierda parte o la totalidad de su capital invertido. Nunca invierta dinero que no pueda permitirse perder.
          </div>
          <div className={styles.footerLinks}>
            <Link href="/risk-warning" className={styles.footerLink}>
              Advertencia de Riesgo
            </Link>
            <span>|</span>
            <Link href="/disclaimer" className={styles.footerLink}>
              Descargo de Responsabilidad
            </Link>
          </div>
          <div className={styles.footerCopyright}>
            © 2025 AImpatfx. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}






