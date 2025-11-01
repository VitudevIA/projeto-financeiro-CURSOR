import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { authRateLimiter, apiRateLimiter } from '@/lib/security/rate-limiter'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Rate Limiting para endpoints críticos
  const pathname = request.nextUrl.pathname
  
  // Rate limit em login/signup
  if (pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    const identifier = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown'
    const limitCheck = await authRateLimiter.check(identifier)
    
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((limitCheck.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Remaining': String(limitCheck.remaining),
            'X-RateLimit-Reset': String(limitCheck.resetTime),
          }
        }
      )
    }
    
    // Adicionar headers de rate limit
    response.headers.set('X-RateLimit-Remaining', String(limitCheck.remaining))
    response.headers.set('X-RateLimit-Reset', String(limitCheck.resetTime))
  }

  // Rate limiting geral para API routes
  if (pathname.startsWith('/api/')) {
    const identifier = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown'
    const limitCheck = await apiRateLimiter.check(identifier)
    
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit excedido' },
        { status: 429 }
      )
    }
  }

  // Proteção de rotas autenticadas
  if (pathname.startsWith('/dashboard') || 
      pathname.startsWith('/transactions') ||
      pathname.startsWith('/cards') ||
      pathname.startsWith('/budgets') ||
      pathname.startsWith('/settings')) {
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: any) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
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
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Content Security Policy - Permite Supabase e recursos necessários
  let supabaseDomains = "https://*.supabase.co wss://*.supabase.co"
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl) {
      const url = new URL(supabaseUrl)
      const domain = url.origin
      // Adiciona o domínio específico + wildcard para outros projetos Supabase
      supabaseDomains = `${domain} https://*.supabase.co wss://*.supabase.co`
    }
  } catch (e) {
    // Se falhar ao parsear, usa apenas wildcard
    console.warn('Erro ao parsear URL do Supabase para CSP:', e)
  }
  
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js precisa de unsafe-eval e unsafe-inline
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Google Fonts
      "font-src 'self' https://fonts.gstatic.com data:", // Google Fonts
      "img-src 'self' data: https: blob:", // Imagens de qualquer origem HTTPS
      `connect-src 'self' ${supabaseDomains}`, // Supabase API e WebSocket
      "frame-src 'none'", // Não permite iframes
      "base-uri 'self'", // Apenas origem própria para base URI
      "form-action 'self'", // Formulários apenas para origem própria
      "frame-ancestors 'none'", // Não permite ser incorporado
      "object-src 'none'", // Não permite objetos embarcados
    ].join('; ')
  )

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
