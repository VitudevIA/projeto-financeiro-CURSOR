import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  // Verifique se as variáveis de ambiente existem
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    // Se estiver em desenvolvimento, permita continuar sem redirecionar
    if (process.env.NODE_ENV === 'development') {
      return response
    }
    // Em produção, redirecione para uma página de erro
    return NextResponse.redirect(new URL('/error', req.url))
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protected routes
  const protectedRoutes = ['/dashboard', '/transactions', '/cards', '/budgets', '/settings']
  const authRoutes = ['/login', '/signup', '/forgot-password']

  const isProtectedRoute = protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => req.nextUrl.pathname.startsWith(route))

  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Redirect to dashboard if accessing auth routes with session
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}