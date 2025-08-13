'use client'

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import styles from './Header.module.css';
import type { User } from '@supabase/supabase-js';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Añadimos un estado de carga

  // Usamos una referencia constante para el cliente de Supabase
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // Función para obtener el estado de autenticación
    const getAuthState = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getAuthState();

    // Escuchamos los cambios de autenticación (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Limpiamos la suscripción al desmontar el componente
    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase]);

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        AImpatfx
      </Link>
      <nav className={styles.navLinks}>
        {/* No mostramos nada mientras carga para evitar un parpadeo */}
        {!loading && (
          <>
            {user ? (
              // Si el usuario existe, mostrar enlace al Dashboard
              <Link href="/dashboard" className={styles.navButton}>
                Ir al Dashboard
              </Link>
            ) : (
              // Si no hay usuario, mostrar enlaces de Login y Registro
              <>
                <Link href="/login" className={styles.navLink}>
                  Iniciar Sesión
                </Link>
                <Link href="/login" className={styles.navButton}>
                  Regístrate
                </Link>
              </>
            )}
          </>
        )}
      </nav>
    </header>
  );
}
