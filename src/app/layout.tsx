import type { Metadata } from "next";
import { Inter } from "next/font/google";
// Importamos solo los estilos globales
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AImpatfx Platform",
  description: "Análisis de Trading con IA",
};

// Este es el layout más simple posible.
// Solo define la estructura HTML básica y aplica la fuente.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {/* 'children' será el layout de (public) o el de (dashboard) */}
        {children}
      </body>
    </html>
  );
}


