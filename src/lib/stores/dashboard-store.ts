import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { AppUser } from '@/types/user_types'
import type { DashboardFilters } from '@/components/dashboard/dashboard-filters'
import type { CardBillingInfo } from '@/utils/mes-referencia'
import {
  expandedTransactionDateRangeForMesReferencias,
  isTransactionInMesReferenciaRange,
  mesReferenciaRangeFromDates,
} from '@/utils/mes-referencia'

// Defina os tipos localmente
interface DashboardKPIs {
  totalSpent: number
  dailyAverage: number
  monthlyProjection: number
  budgetUsedPercentage: number
  availableBalance: number
  daysOfReserve: number
}

interface TimeSeriesData {
  date: string
  amount: number
  label: string
}

interface ChartData {
  name: string
  value: number
  color: string
}

interface ComparisonData {
  currentPeriod: {
    kpis: DashboardKPIs
    timeSeriesData: TimeSeriesData[]
    categoryData: ChartData[]
  }
  comparePeriod: {
    kpis: DashboardKPIs
    timeSeriesData: TimeSeriesData[]
    categoryData: ChartData[]
  }
}

interface DashboardState {
  kpis: DashboardKPIs | null
  timeSeriesData: TimeSeriesData[]
  categoryData: ChartData[]
  topTransactions: any[]
  recentTransactions: any[]
  totalTransactions: number
  comparisonData: ComparisonData | null
  loading: boolean
  error: string | null
  fetchDashboardData: (user: AppUser | null, filters?: DashboardFilters) => Promise<void>
  clearError: () => void
}

// Cores consistentes para categorias
const CATEGORY_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
]

const getCategoryColor = (index: number): string => {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length]
}

