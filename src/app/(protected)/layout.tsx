'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useAuthInit } from '@/hooks/useAuthInit'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  CreditCard, 
  Receipt, 
  PiggyBank, 
  Settings,
  LogOut,
  Zap
} from 'lucide-react'
import { TransactionLimitStatus } from '@/components/transaction-limit-checker'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, signOut } = useAuthStore()
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  
  // Inicializa autenticação de forma segura (apenas uma vez)
  useAuthInit()

  // Marca como montado após primeiro render (evita hydration mismatch)
  // IMPORTANTE: Isso deve estar em useEffect, não no corpo do componente
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  // Durante loading inicial, mostra loading
  // O middleware do Next.js já deve ter verificado e redirecionado se necessário
  if (!isMounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Se após o loading não houver usuário, o middleware já deveria ter redirecionado
  // Mas por segurança, mostra mensagem (não faz redirect aqui para evitar loops)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Redirecionando para o login...</div>
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
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">💰 Gestão Financeira</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User info and logout */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-700">
                  {user.full_name || 'Usuário'}
                </p>
                <p className="text-xs text-gray-500">
                  {user.is_admin ? 'Administrador' : 'Usuário'}
                </p>
                <TransactionLimitStatus />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="w-full mt-3"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
