import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()

    // Validar variáveis de ambiente
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Variáveis de ambiente do Supabase não configuradas')
      return NextResponse.json({ ok: false, error: 'configuration_error' }, { status: 500 })
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Parse JSON com tratamento de erro
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('Erro ao parsear JSON do callback:', parseError)
      return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
    }

    const { event, session } = body

    // Validar dados recebidos
    if (!event) {
      return NextResponse.json({ ok: false, error: 'missing_event' }, { status: 400 })
    }

    try {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'PASSWORD_RECOVERY') {
        if (session?.access_token && session?.refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          })

          if (sessionError) {
            console.error('Erro ao definir sessão no Supabase:', sessionError)
            return NextResponse.json({ ok: false, error: 'session_error' }, { status: 400 })
          }
        } else {
          console.warn('Sessão recebida sem tokens válidos')
          return NextResponse.json({ ok: false, error: 'invalid_session' }, { status: 400 })
        }
      }

      if (event === 'SIGNED_OUT') {
        const { error: signOutError } = await supabase.auth.signOut()
        if (signOutError) {
          console.error('Erro ao fazer sign out:', signOutError)
        }
      }

      return NextResponse.json({ ok: true })
    } catch (e) {
      console.error('Erro ao processar callback:', e)
      return NextResponse.json({ ok: false, error: 'callback_failed' }, { status: 500 })
    }
  } catch (e) {
    console.error('Erro inesperado no callback:', e)
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 })
  }
}