// Função auxiliar para garantir que amount seja sempre um número
const ensureNumber = (value: any): number => {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function buildCardBillingMap(
  cards: Array<{ id: string; closing_day: number; type?: string }>
): Map<string, CardBillingInfo> {
  const map = new Map<string, CardBillingInfo>()
  cards.forEach((card) => {
    map.set(card.id, { closing_day: card.closing_day, type: card.type })
  })
  return map
}

function filterByCompetencia(
  transactions: any[] | null,
  minMesRef: string,
  maxMesRef: string,
  cardMap: Map<string, CardBillingInfo>
): any[] {
  return (transactions || []).filter((t) =>
    isTransactionInMesReferenciaRange(t, minMesRef, maxMesRef, cardMap)
  )
}

function aggregateDashboardFromTransactions(
  transactions: any[],
  start: string,
  end: string
) {
  let totalIncome = 0
  let totalSpent = 0

  transactions.forEach((transaction: any) => {
    const amount = ensureNumber(transaction.amount)
    if (transaction.type === 'income') {
      totalIncome += amount
    } else if (transaction.type === 'expense') {
      totalSpent += amount
    }
  })

  const now = new Date()
  const startDateObj = new Date(start)
  const endDateObj = new Date(end)
  const daysInMonth =
    Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const daysPassed = Math.min(
    Math.ceil((now.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    daysInMonth
  )

  const dailyAverage = daysPassed > 0 ? totalSpent / daysPassed : 0
  const monthlyProjection = dailyAverage * daysInMonth
  const availableBalance = totalIncome - totalSpent
  const daysOfReserve = dailyAverage > 0 ? Math.floor(availableBalance / dailyAverage) : 0

  const timeSeriesMap = new Map<string, number>()
  const currentDate = new Date(startDateObj)
  while (currentDate <= endDateObj) {
    const dateStr = currentDate.toISOString().split('T')[0]
    timeSeriesMap.set(dateStr, 0)
    currentDate.setDate(currentDate.getDate() + 1)
  }

  transactions.forEach((transaction: any) => {
    if (transaction.type === 'expense') {
      const amount = ensureNumber(transaction.amount)
      const date = transaction.transaction_date
      if (date) {
        const current = timeSeriesMap.get(date) || 0
        timeSeriesMap.set(date, current + amount)
      }
    }
  })

  const timeSeriesData: TimeSeriesData[] = Array.from(timeSeriesMap.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, amount]) => ({
      date,
      amount: Number(amount.toFixed(2)),
      label: new Date(date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      }),
    }))

  const categoryMap = new Map<string, number>()
  transactions.forEach((transaction: any) => {
    if (transaction.type === 'expense') {
      const amount = ensureNumber(transaction.amount)
      const categoryName = transaction.category?.name || 'Sem Categoria'
      const current = categoryMap.get(categoryName) || 0
      categoryMap.set(categoryName, current + amount)
    }
  })

  const categoryData: ChartData[] = Array.from(categoryMap.entries())
    .map(([name, value], index) => ({
      name,
      value: Number(value.toFixed(2)),
      color: getCategoryColor(index),
    }))
    .sort((a, b) => b.value - a.value)

  return {
    totalIncome,
    totalSpent,
    dailyAverage,
    monthlyProjection,
    availableBalance,
    daysOfReserve,
    timeSeriesData,
    categoryData,
  }
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  kpis: null,
  timeSeriesData: [],
  categoryData: [],
  topTransactions: [],
  recentTransactions: [],
  totalTransactions: 0,
  comparisonData: null,
  loading: false,
  error: null,

  fetchDashboardData: async (user, filters) => {
    try {
      set({ loading: true, error: null })

      if (!user) {
        console.log('❌ Dashboard: Nenhum usuário logado')
        set({ loading: false })
        return
      }

      console.log('📊 Dashboard: Buscando dados para usuário:', user.id)

      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      
      // Usa os filtros fornecidos ou valores padrão
      const start = filters?.startDate || currentMonthStart.toISOString().split('T')[0]
      const end = filters?.endDate || currentMonthEnd.toISOString().split('T')[0]
      const categoryId = filters?.categoryId
      const cardId = filters?.cardId
      const compareMode = filters?.compareMode || false

      const { min: minMesRef, max: maxMesRef } = mesReferenciaRangeFromDates(start, end)
      const { start: fetchStart, end: fetchEnd } =
        expandedTransactionDateRangeForMesReferencias(minMesRef, maxMesRef)
      console.log(`📅 Período (competência): ${minMesRef} até ${maxMesRef}`)
      if (categoryId) console.log(`🏷️ Categoria filtrada: ${categoryId}`)
      if (cardId) console.log(`💳 Cartão filtrado: ${cardId}`)
      if (compareMode) console.log(`📊 Modo comparação ativado`)

      const supabase = createClient()

      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select('id, closing_day, due_day, type')
        .eq('user_id', user.id)

      if (cardsError) {
        console.warn('Erro ao buscar cartões para competência:', cardsError)
      }

      const cardMap = buildCardBillingMap(
        (cardsData || []).map((c) => ({
          id: c.id,
          closing_day: Number(c.closing_day ?? 25),
          type: c.type ?? undefined,
        }))
      )

      let query = supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*),
          card:cards(id, closing_day, due_day, type)
        `)
        .eq('user_id', user.id)
        .gte('transaction_date', fetchStart)
        .lte('transaction_date', fetchEnd)
      
      // Aplica filtros adicionais
      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }
      
      if (cardId) {
        query = query.eq('card_id', cardId)
      }
      
      const { data: transactions, error: transactionsError } = await query
        .order('transaction_date', { ascending: true })
      
      console.log(`📊 Dashboard: ${transactions?.length || 0} transações encontradas no período ${start} até ${end}`)
      if (transactions && transactions.length > 0) {
        console.log(`📊 Dashboard: Primeira transação:`, {
          id: transactions[0].id,
          description: transactions[0].description,
          amount: transactions[0].amount,
          type: transactions[0].type,
          date: transactions[0].transaction_date,
          category: transactions[0].category?.name || 'Sem categoria'
        })
      }

      if (transactionsError) {
        console.error('Erro ao buscar transações:', transactionsError)
        set({ 
          loading: false, 
          error: `Erro ao carregar transações: ${transactionsError.message}` 
        })
        return
      }

      const periodTransactions = filterByCompetencia(
        transactions,
        minMesRef,
        maxMesRef,
        cardMap
      )

      console.log(
        `📊 Dashboard: ${periodTransactions.length} transações na competência ${minMesRef}–${maxMesRef} (de ${transactions?.length || 0} no intervalo de datas)`
      )

      // Buscar orçamentos do usuário para cálculo mais preciso
      const { data: budgets, error: budgetsError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .lte('start_date', end)
        .gte('end_date', start)

      if (budgetsError) {
        console.warn('Erro ao buscar orçamentos:', budgetsError)
        // Continua sem orçamentos
      }

      const aggregated = aggregateDashboardFromTransactions(periodTransactions, start, end)
      const {
        totalIncome,
        totalSpent,
        dailyAverage,
        monthlyProjection,
        availableBalance,
        daysOfReserve,
        timeSeriesData,
        categoryData,
      } = aggregated

      const totalBudget = budgets?.reduce((sum: number, b: any) => sum + b.amount, 0) || 0
      const budgetUsedPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

      const kpis: DashboardKPIs = {
        totalSpent,
        dailyAverage: Number(dailyAverage.toFixed(2)),
        monthlyProjection: Number(monthlyProjection.toFixed(2)),
        budgetUsedPercentage: Number(budgetUsedPercentage.toFixed(1)),
        availableBalance: Number(availableBalance.toFixed(2)),
        daysOfReserve,
      }

      const topTransactions = periodTransactions
        ?.filter((t: any) => {
          const amount = ensureNumber(t.amount)
          return amount && Math.abs(amount) > 0
        })
        .sort((a: any, b: any) => {
          const amountA = ensureNumber(a.amount)
          const amountB = ensureNumber(b.amount)
          return Math.abs(amountB) - Math.abs(amountA)
        })
        .slice(0, 5)
        .map((transaction: any) => {
          const amount = ensureNumber(transaction.amount)
          return {
            ...transaction,
            amount: Number(amount.toFixed(2))
          }
        }) || []

      // Pegar transações recentes (últimas 10, ordenadas por data decrescente)
      const recentTransactions = periodTransactions
        ?.filter((t: any) => {
          const amount = ensureNumber(t.amount)
          return amount && Math.abs(amount) > 0
        })
        .sort((a: any, b: any) => {
          const dateA = new Date(a.transaction_date).getTime()
          const dateB = new Date(b.transaction_date).getTime()
          return dateB - dateA // Mais recentes primeiro
        })
        .slice(0, 10)
        .map((transaction: any) => {
          const amount = ensureNumber(transaction.amount)
          return {
            ...transaction,
            amount: Number(amount.toFixed(2))
          }
        }) || []

      // Se estiver em modo de comparação, busca dados do período comparado
      let comparisonData: ComparisonData | null = null
      
      if (compareMode && filters?.compareStartDate && filters?.compareEndDate) {
        console.log(`📊 Buscando dados de comparação: ${filters.compareStartDate} até ${filters.compareEndDate}`)
        
        const compareMes = mesReferenciaRangeFromDates(
          filters.compareStartDate,
          filters.compareEndDate
        )
        const compareDateRange = expandedTransactionDateRangeForMesReferencias(
          compareMes.min,
          compareMes.max
        )
        let compareQuery = supabase
          .from('transactions')
          .select(`
            *,
            category:categories(*),
            card:cards(id, closing_day, due_day, type)
          `)
          .eq('user_id', user.id)
          .gte('transaction_date', compareDateRange.start)
          .lte('transaction_date', compareDateRange.end)
        
        if (categoryId) {
          compareQuery = compareQuery.eq('category_id', categoryId)
        }
        
        if (cardId) {
          compareQuery = compareQuery.eq('card_id', cardId)
        }
        
        const { data: compareTransactions, error: compareError } = await compareQuery
          .order('transaction_date', { ascending: true })
        
        if (!compareError && compareTransactions) {
          const comparePeriodTransactions = filterByCompetencia(
            compareTransactions,
            compareMes.min,
            compareMes.max,
            cardMap
          )

          const compareAggregated = aggregateDashboardFromTransactions(
            comparePeriodTransactions,
            filters.compareStartDate,
            filters.compareEndDate
          )

          const compareKpis: DashboardKPIs = {
            totalSpent: compareAggregated.totalSpent,
            dailyAverage: Number(compareAggregated.dailyAverage.toFixed(2)),
            monthlyProjection: Number(compareAggregated.monthlyProjection.toFixed(2)),
            budgetUsedPercentage: 0,
            availableBalance: Number(compareAggregated.availableBalance.toFixed(2)),
            daysOfReserve: compareAggregated.daysOfReserve,
          }

          const compareTimeSeriesData = compareAggregated.timeSeriesData
          const compareCategoryData = compareAggregated.categoryData
          
          comparisonData = {
            currentPeriod: {
              kpis,
              timeSeriesData,
              categoryData,
            },
            comparePeriod: {
              kpis: compareKpis,
              timeSeriesData: compareTimeSeriesData,
              categoryData: compareCategoryData,
            },
          }
        }
      }

      console.log('✅ Dashboard: Dados carregados com sucesso')
      console.log(`📈 KPIs: ${periodTransactions.length} transações na competência`)
      console.log(`💰 Receitas: R$ ${totalIncome.toFixed(2)} | Despesas: R$ ${totalSpent.toFixed(2)} | Saldo: R$ ${availableBalance.toFixed(2)}`)

      set({
        kpis,
        timeSeriesData,
        categoryData,
        topTransactions,
        recentTransactions,
        totalTransactions: periodTransactions.length,
        comparisonData,
        loading: false,
        error: null
      })
    } catch (error) {
      console.error('Erro inesperado ao buscar dados do dashboard:', error)
      set({ 
        loading: false, 
        error: 'Erro inesperado ao carregar dados do dashboard' 
      })
    }
  },

  clearError: () => set({ error: null })
}))