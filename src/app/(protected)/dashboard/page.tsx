'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useDashboardStore } from '@/lib/stores/dashboard-store'
import { formatCurrency } from '@/utils/helpers'
import {
  Plus,
  TrendingUp,
  DollarSign,
  Calendar,
  Target,
  Receipt,
  ArrowUpCircle,
  ArrowDownCircle,
  PiggyBank,
  Lock,
  X,
} from 'lucide-react'
import Link from 'next/link'
import TimeSeriesChart from '@/components/charts/time-series-chart'
import PieChartComponent from '@/components/charts/pie-chart'
import BarChartComponent from '@/components/charts/bar-chart'
import InsightsCard from '@/components/insights/insights-card'
import { useUserDataSync } from '@/hooks/useUserDataSync'
import { cn } from '@/lib/utils'
import { DashboardFilters, type DashboardFilters as DashboardFiltersType } from '@/components/dashboard/dashboard-filters-v2'
import { ComparisonChart } from '@/components/dashboard/comparison-chart'
import {
  buildCompetenciaExpenseSeriesFromTransactions,
  getMonthDateRange,
  monthYearFromDateString,
} from '@/utils/mes-referencia'

const getPeriodDescription = (filters: DashboardFiltersType): string => {
  if (filters.periodPreset === 'current-month') return 'Este mês'
  if (filters.periodPreset === 'last-month') return 'Mês anterior'
  if (filters.periodPreset === 'last-quarter') return 'Último trimestre'
  if (filters.periodPreset === 'last-year') return 'Ano anterior'
  if (filters.periodPreset === 'compare') return 'Período atual'
  if (filters.periodPreset === 'custom') {
    const { month, year } = monthYearFromDateString(filters.startDate)
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0)
    return `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
  }
  return 'Período selecionado'
}

function getSavingsHealth(rate: number): {
  label: string
  badgeClass: string
  valueClass: string
} {
  if (rate > 20) {
    return {
      label: 'Saudável',
      badgeClass: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100',
      valueClass: 'text-green-600',
    }
  }
  if (rate >= 10) {
    return {
      label: 'Atenção',
      badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100',
      valueClass: 'text-yellow-600',
    }
  }
  return {
    label: 'Crítico',
    badgeClass: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100',
    valueClass: 'text-red-600',
  }
}

function getBudgetProgressColor(percentage: number): string {
  if (percentage > 80) return '[&>[data-slot=progress-indicator]]:bg-destructive'
  if (percentage > 50) return '[&>[data-slot=progress-indicator]]:bg-yellow-500'
  return '[&>[data-slot=progress-indicator]]:bg-green-500'
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const {
    kpis,
    categoryData,
    topTransactions,
    recentTransactions,
    totalTransactions,
    total_incomes,
    total_expenses,
    savings_rate,
    committed_future_expenses,
    selectedCategoryFilter,
    periodTransactionsCache,
    comparisonData,
    loading,
    fetchDashboardData,
    setCategoryFilter,
  } = useDashboardStore()
  const router = useRouter()

  const [filters, setFilters] = useState<DashboardFiltersType>(() => {
    const now = new Date()
    const range = getMonthDateRange(now.getFullYear(), now.getMonth())

    return {
      startDate: range.start,
      endDate: range.end,
      categoryId: null,
      cardId: null,
      periodPreset: 'current-month',
      compareMode: false,
    }
  })

  useUserDataSync()

  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  useEffect(() => {
    if (user) {
      fetchDashboardData(user, filters)
    }
  }, [fetchDashboardData, user, filters])

  const availableBalance = total_incomes - total_expenses
  const periodLabel = filters.periodPreset === 'compare' ? 'Período atual' : getPeriodDescription(filters)
  const savingsHealth = getSavingsHealth(savings_rate)
  const budgetUsedPercentage = kpis?.budgetUsedPercentage ?? 0
  const selectedCategoryName =
    categoryData.find((c) => c.categoryId === selectedCategoryFilter)?.name ?? 'Categoria'

  const competenciaTimeSeries = useMemo(() => {
    const source =
      selectedCategoryFilter != null
        ? periodTransactionsCache.filter((t) => t.category_id === selectedCategoryFilter)
        : periodTransactionsCache

    return buildCompetenciaExpenseSeriesFromTransactions(source)
  }, [periodTransactionsCache, selectedCategoryFilter])

  const handleCategoryClick = (categoryId: string | null) => {
    setCategoryFilter(categoryId)
  }

  const handleCategoryToggle = (categoryId?: string) => {
    if (!categoryId) return
    setCategoryFilter(selectedCategoryFilter === categoryId ? null : categoryId)
  }

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

  return (
    <div className="space-y-6">
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

      <DashboardFilters
        filters={filters}
        onFiltersChange={setFilters}
        transactionCount={totalTransactions}
      />

      {comparisonData && filters.compareMode && (
        <ComparisonChart comparisonData={comparisonData} filters={filters} />
      )}

      {/* Saúde Financeira — KPIs por competência (mes_referencia) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Receitas */}
        <Card className="relative overflow-hidden transition-all duration-300 border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-lg shadow-primary/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receitas</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
              <ArrowUpCircle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold mb-1 text-green-600">{formatCurrency(total_incomes)}</div>
            <p className="text-xs text-muted-foreground">{periodLabel}</p>
          </CardContent>
        </Card>

        {/* Total Gasto */}
        <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Gasto</CardTitle>
            <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
              <ArrowDownCircle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1 text-destructive">{formatCurrency(total_expenses)}</div>
            <p className="text-xs text-muted-foreground">{periodLabel}</p>
          </CardContent>
        </Card>

        {/* Saldo Disponível */}
        <Card className="relative overflow-hidden transition-all duration-300 border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-lg shadow-primary/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Disponível</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div
              className={cn(
                'text-3xl font-bold mb-1',
                availableBalance >= 0 ? 'text-green-600' : 'text-destructive'
              )}
            >
              {formatCurrency(availableBalance)}
            </div>
            <p className="text-xs text-muted-foreground">Receitas − despesas do período</p>
          </CardContent>
        </Card>

        {/* Orçamento Usado */}
        <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Orçamento Usado</CardTitle>
            <div className="p-2 rounded-lg bg-warning/10 text-warning">
              <Target className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className={cn(
                'text-3xl font-bold',
                budgetUsedPercentage > 80
                  ? 'text-destructive'
                  : budgetUsedPercentage > 50
                    ? 'text-yellow-600'
                    : 'text-green-600'
              )}
            >
              {budgetUsedPercentage.toFixed(1)}%
            </div>
            <Progress
              value={Math.min(budgetUsedPercentage, 100)}
              className={cn('h-2', getBudgetProgressColor(budgetUsedPercentage))}
            />
            <p className="text-xs text-muted-foreground">
              {budgetUsedPercentage > 0
                ? `${formatCurrency(total_expenses)} consumidos do orçamento mensal`
                : 'Nenhum orçamento cadastrado para o período'}
            </p>
          </CardContent>
        </Card>

        {/* Capacidade de Poupança Real */}
        <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Capacidade de Poupança Real
            </CardTitle>
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <PiggyBank className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3">
              <span className={cn('text-3xl font-bold', savingsHealth.valueClass)}>
                {savings_rate.toFixed(1)}%
              </span>
              <Badge variant="outline" className={savingsHealth.badgeClass}>
                {savingsHealth.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Percentual da receita poupada no período
            </p>
          </CardContent>
        </Card>

        {/* Piso de Gastos Comprometidos */}
        <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Piso de Gastos Comprometidos
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
              <Lock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1 text-purple-600">
              {formatCurrency(committed_future_expenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              Gastos fixos e parcelas agendadas para este período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas complementares */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Média Diária</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(kpis.dailyAverage)}</div>
              <p className="text-xs text-muted-foreground">Gasto médio por dia</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Projeção do Mês</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(kpis.monthlyProjection)}</div>
              <p className="text-xs text-muted-foreground">Baseado na média atual</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Dias de Reserva</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.daysOfReserve} dias</div>
              <p className="text-xs text-muted-foreground">Com o saldo atual</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Evolução dos Gastos</CardTitle>
                <CardDescription className="mt-1">
                  Gastos por competência {getPeriodDescription(filters).toLowerCase()}
                  {selectedCategoryFilter && ' (categoria filtrada)'}
                </CardDescription>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {competenciaTimeSeries.length > 0 ? (
              <TimeSeriesChart data={competenciaTimeSeries} axisMode="competencia" />
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mb-3 opacity-50" />
                <p>Nenhum dado de gastos disponível</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Distribuição por Categoria</CardTitle>
                <CardDescription className="mt-1">
                  Gastos por categoria {getPeriodDescription(filters).toLowerCase()}
                  {selectedCategoryFilter && ' — clique em uma categoria para filtrar'}
                </CardDescription>
              </div>
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <>
                <PieChartComponent
                  data={categoryData}
                  activeCategoryId={selectedCategoryFilter}
                  onCategoryClick={handleCategoryClick}
                />
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/50">
                  {categoryData.map((cat) => (
                    <Badge
                      key={cat.categoryId ?? cat.name}
                      variant={selectedCategoryFilter === cat.categoryId ? 'default' : 'outline'}
                      className="cursor-pointer transition-colors"
                      onClick={() => handleCategoryToggle(cat.categoryId)}
                    >
                      {cat.name}
                    </Badge>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                <Target className="h-12 w-12 mb-3 opacity-50" />
                <p>Nenhum dado de categoria disponível</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Top Categorias</CardTitle>
                <CardDescription className="mt-1">Categorias com maiores gastos</CardDescription>
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

        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Top 5 Transações</CardTitle>
                <CardDescription className="mt-1">Maiores gastos do período</CardDescription>
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
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm',
                          index === 0
                            ? 'bg-gradient-to-br from-warning to-warning/80 text-warning-foreground'
                            : index === 1
                              ? 'bg-gradient-to-br from-muted to-muted/80 text-foreground'
                              : index === 2
                                ? 'bg-gradient-to-br from-muted/80 to-muted/60 text-foreground'
                                : 'bg-muted/60 text-muted-foreground'
                        )}
                      >
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.category?.name || 'Sem categoria'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive">{formatCurrency(transaction.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.transaction_date).toLocaleDateString('pt-BR')}
                      </p>
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

      <InsightsCard />

      <Card className="border-border/50 shadow-md">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Transações Recentes</CardTitle>
              <CardDescription className="mt-1">
                Últimas transações do período filtrado
              </CardDescription>
            </div>
            {selectedCategoryFilter && (
              <Button
                variant="outline"
                size="sm"
                className="border-primary/30 text-primary hover:bg-primary/5 shrink-0"
                onClick={() => setCategoryFilter(null)}
              >
                <X className="mr-2 h-3.5 w-3.5" />
                Filtrando por {selectedCategoryName} (Limpar Filtro)
              </Button>
            )}
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
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        transaction.type === 'expense' ? 'bg-destructive' : 'bg-green-500'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{transaction.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{transaction.category?.name || 'Sem categoria'}</span>
                        {transaction.card && (
                          <>
                            <span>•</span>
                            <span>{(transaction.card as { name?: string }).name ?? 'Cartão'}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p
                      className={cn(
                        'font-bold',
                        transaction.type === 'expense' ? 'text-destructive' : 'text-green-600'
                      )}
                    >
                      {transaction.type === 'expense' ? '-' : '+'}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.transaction_date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
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
                {selectedCategoryFilter
                  ? `Nenhuma transação encontrada na categoria "${selectedCategoryName}".`
                  : 'Nenhuma transação encontrada no período filtrado.'}
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
