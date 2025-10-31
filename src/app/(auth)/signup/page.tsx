'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuthStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)

    const { error } = await signUp(email, password, fullName)
    
    if (error) {
      toast.error(error)
    } else {
      toast.success('Conta criada com sucesso! Verifique seu email para confirmar.')
      router.push('/login')
    }
    
    setLoading(false)
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
            Comece agora!
          </h1>
          <p className="text-muted-foreground">
            Crie sua conta e comece a gerenciar suas finanças
          </p>
          <p className="text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Fazer login
            </Link>
          </p>
        </header>

        <Card className="border-border/50 shadow-xl backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl">Cadastrar</CardTitle>
            <CardDescription>
              Preencha os dados abaixo para criar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium text-foreground">
                  Nome completo
                </label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-11 border-border/50 focus:border-primary focus:ring-primary/20"
                  placeholder="Seu nome completo"
                />
              </div>

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
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirmar senha
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-11 border-border/50 focus:border-primary focus:ring-primary/20"
                  placeholder="••••••••"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md shadow-primary/20 font-semibold" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    Criando conta...
                  </>
                ) : (
                  'Criar conta'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
