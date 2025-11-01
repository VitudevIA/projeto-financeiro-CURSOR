'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/lib/stores/auth-store'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuthStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await signIn(email, password)
      
      if (error) {
        // Mensagens de erro mais amigáveis
        if (error.includes('Invalid login credentials') || error.includes('Invalid')) {
          toast.error('Email ou senha incorretos. Verifique suas credenciais.')
        } else if (error.includes('Email not confirmed')) {
          toast.error('Por favor, confirme seu email antes de fazer login. Verifique sua caixa de entrada.')
        } else if (error.includes('perfil') || error.includes('usuário não encontrado')) {
          toast.error('Usuário não encontrado. Tente fazer o cadastro novamente.')
        } else {
          toast.error(error)
        }
        setLoading(false)
        return
      }

      console.log('Verificando sessao apos login...')
      const supabase = createClient()
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      console.log('Session data:', sessionData)
      console.log('Session error:', sessionError)
      
      if (sessionData.session) {
        console.log('Sessao criada com sucesso!')
        console.log('User ID:', sessionData.session.user.id)
        console.log('Email:', sessionData.session.user.email)
        // Sincroniza cookies no servidor para o middleware reconhecer a sessão
        // Esta chamada é opcional - o login funciona mesmo se falhar
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 3000) // 3s timeout
          
          const callbackResponse = await fetch('/auth/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'SIGNED_IN', session: sessionData.session }),
            signal: controller.signal,
          })
          
          clearTimeout(timeoutId)
          
          if (!callbackResponse.ok) {
            const errorData = await callbackResponse.json().catch(() => ({}))
            console.warn('Callback retornou status não-OK:', callbackResponse.status, errorData)
          }
        } catch (e: any) {
          // Erro de rede é esperado em alguns casos (offline, timeout, abort)
          // Não é crítico para o login funcionar - o Supabase já persiste a sessão
          if (e.name !== 'AbortError') {
            console.warn('Falha ao sincronizar cookies no callback (não crítico):', e.message || e)
          }
        }
      } else {
        console.error('Nenhuma sessao encontrada apos login!')
      }

      toast.success('Login realizado com sucesso!')

      // Garante que a sessão foi persistida antes de navegar
      const start = Date.now()
      const supa = createClient()
      let hasSession = false
      for (let i = 0; i < 5; i++) {
        const { data } = await supa.auth.getSession()
        if (data.session) { hasSession = true; break }
        await new Promise(r => setTimeout(r, 150))
      }
      console.log('Sessão pronta?', hasSession, 'em', Date.now() - start, 'ms')

      // Navegação preferencial via router (SPA)
      router.replace('/dashboard')

      // Fallback hard redirect (garante cookies em caso de edge/middleware)
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== '/dashboard') {
          window.location.assign('/dashboard')
        }
      }, 500)
    } catch (err) {
      console.error('Erro no login:', err)
      toast.error('Erro ao fazer login. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
      </div>
      
      <div className="max-w-md w-full space-y-8 relative z-10">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20 mb-2">
            <span className="text-3xl">💰</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Bem-vindo de volta!
          </h1>
          <p className="text-muted-foreground">
            Acesse sua conta para continuar gerenciando suas finanças
          </p>
          <p className="text-sm text-muted-foreground">
            Não tem uma conta?{' '}
            <Link href="/signup" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Criar conta
            </Link>
          </p>
        </header>

        <Card className="border-border/50 shadow-xl backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl">Entrar</CardTitle>
            <CardDescription>
              Digite suas credenciais para acessar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5" aria-label="Formulário de login">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 border-border/50 focus:border-primary focus:ring-primary/20"
                  placeholder="seu@email.com"
                  aria-label="Email do usuário"
                  aria-required="true"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Senha
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 border-border/50 focus:border-primary focus:ring-primary/20"
                  placeholder="••••••••"
                  aria-label="Senha do usuário"
                  aria-required="true"
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  aria-label="Recuperar senha esquecida"
                >
                  Esqueceu sua senha?
                </Link>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md shadow-primary/20 font-semibold" 
                disabled={loading} 
                aria-label={loading ? 'Fazendo login...' : 'Entrar na conta'}
              >
                {loading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}