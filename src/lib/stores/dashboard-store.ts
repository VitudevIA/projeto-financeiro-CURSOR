import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { AppUser } from '@/types/user_types'
import type { DashboardFilters } from '@/components/dashboard/dashboard-filters'
import { mesReferenciaRangeFromDates } from '@/utils/mes-referencia'

interface DashboardTransaction {
  id: string
  amount: number
  type: 'income' | 'expense' | string
  description: string
  transaction_date: string
  mes_referencia: string
  category_id: string
  category?: { id?: string; name?: string } | null
  card?: { id: string; closing_day?: number; due_day?: number; type?: string } | null
  expense_nature?: string | null
  installment_number?: number | null
  total_installments?: number | null
  is_recurring?: boolean | null
  recurring_type?: string | null
  payment_method?: string | null
  card_id?: string | null
  [key: string]: unknown
}

interface DashboardKPIs {
  totalSpent: number
  total_incomes: number
  total_expenses: number
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
  categoryId?: string
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
  topTransactions: DashboardTransaction[]
  recentTransactions: DashboardTransaction[]
  periodTransactionsCache: DashboardTransaction[]
  totalTransactions: number
  total_incomes: number
  total_expenses: number
  savings_rate: number
  committed_future_expenses: number
  selectedCategoryFilter: string | null
  comparisonData: ComparisonData | null
  loading: boolean
  error: string | null
  fetchDashboardData: (user: AppUser | null, filters?: DashboardFilters) => Promise<void>
  setCategoryFilter: (categoryId: string | null) => void
  clearError: () => void
}

const CATEGORY_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
]

const getCategoryColor = (index: number): string => {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length]
}

const ensureNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function monthDateFromMesReferencia(mesReferencia: string): string {
  return `${mesReferencia}-01`
}

function getNextMonthDate(monthStart: string): string {
  const [year, month] = monthStart.split('-').map(Number)
  const next = new Date(year, month, 1)
  return next.toISOString().split('T')[0]
}

function applyMesReferenciaFilter<T extends { eq: (col: string, val: string) => T; gte: (col: string, val: string) => T; lte: (col: string, val: string) => T }>(
  query: T,
  minMesRef: string,
  maxMesRef: string
): T {
  if (minMesRef === maxMesRef) {
    return query.eq('mes_referencia', minMesRef)
  }
  return query.gte('mes_referencia', minMesRef).lte('mes_referencia', maxMesRef)
}

function isCommittedExpense(transaction: DashboardTransaction): boolean {
  const totalInstallments = transaction.total_installments
  const installmentNumber = transaction.installment_number

  if (totalInstallments != null && totalInstallments > 1) {
    if (installmentNumber == null || installmentNumber <= totalInstallments) {
      return true
    }
  }

  if (transaction.expense_nature === 'fixed' || transaction.expense_nature === 'installment') {
    return true
  }

  if (transaction.is_recurring === true) {
    return true
  }

  if (transaction.recurring_type) {
    return true
  }

  return false
}

function calculateSavingsRate(totalIncomes: number, totalExpenses: number): number {
  if (totalIncomes <= 0) {
    return 0
  }
  return Number((((totalIncomes - totalExpenses) / totalIncomes) * 100).toFixed(2))
}

function normalizeTransactionAmounts(transactions: DashboardTransaction[]): DashboardTransaction[] {
  return transactions.map((transaction) => {
    const amount = ensureNumber(transaction.amount)
    return {
      ...transaction,
      amount: Number(amount.toFixed(2)),
    }
  })
}

function buildTopTransactions(transactions: DashboardTransaction[]): DashboardTransaction[] {
  return normalizeTransactionAmounts(
    transactions
      .filter((t) => {
        const amount = ensureNumber(t.amount)
        return amount && Math.abs(amount) > 0
      })
      .sort((a, b) => Math.abs(ensureNumber(b.amount)) - Math.abs(ensureNumber(a.amount)))
      .slice(0, 5)
  )
}

