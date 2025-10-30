import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  // Atualiza sessão e obtém usuário
  const { response, user } = await updateSession(req)

  const protectedRoutes = ['/dashboard', '/transactions', '/cards', '/budgets', '/settings']
  const authRoutes = ['/login', '/signup', '/forgot-password']

  const pathname = req.nextUrl.pathname
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // Se tentar acessar rota protegida sem autenticação, redireciona para login
  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', req.url)
    // Adiciona redirectTo para voltar após login
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Se tentar acessar rota de autenticação já autenticado, redireciona para dashboard
  if (isAuthRoute && user) {
    const dashboardUrl = new URL('/dashboard', req.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}