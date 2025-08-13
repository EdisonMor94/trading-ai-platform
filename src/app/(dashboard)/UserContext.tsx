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
  watchlist: string[]; // Añadido para que el perfil esté completo
  calendar_preferences: any; // Añadido para que el perfil esté completo
  // Añade aquí cualquier otro campo del perfil que necesites en el futuro
}

// Definimos el tipo para el valor del contexto
type UserContextType = {
  user: User | null;
  profile: Profile | null;
  permissions: ReturnType<typeof getPermissionsForPlan>;
  loading: boolean;
  refreshProfile: () => Promise<void>; // <-- AÑADIMOS LA NUEVA FUNCIÓN
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
  const [loading, setLoading] = useState(true);

  // --- INICIO DE LA MODIFICACIÓN ---
  // Envolvemos la lógica de fetch en un useCallback para poder reutilizarla
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
  // --- FIN DE LA MODIFICACIÓN ---


  useEffect(() => {
    const getInitialUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        await fetchProfile(user);
      }
      setLoading(false);
    };

    getInitialUserAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user;
      setUser(currentUser ?? null);
      
      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  // --- INICIO DE LA MODIFICACIÓN ---
  // Creamos la función de refresco que el dashboard podrá llamar
  const refreshProfile = async () => {
    if (user) {
      console.log("Refrescando datos del perfil...");
      await fetchProfile(user);
    }
  };
  // --- FIN DE LA MODIFICACIÓN ---

  const permissions = getPermissionsForPlan(profile?.subscription_plan);

  const value = { user, profile, permissions, loading, refreshProfile }; // <-- AÑADIMOS LA FUNCIÓN AL VALOR

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