'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useAuthInit } from '@/hooks/useAuthInit'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  CreditCard, 
  Receipt, 
  PiggyBank, 
  Settings,
  LogOut,
  Zap,
  Menu,
  X
} from 'lucide-react'
import { TransactionLimitStatus } from '@/components/transaction-limit-checker'
import { cn } from '@/lib/utils'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, signOut } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Inicializa autenticação de forma segura (apenas uma vez)
  useAuthInit()

  // Marca como montado após a hidratação (evita hydration mismatch)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Fecha sidebar ao mudar de rota no mobile
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  // Renderiza loading consistente no servidor e cliente
  if (!isMounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecionando para o login...</p>
        </div>
      </div>
    )
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Transações', href: '/transactions', icon: Receipt },
    { name: 'Cartões', href: '/cards', icon: CreditCard },
    { name: 'Orçamentos', href: '/budgets', icon: PiggyBank },
    { name: 'Planos', href: '/plans', icon: Zap },
    { name: 'Configurações', href: '/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              💰 Finanças
            </h1>
          </div>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-xs font-semibold text-primary-foreground">
              {user.full_name?.charAt(0) || 'U'}
            </span>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo Desktop */}
          <div className="hidden lg:flex h-20 items-center justify-between px-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Gestão Financeira</h1>
                <p className="text-xs text-muted-foreground">Controle total</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Logo Mobile */}
          <div className="lg:hidden flex h-16 items-center justify-between px-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-lg">💰</span>
              </div>
              <h1 className="text-lg font-bold">Gestão Financeira</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-transform",
                    isActive ? "scale-110" : "group-hover:scale-105"
                  )} />
                  <span>{item.name}</span>
                  {isActive && (
                    <div className="ml-auto h-2 w-2 rounded-full bg-primary-foreground/40" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="border-t border-border p-4 space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                <span className="text-sm font-semibold text-primary-foreground">
                  {user.full_name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user.full_name || 'Usuário'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.is_admin ? 'Administrador' : 'Usuário'}
                </p>
              </div>
            </div>
            <TransactionLimitStatus />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72">
        <main className="py-6 lg:py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
