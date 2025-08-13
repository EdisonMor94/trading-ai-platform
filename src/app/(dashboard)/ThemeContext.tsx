'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Definimos el tipo para el contexto del tema
type ThemeContextType = {
  theme: string;
  setTheme: (theme: string) => void;
};

// Creamos el contexto con un valor por defecto
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Creamos el componente "Proveedor" que envolverá nuestra aplicación
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState('dark'); // 'dark' como valor inicial seguro

  useEffect(() => {
    // Este efecto se ejecuta solo una vez en el cliente para establecer el tema inicial
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
      setTheme(savedTheme);
    } else if (prefersDark) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    // Este efecto se ejecuta cada vez que el tema cambia
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const value = { theme, setTheme };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Creamos un "hook" personalizado para usar fácilmente el contexto en otros componentes
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
