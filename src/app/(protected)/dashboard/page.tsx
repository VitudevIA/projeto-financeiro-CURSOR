'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useDashboardStore } from '@/lib/stores/dashboard-store'
import { formatCurrency } from '@/utils/helpers'
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar, Target, LogOut } from 'lucide-react'
import Link from 'next/link'
import TimeSeriesChart from '@/components/charts/time-series-chart'
import PieChartComponent from '@/components/charts/pie-chart'
import BarChartComponent from '@/components/charts/bar-chart'
import InsightsCard from '@/components/insights/insights-card'
import { useUserDataSync } from '@/hooks/useUserDataSync'

export default function DashboardPage() {
  const { user, signOut } = useAuthStore()
  const { kpis, timeSeriesData, categoryData, topTransactions, loading, fetchDashboardData } = useDashboardStore()
  const router = useRouter()

  useUserDataSync()
  // Proteção de rota
  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  // Função de logout
  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [fetchDashboardData, user])

  // Loading se não tem user
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Carregando...</h1>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Bem-vindo, {user?.full_name || 'Usuário'}!</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const kpiCards = kpis ? [
    {
      title: 'Total Gasto',
      value: formatCurrency(kpis.totalSpent),
      icon: DollarSign,
      description: 'Este mês',
      color: 'text-red-600',
    },
    {
      title: 'Média Diária',
      value: formatCurrency(kpis.dailyAverage),
      icon: TrendingUp,
      description: 'Gasto médio por dia',
      color: 'text-blue-600',
    },
    {
      title: 'Projeção do Mês',
      value: formatCurrency(kpis.monthlyProjection),
      icon: Calendar,
      description: 'Baseado na média atual',
      color: 'text-green-600',
    },
    {
      title: 'Orçamento Usado',
      value: `${kpis.budgetUsedPercentage}%`,
      icon: Target,
      description: 'Do orçamento mensal',
      color: kpis.budgetUsedPercentage > 80 ? 'text-red-600' : 'text-yellow-600',
    },
    {
      title: 'Saldo Disponível',
      value: formatCurrency(kpis.availableBalance),
      icon: TrendingDown,
      description: 'Saldo restante',
      color: 'text-green-600',
    },
    {
      title: 'Dias de Reserva',
      value: `${kpis.daysOfReserve} dias`,
      icon: Calendar,
      description: 'Com o saldo atual',
      color: 'text-purple-600',
    },
  ] : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Bem-vindo, {user?.full_name || 'Usuário'}!</p>
        </div>
        <div className="flex space-x-3">
          <Link href="/transactions/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Transação
            </Button>
          </Link>
          <Link href="/cards/new">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Novo Cartão
            </Button>
          </Link>
          {/* Botão de Logout */}
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {kpi.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${kpi.color}`}>
                  {kpi.value}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {kpi.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução dos Gastos</CardTitle>
            <CardDescription>
              Gastos diários do mês atual
            </CardDescription>
          </CardHeader>
          <CardContent>
            {timeSeriesData.length > 0 ? (
              <TimeSeriesChart data={timeSeriesData} />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Nenhum dado de gastos disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Categoria</CardTitle>
            <CardDescription>
              Gastos por categoria no mês
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <PieChartComponent data={categoryData} />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Nenhum dado de categoria disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categories Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Categorias</CardTitle>
            <CardDescription>
              Categorias com maiores gastos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <BarChartComponent data={categoryData.slice(0, 5)} />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Nenhum dado de categoria disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Transações</CardTitle>
            <CardDescription>
              Maiores gastos do período
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topTransactions.length > 0 ? (
              <div className="space-y-3">
                {topTransactions.map((transaction, index) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{transaction.description}</p>
                        <p className="text-sm text-gray-500">{transaction.category.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(transaction.amount)}</p>
                      <p className="text-sm text-gray-500">{new Date(transaction.transaction_date).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Nenhuma transação encontrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insights Section */}
      <InsightsCard />

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
          <CardDescription>
            Últimas transações registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center text-gray-500 py-8">
              Nenhuma transação encontrada. 
              <Link href="/transactions/new" className="text-blue-600 hover:text-blue-500 ml-1">
                Adicione sua primeira transação
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}