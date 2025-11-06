'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useDashboardStore } from '@/lib/stores/dashboard-store'
import { formatCurrency } from '@/utils/helpers'
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar, Target, Receipt } from 'lucide-react'
import Link from 'next/link'
import TimeSeriesChart from '@/components/charts/time-series-chart'
import PieChartComponent from '@/components/charts/pie-chart'
import BarChartComponent from '@/components/charts/bar-chart'
import InsightsCard from '@/components/insights/insights-card'
import { useUserDataSync } from '@/hooks/useUserDataSync'
import { cn } from '@/lib/utils'
import { DashboardFilters, type DashboardFilters as DashboardFiltersType } from '@/components/dashboard/dashboard-filters-v2'
import { ComparisonChart } from '@/components/dashboard/comparison-chart'

// Função auxiliar para formatar descrição do período
const getPeriodDescription = (filters: DashboardFiltersType): string => {
  if (filters.periodPreset === 'current-month') return 'Este mês'
  if (filters.periodPreset === 'last-month') return 'Mês anterior'
  if (filters.periodPreset === 'last-quarter') return 'Último trimestre'
  if (filters.periodPreset === 'last-year') return 'Ano anterior'
  if (filters.periodPreset === 'compare') return 'Período atual'
  if (filters.periodPreset === 'custom') {
    const start = new Date(filters.startDate)
    const end = new Date(filters.endDate)
    return `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
  }
  return 'Período selecionado'
}

export default function DashboardPage() {
  const { user, signOut } = useAuthStore()
  const { kpis, timeSeriesData, categoryData, topTransactions, recentTransactions, totalTransactions, comparisonData, loading, fetchDashboardData } = useDashboardStore()
  const router = useRouter()
  
  // Estado dos filtros
  const [filters, setFilters] = useState<DashboardFiltersType>(() => {
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    return {
      startDate: currentMonthStart.toISOString().split('T')[0],
      endDate: currentMonthEnd.toISOString().split('T')[0],
      categoryId: null,
      cardId: null,
      periodPreset: 'current-month',
      compareMode: false,
    }
  })

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

  // Busca dados quando usuário ou filtros mudarem
  useEffect(() => {
    if (user) {
      fetchDashboardData(user, filters)
    }
  }, [fetchDashboardData, user, filters])

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
      description: filters.periodPreset === 'compare' ? 'Período atual' : getPeriodDescription(filters),
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
      {/* Header Moderno */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Olá, <span className="font-semibold text-foreground">{user?.full_name || 'Usuário'}</span>! 👋
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/transactions/new">
            <Button className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" />
              Nova Transação
            </Button>
          </Link>
          <Link href="/cards/new">
            <Button variant="outline" className="border-primary/20 hover:bg-primary/5">
              <Plus className="mr-2 h-4 w-4" />
              Novo Cartão
            </Button>
          </Link>
        </div>
      </div>

      {/* Filtros Multidimensionais */}
      <DashboardFilters 
        filters={filters} 
        onFiltersChange={setFilters}
        transactionCount={totalTransactions}
      />

      {/* Comparação de Períodos */}
      {comparisonData && filters.compareMode && (
        <ComparisonChart 
          comparisonData={comparisonData}
          filters={filters}
        />
      )}

      {/* KPIs Grid Moderno */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon
          const isPrimary = index === 0 || index === 2 // Saldo e Total Gasto destacados
          return (
            <Card 
              key={index}
              className={cn(
                "relative overflow-hidden transition-all duration-300",
                isPrimary 
                  ? "border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-lg shadow-primary/10" 
                  : "hover:shadow-md"
              )}
            >
              {isPrimary && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
              )}
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <div className={cn(
                  "p-2 rounded-lg",
                  index === 0 ? "bg-destructive/10 text-destructive" :
                  index === 1 ? "bg-primary/10 text-primary" :
                  index === 2 ? "bg-success/10 text-success" :
                  index === 3 ? "bg-warning/10 text-warning" :
                  "bg-accent/10 text-accent"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className={cn(
                  "text-3xl font-bold mb-1",
                  index === 0 ? "text-destructive" :
                  index === 1 ? "text-primary" :
                  index === 2 ? "text-success" :
                  index === 3 ? "text-warning" :
                  "text-accent"
                )}>
                  {kpi.value}
                </div>
                <p className="text-xs text-muted-foreground">
                  {kpi.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Section Moderna */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolution Chart */}
        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Evolução dos Gastos</CardTitle>
                <CardDescription className="mt-1">
                  Gastos diários {getPeriodDescription(filters).toLowerCase()}
                </CardDescription>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {timeSeriesData.length > 0 ? (
              <TimeSeriesChart data={timeSeriesData} />
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mb-3 opacity-50" />
                <p>Nenhum dado de gastos disponível</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Distribuição por Categoria</CardTitle>
                <CardDescription className="mt-1">
                  Gastos por categoria {getPeriodDescription(filters).toLowerCase()}
                </CardDescription>
              </div>
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <PieChartComponent data={categoryData} />
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                <Target className="h-12 w-12 mb-3 opacity-50" />
                <p>Nenhum dado de categoria disponível</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categories Bar Chart */}
        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Top Categorias</CardTitle>
                <CardDescription className="mt-1">
                  Categorias com maiores gastos
                </CardDescription>
              </div>
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <BarChartComponent data={categoryData.slice(0, 5)} />
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                <Target className="h-12 w-12 mb-3 opacity-50" />
                <p>Nenhum dado de categoria disponível</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Transactions */}
        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Top 5 Transações</CardTitle>
                <CardDescription className="mt-1">
                  Maiores gastos do período
                </CardDescription>
              </div>
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {topTransactions.length > 0 ? (
              <div className="space-y-2">
                {topTransactions.map((transaction, index) => (
                  <div 
                    key={transaction.id} 
                    className="flex items-center justify-between p-4 border border-border/50 rounded-xl hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm",
                        index === 0 ? "bg-gradient-to-br from-warning to-warning/80 text-warning-foreground" :
                        index === 1 ? "bg-gradient-to-br from-muted to-muted/80 text-foreground" :
                        index === 2 ? "bg-gradient-to-br from-muted/80 to-muted/60 text-foreground" :
                        "bg-muted/60 text-muted-foreground"
                      )}>
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">{transaction.category.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive">{formatCurrency(transaction.amount)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(transaction.transaction_date).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                <Receipt className="h-12 w-12 mb-3 opacity-50" />
                <p>Nenhuma transação encontrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insights Section */}
      <InsightsCard />

      {/* Recent Transactions */}
      <Card className="border-border/50 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Transações Recentes</CardTitle>
              <CardDescription className="mt-1">
                Últimas transações do período filtrado
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recentTransactions.length > 0 ? (
            <div className="space-y-2">
              {recentTransactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className="flex items-center justify-between p-4 border border-border/50 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{transaction.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{transaction.category?.name || 'Sem categoria'}</span>
                        {transaction.card && (
                          <>
                            <span>•</span>
                            <span>{transaction.card.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className={cn(
                      "font-bold",
                      transaction.type === 'expense' ? "text-destructive" : "text-green-600"
                    )}>
                      {transaction.type === 'expense' ? '-' : '+'}{formatCurrency(Math.abs(transaction.amount))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.transaction_date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Receipt className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">
                Nenhuma transação encontrada no período filtrado.
              </p>
              <Link href="/transactions/new">
                <Button variant="outline" className="mt-2 border-primary/20 hover:bg-primary/5">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar transação
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}