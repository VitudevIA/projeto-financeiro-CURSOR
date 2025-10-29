import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const { response, user } = await updateSession(req)

  const protectedRoutes = ['/dashboard', '/transactions', '/cards', '/budgets', '/settings']
  const authRoutes = ['/login', '/signup', '/forgot-password']

  const isProtectedRoute = protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => req.nextUrl.pathname.startsWith(route))

  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  if (isAuthRoute && user) {
    const redirectUrl = new URL('/dashboard', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}