import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { CookieOptions } from '@supabase/ssr'

export default async function Home() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // El método moderno usa 'getAll'
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    redirect('/dashboard')
  } else {
    redirect('/login') // Añadimos una redirección explícita a login
  }
  
  return null;
}