function buildRecentTransactions(transactions: DashboardTransaction[]): DashboardTransaction[] {
  return normalizeTransactionAmounts(
    transactions
      .filter((t) => {
        const amount = ensureNumber(t.amount)
        return amount && Math.abs(amount) > 0
      })
      .sort(
        (a, b) =>
          new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      )
      .slice(0, 10)
  )
}

function filterTransactionsByCategory(
  transactions: DashboardTransaction[],
  categoryId: string | null
): DashboardTransaction[] {
  if (!categoryId) {
    return transactions
  }
  return transactions.filter((t) => t.category_id === categoryId)
}

function aggregateDashboardFromTransactions(
  transactions: DashboardTransaction[],
  start: string,
  end: string
) {
  let total_incomes = 0
  let total_expenses = 0

  transactions.forEach((transaction) => {
    const amount = ensureNumber(transaction.amount)
    if (transaction.type === 'income') {
      total_incomes += amount
    } else if (transaction.type === 'expense') {
      total_expenses += amount
    }
  })

  const totalSpent = total_expenses

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
  const availableBalance = total_incomes - total_expenses
  const daysOfReserve = dailyAverage > 0 ? Math.floor(availableBalance / dailyAverage) : 0

  const timeSeriesMap = new Map<string, number>()
  const currentDate = new Date(startDateObj)
  while (currentDate <= endDateObj) {
    const dateStr = currentDate.toISOString().split('T')[0]
    timeSeriesMap.set(dateStr, 0)
    currentDate.setDate(currentDate.getDate() + 1)
  }

  transactions.forEach((transaction) => {
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

  const categoryMap = new Map<string, { value: number; categoryId?: string }>()
  transactions.forEach((transaction) => {
    if (transaction.type === 'expense') {
      const amount = ensureNumber(transaction.amount)
      const categoryName = transaction.category?.name || 'Sem Categoria'
      const current = categoryMap.get(categoryName) || { value: 0, categoryId: transaction.category_id }
      categoryMap.set(categoryName, {
        value: current.value + amount,
        categoryId: current.categoryId ?? transaction.category_id,
      })
    }
  })

  const categoryData: ChartData[] = Array.from(categoryMap.entries())
    .map(([name, { value, categoryId }], index) => ({
      name,
      value: Number(value.toFixed(2)),
      color: getCategoryColor(index),
      categoryId,
    }))
    .sort((a, b) => b.value - a.value)

  return {
    total_incomes,
    total_expenses,
    totalSpent,
    dailyAverage,
    monthlyProjection,
    availableBalance,
    daysOfReserve,
    timeSeriesData,
    categoryData,
  }
}

async function fetchCommittedFutureExpenses(
  userId: string,
  targetMesReferencia: string,
  categoryId?: string | null,
  cardId?: string | null
): Promise<number> {
  const supabase = createClient()

  let query = supabase
    .from('transactions')
    .select('amount, total_installments, installment_number, expense_nature, is_recurring, recurring_type')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('mes_referencia', targetMesReferencia)
    .or(
      'total_installments.gt.1,expense_nature.eq.fixed,expense_nature.eq.installment,is_recurring.eq.true,recurring_type.not.is.null'
    )

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  if (cardId) {
    query = query.eq('card_id', cardId)
  }

  const { data, error } = await query

  if (error) {
    console.warn('Erro ao buscar gastos comprometidos:', error)
    return 0
  }

  return (data ?? [])
    .filter((row) => isCommittedExpense(row as DashboardTransaction))
    .reduce((sum, row) => sum + ensureNumber(row.amount), 0)
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  kpis: null,
  timeSeriesData: [],
  categoryData: [],
  topTransactions: [],
  recentTransactions: [],
  periodTransactionsCache: [],
  totalTransactions: 0,
  total_incomes: 0,
  total_expenses: 0,
  savings_rate: 0,
  committed_future_expenses: 0,
  selectedCategoryFilter: null,
  comparisonData: null,
  loading: false,
  error: null,

  setCategoryFilter: (categoryId) => {
    const { periodTransactionsCache } = get()
    const filtered = filterTransactionsByCategory(periodTransactionsCache, categoryId)

    set({
      selectedCategoryFilter: categoryId,
      recentTransactions: buildRecentTransactions(filtered),
    })
  },

  fetchDashboardData: async (user, filters) => {
    try {
      set({ loading: true, error: null, selectedCategoryFilter: null })

      if (!user) {
        console.log('❌ Dashboard: Nenhum usuário logado')
        set({ loading: false })
        return
      }

      console.log('📊 Dashboard: Buscando dados para usuário:', user.id)

      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const start = filters?.startDate || currentMonthStart.toISOString().split('T')[0]
      const end = filters?.endDate || currentMonthEnd.toISOString().split('T')[0]
      const categoryId = filters?.categoryId
      const cardId = filters?.cardId
      const compareMode = filters?.compareMode || false

      const { min: minMesRef, max: maxMesRef } = mesReferenciaRangeFromDates(start, end)
      const targetMesReferencia = maxMesRef

      console.log(`📅 Competência: ${minMesRef}${minMesRef !== maxMesRef ? ` até ${maxMesRef}` : ''}`)
      if (categoryId) console.log(`🏷️ Categoria filtrada: ${categoryId}`)
      if (cardId) console.log(`💳 Cartão filtrado: ${cardId}`)
      if (compareMode) console.log(`📊 Modo comparação ativado`)

      const supabase = createClient()

      let query = supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*),
          card:cards(id, closing_day, due_day, type)
        `)
        .eq('user_id', user.id)

      query = applyMesReferenciaFilter(query, minMesRef, maxMesRef)

      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }

      if (cardId) {
        query = query.eq('card_id', cardId)
      }

      const transactionsPromise = query.order('transaction_date', { ascending: true })
      const committedPromise = fetchCommittedFutureExpenses(
        user.id,
        targetMesReferencia,
        categoryId,
        cardId
      )

      const [transactionsResult, committed_future_expenses] = await Promise.all([
        transactionsPromise,
        committedPromise,
      ])

      const { data: transactions, error: transactionsError } = transactionsResult

      console.log(
        `📊 Dashboard: ${transactions?.length || 0} transações encontradas na competência ${minMesRef}${minMesRef !== maxMesRef ? `–${maxMesRef}` : ''}`
      )

      if (transactionsError) {
        console.error('Erro ao buscar transações:', transactionsError)
        set({
          loading: false,
          error: `Erro ao carregar transações: ${transactionsError.message}`,
        })
        return
      }

      const periodTransactions = (transactions ?? []) as DashboardTransaction[]

      const monthStart = monthDateFromMesReferencia(minMesRef)
      const monthEnd = getNextMonthDate(monthDateFromMesReferencia(maxMesRef))

      const { data: budgets, error: budgetsError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .gte('month', monthStart)
        .lt('month', monthEnd)

      if (budgetsError) {
        console.warn('Erro ao buscar orçamentos:', budgetsError)
      }

      const aggregated = aggregateDashboardFromTransactions(periodTransactions, start, end)
      const {
        total_incomes,
        total_expenses,
        totalSpent,
        dailyAverage,
        monthlyProjection,
        availableBalance,
        daysOfReserve,
        timeSeriesData,
        categoryData,
      } = aggregated

      const savings_rate = calculateSavingsRate(total_incomes, total_expenses)

      const totalBudget =
        budgets?.reduce((sum: number, b: { limit_amount?: number; amount?: number }) => {
          return sum + ensureNumber(b.limit_amount ?? b.amount)
        }, 0) || 0
      const budgetUsedPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

      const kpis: DashboardKPIs = {
        totalSpent,
        total_incomes: Number(total_incomes.toFixed(2)),
        total_expenses: Number(total_expenses.toFixed(2)),
        dailyAverage: Number(dailyAverage.toFixed(2)),
        monthlyProjection: Number(monthlyProjection.toFixed(2)),
        budgetUsedPercentage: Number(budgetUsedPercentage.toFixed(1)),
        availableBalance: Number(availableBalance.toFixed(2)),
        daysOfReserve,
      }

      const topTransactions = buildTopTransactions(periodTransactions)
      const recentTransactions = buildRecentTransactions(periodTransactions)

      let comparisonData: ComparisonData | null = null

      if (compareMode && filters?.compareStartDate && filters?.compareEndDate) {
        console.log(
          `📊 Buscando dados de comparação: ${filters.compareStartDate} até ${filters.compareEndDate}`
        )

        const compareMes = mesReferenciaRangeFromDates(
          filters.compareStartDate,
          filters.compareEndDate
        )

        let compareQuery = supabase
          .from('transactions')
          .select(`
            *,
            category:categories(*),
            card:cards(id, closing_day, due_day, type)
          `)
          .eq('user_id', user.id)

        compareQuery = applyMesReferenciaFilter(compareQuery, compareMes.min, compareMes.max)

        if (categoryId) {
          compareQuery = compareQuery.eq('category_id', categoryId)
        }

        if (cardId) {
          compareQuery = compareQuery.eq('card_id', cardId)
        }

        const { data: compareTransactions, error: compareError } = await compareQuery.order(
          'transaction_date',
          { ascending: true }
        )

        if (!compareError && compareTransactions) {
          const comparePeriodTransactions = compareTransactions as DashboardTransaction[]

          const compareAggregated = aggregateDashboardFromTransactions(
            comparePeriodTransactions,
            filters.compareStartDate,
            filters.compareEndDate
          )

          const compareKpis: DashboardKPIs = {
            totalSpent: compareAggregated.totalSpent,
            total_incomes: Number(compareAggregated.total_incomes.toFixed(2)),
            total_expenses: Number(compareAggregated.total_expenses.toFixed(2)),
            dailyAverage: Number(compareAggregated.dailyAverage.toFixed(2)),
            monthlyProjection: Number(compareAggregated.monthlyProjection.toFixed(2)),
            budgetUsedPercentage: 0,
            availableBalance: Number(compareAggregated.availableBalance.toFixed(2)),
            daysOfReserve: compareAggregated.daysOfReserve,
          }

          comparisonData = {
            currentPeriod: {
              kpis,
              timeSeriesData,
              categoryData,
            },
            comparePeriod: {
              kpis: compareKpis,
              timeSeriesData: compareAggregated.timeSeriesData,
              categoryData: compareAggregated.categoryData,
            },
          }
        }
      }

      console.log('✅ Dashboard: Dados carregados com sucesso')
      console.log(
        `📈 KPIs: ${periodTransactions.length} transações na competência | Taxa de poupança: ${savings_rate}% | Comprometido: R$ ${committed_future_expenses.toFixed(2)}`
      )
      console.log(
        `💰 Receitas: R$ ${total_incomes.toFixed(2)} | Despesas: R$ ${total_expenses.toFixed(2)} | Saldo: R$ ${availableBalance.toFixed(2)}`
      )

      set({
        kpis,
        timeSeriesData,
        categoryData,
        topTransactions,
        recentTransactions,
        periodTransactionsCache: periodTransactions,
        totalTransactions: periodTransactions.length,
        total_incomes: Number(total_incomes.toFixed(2)),
        total_expenses: Number(total_expenses.toFixed(2)),
        savings_rate,
        committed_future_expenses: Number(committed_future_expenses.toFixed(2)),
        comparisonData,
        loading: false,
        error: null,
      })
    } catch (error) {
      console.error('Erro inesperado ao buscar dados do dashboard:', error)
      set({
        loading: false,
        error: 'Erro inesperado ao carregar dados do dashboard',
      })
    }
  },

  clearError: () => set({ error: null }),
}))
