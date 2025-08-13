'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { getPermissionsForPlan, PlanName } from './permissions';

// Definimos la interfaz completa para el perfil del usuario
interface Profile {
  id: string;
  full_name: string;
  subscription_plan: PlanName;
  watchlist: string[];
  calendar_preferences: any;
  // Añade aquí cualquier otro campo del perfil
}

// Definimos el tipo para el valor del contexto
type UserContextType = {
  user: User | null;
  profile: Profile | null;
  permissions: ReturnType<typeof getPermissionsForPlan>;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

// Creamos el contexto
const UserContext = createContext<UserContextType | undefined>(undefined);

// Creamos el componente Proveedor
export function UserProvider({ children }: { children: ReactNode }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true); // El estado inicial siempre es 'cargando'

  // --- LÓGICA DE OBTENCIÓN DE PERFIL (SIN CAMBIOS) ---
  const fetchProfile = useCallback(async (currentUser: User) => {
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();
    
    if (error) {
      console.error("Error al obtener el perfil del usuario:", error);
      setProfile(null);
    } else {
      setProfile(profileData);
    }
  }, [supabase]);

  // --- USEEFFECT PRINCIPAL (LÓGICA CORREGIDA) ---
  useEffect(() => {
    // Esta función se ejecutará solo una vez al montar el componente
    const initializeSession = async () => {
      // 1. Obtenemos la sesión inicial. Esto restaura la sesión si el usuario ya estaba logueado.
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      setUser(currentUser ?? null);

      // 2. Si hay un usuario, buscamos su perfil.
      if (currentUser) {
        await fetchProfile(currentUser);
      }

      // 3. Marcamos la carga inicial como completada, SOLO DESPUÉS de terminar la primera comprobación.
      setLoading(false);

      // 4. Creamos el listener para futuros cambios (login/logout)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        const newCurrentUser = session?.user;
        setUser(newCurrentUser ?? null);

        if (newCurrentUser) {
          // Si hay un nuevo usuario (ej. después de un login), buscamos su perfil
          await fetchProfile(newCurrentUser);
        } else {
          // Si el usuario cierra sesión, limpiamos el perfil
          setProfile(null);
        }
      });

      // 5. Devolvemos la función de limpieza para el listener
      return () => {
        subscription.unsubscribe();
      };
    };

    const subscriptionPromise = initializeSession();

    // Función de limpieza del useEffect
    return () => {
      // Nos aseguramos de desuscribirnos si el componente se desmonta
      subscriptionPromise.then(cleanup => cleanup && cleanup());
    };
  }, [supabase, fetchProfile]); // Las dependencias son estables y no causarán re-ejecuciones

  // --- FUNCIÓN DE REFRESCO (SIN CAMBIOS) ---
  const refreshProfile = async () => {
    if (user) {
      console.log("Refrescando datos del perfil...");
      await fetchProfile(user);
    }
  };

  const permissions = getPermissionsForPlan(profile?.subscription_plan);
  const value = { user, profile, permissions, loading, refreshProfile };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

// Hook personalizado (sin cambios)
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}