// middleware.ts

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Nota: La creación del cliente de Supabase se puede simplificar si no necesitas 
  // modificar las cookies en cada paso, pero la dejaremos como la tienes por ahora.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          const response = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // --- LÓGICA CORREGIDA ---

  // 1. Si el usuario está logueado y trata de ir a /login o /registrate, redirígelo al dashboard.
  const authPages = ['/login', '/registrate']; // Agrega aquí tus páginas de autenticación
  if (user && authPages.includes(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // 2. Si el usuario NO está logueado, la protección se manejará con el `matcher` de abajo.
  //    No necesitamos una regla de redirección general aquí. El middleware solo se ejecutará
  //    en las rutas protegidas por el `matcher`. Si el usuario no está logueado en una de esas,
  //    lo redirigimos.
  if (!user) {
    // La URL original se pasa como parámetro para que después del login, 
    // el usuario sea redirigido a la página que intentaba visitar.
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return res
}

// --- CONFIGURACIÓN CORREGIDA ---
export const config = {
  // El matcher ahora SOLO incluye las rutas que quieres PROTEGER.
  // La página de inicio ('/'), /login, /registrate, etc., quedan fuera y serán públicas.
  matcher: [
    '/dashboard/:path*', // Protege el dashboard y cualquier sub-ruta (ej: /dashboard/profile)
    '/settings',         // Protege la página de configuración
    '/history',          // Protege el historial
    // Agrega aquí cualquier otra ruta que deba ser privada.
  ],
}