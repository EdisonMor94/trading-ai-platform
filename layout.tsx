import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TradeAI Platform",
  description: "Análisis de Trading con IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-slate-900 text-slate-200`}>
        <div className="flex min-h-screen">
          {/* --- Barra de Navegación Lateral (Sidebar) --- */}
          <aside className="w-64 bg-slate-800 p-6 border-r border-slate-700 flex flex-col">
            <div className="mb-10">
                <h1 className="text-2xl font-bold text-white">TradeAI</h1>
            </div>
            <nav className="flex flex-col space-y-3">
              <a href="/dashboard" className="flex items-center py-2 px-3 rounded-lg text-white bg-purple-600 font-semibold transition-colors">
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                Nuevo Análisis
              </a>
              <a href="/history" className="flex items-center py-2 px-3 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white font-semibold transition-colors">
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Mi Historial
              </a>
              <a href="/settings" className="flex items-center py-2 px-3 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white font-semibold transition-colors">
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426-1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                Configuración
              </a>
            </nav>
            <div className="mt-auto">
              {/* Espacio para el perfil del usuario */}
            </div>
          </aside>

          {/* --- Contenido Principal --- */}
          <main className="flex-1 p-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
