import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { AppUser } from '@/types/user_types'
import type { DashboardFilters } from '@/components/dashboard/dashboard-filters'

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

      console.log(`📅 Período: ${start} até ${end}`)
      if (categoryId) console.log(`🏷️ Categoria filtrada: ${categoryId}`)
      if (cardId) console.log(`💳 Cartão filtrado: ${cardId}`)
      if (compareMode) console.log(`📊 Modo comparação ativado`)

      // Fetch transactions para o período
      const supabase = createClient()
      let query = supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*),
          card:cards(*)
        `)
        .eq('user_id', user.id)
        .gte('transaction_date', start)
        .lte('transaction_date', end)
      
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

      // Calcular KPIs diferenciando receitas e despesas
      let totalIncome = 0
      let totalSpent = 0
      
      transactions?.forEach((transaction: any) => {
        const amount = ensureNumber(transaction.amount)
        
        if (transaction.type === 'income') {
          totalIncome += amount
        } else if (transaction.type === 'expense') {
          totalSpent += amount
        }
      })
      
      // Saldo disponível = Receitas - Despesas (calculado a partir das transações)
      const availableBalance = totalIncome - totalSpent
      
      const startDateObj = new Date(start)
      const endDateObj = new Date(end)
      const daysInMonth = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const daysPassed = Math.min(
        Math.ceil((now.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1,
        daysInMonth
      )
      
      const dailyAverage = daysPassed > 0 ? totalSpent / daysPassed : 0
      const monthlyProjection = dailyAverage * daysInMonth

      // Calcular uso do orçamento
      const totalBudget = budgets?.reduce((sum: number, b: any) => sum + b.amount, 0) || 0
      const budgetUsedPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

      // Calcular dias de reserva (baseado no saldo disponível vs média diária de despesas)
      const daysOfReserve = dailyAverage > 0 ? Math.floor(availableBalance / dailyAverage) : 0

      const kpis: DashboardKPIs = {
        totalSpent,
        dailyAverage: Number(dailyAverage.toFixed(2)),
        monthlyProjection: Number(monthlyProjection.toFixed(2)),
        budgetUsedPercentage: Number(budgetUsedPercentage.toFixed(1)),
        availableBalance: Number(availableBalance.toFixed(2)),
        daysOfReserve,
      }

      // Gerar dados de série temporal
      const timeSeriesMap = new Map<string, number>()
      
      // Preencher todos os dias do período para evitar gaps no gráfico
      const currentDate = new Date(startDateObj)
      while (currentDate <= endDateObj) {
        const dateStr = currentDate.toISOString().split('T')[0]
        timeSeriesMap.set(dateStr, 0)
        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Adicionar valores reais das transações (apenas despesas para o gráfico de gastos)
      transactions?.forEach((transaction: any) => {
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
          label: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        }))

      // Gerar dados de categoria (apenas despesas)
      const categoryMap = new Map<string, number>()
      transactions?.forEach((transaction: any) => {
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
          color: getCategoryColor(index)
        }))
        .sort((a, b) => b.value - a.value) // Ordenar por valor decrescente

      // Pegar top 5 transações (ordenado por valor absoluto)
      const topTransactions = transactions
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
      const recentTransactions = transactions
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
        
        let compareQuery = supabase
          .from('transactions')
          .select(`
            *,
            category:categories(*),
            card:cards(*)
          `)
          .eq('user_id', user.id)
          .gte('transaction_date', filters.compareStartDate)
          .lte('transaction_date', filters.compareEndDate)
        
        if (categoryId) {
          compareQuery = compareQuery.eq('category_id', categoryId)
        }
        
        if (cardId) {
          compareQuery = compareQuery.eq('card_id', cardId)
        }
        
        const { data: compareTransactions, error: compareError } = await compareQuery
          .order('transaction_date', { ascending: true })
        
        if (!compareError && compareTransactions) {
          // Calcula KPIs do período comparado
          let compareTotalIncome = 0
          let compareTotalSpent = 0
          
          compareTransactions.forEach((transaction: any) => {
            const amount = ensureNumber(transaction.amount)
            if (transaction.type === 'income') {
              compareTotalIncome += amount
            } else if (transaction.type === 'expense') {
              compareTotalSpent += amount
            }
          })
          
          const compareAvailableBalance = compareTotalIncome - compareTotalSpent
          const compareStartDateObj = new Date(filters.compareStartDate)
          const compareEndDateObj = new Date(filters.compareEndDate)
          const compareDaysInPeriod = Math.ceil((compareEndDateObj.getTime() - compareStartDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1
          const compareDaysPassed = Math.min(
            Math.ceil((now.getTime() - compareStartDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1,
            compareDaysInPeriod
          )
          
          const compareDailyAverage = compareDaysPassed > 0 ? compareTotalSpent / compareDaysPassed : 0
          const compareMonthlyProjection = compareDailyAverage * compareDaysInPeriod
          
          const compareKpis: DashboardKPIs = {
            totalSpent: compareTotalSpent,
            dailyAverage: Number(compareDailyAverage.toFixed(2)),
            monthlyProjection: Number(compareMonthlyProjection.toFixed(2)),
            budgetUsedPercentage: 0, // Não calculamos para comparação
            availableBalance: Number(compareAvailableBalance.toFixed(2)),
            daysOfReserve: compareDailyAverage > 0 ? Math.floor(compareAvailableBalance / compareDailyAverage) : 0,
          }
          
          // Time series do período comparado
          const compareTimeSeriesMap = new Map<string, number>()
          const compareCurrentDate = new Date(compareStartDateObj)
          while (compareCurrentDate <= compareEndDateObj) {
            const dateStr = compareCurrentDate.toISOString().split('T')[0]
            compareTimeSeriesMap.set(dateStr, 0)
            compareCurrentDate.setDate(compareCurrentDate.getDate() + 1)
          }
          
          compareTransactions.forEach((transaction: any) => {
            if (transaction.type === 'expense') {
              const amount = ensureNumber(transaction.amount)
              const date = transaction.transaction_date
              if (date) {
                const current = compareTimeSeriesMap.get(date) || 0
                compareTimeSeriesMap.set(date, current + amount)
              }
            }
          })
          
          const compareTimeSeriesData: TimeSeriesData[] = Array.from(compareTimeSeriesMap.entries())
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
            .map(([date, amount]) => ({
              date,
              amount: Number(amount.toFixed(2)),
              label: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            }))
          
          // Categorias do período comparado
          const compareCategoryMap = new Map<string, number>()
          compareTransactions.forEach((transaction: any) => {
            if (transaction.type === 'expense') {
              const amount = ensureNumber(transaction.amount)
              const categoryName = transaction.category?.name || 'Sem Categoria'
              const current = compareCategoryMap.get(categoryName) || 0
              compareCategoryMap.set(categoryName, current + amount)
            }
          })
          
          const compareCategoryData: ChartData[] = Array.from(compareCategoryMap.entries())
            .map(([name, value], index) => ({
              name,
              value: Number(value.toFixed(2)),
              color: getCategoryColor(index)
            }))
            .sort((a, b) => b.value - a.value)
          
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
      console.log(`📈 KPIs: ${transactions?.length || 0} transações processadas`)
      console.log(`💰 Receitas: R$ ${totalIncome.toFixed(2)} | Despesas: R$ ${totalSpent.toFixed(2)} | Saldo: R$ ${availableBalance.toFixed(2)}`)

      set({
        kpis,
        timeSeriesData,
        categoryData,
        topTransactions,
        recentTransactions,
        totalTransactions: transactions?.length || 0,
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