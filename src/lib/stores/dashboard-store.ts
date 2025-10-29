import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types/database.types'

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

interface DashboardState {
  kpis: DashboardKPIs | null
  timeSeriesData: TimeSeriesData[]
  categoryData: ChartData[]
  topTransactions: any[]
  loading: boolean
  error: string | null
  fetchDashboardData: (user: User | null, startDate?: string, endDate?: string) => Promise<void>
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

export const useDashboardStore = create<DashboardState>((set, get) => ({
  kpis: null,
  timeSeriesData: [],
  categoryData: [],
  topTransactions: [],
  loading: false,
  error: null,

  fetchDashboardData: async (user, startDate, endDate) => {
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
      
      const start = startDate || currentMonthStart.toISOString().split('T')[0]
      const end = endDate || currentMonthEnd.toISOString().split('T')[0]

      console.log(`📅 Período: ${start} até ${end}`)

      // Fetch transactions para o período
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*),
          card:cards(*)
        `)
        .eq('user_id', user.id)
        .gte('transaction_date', start)
        .lte('transaction_date', end)
        .order('transaction_date', { ascending: true })

      if (transactionsError) {
        console.error('Erro ao buscar transações:', transactionsError)
        set({ 
          loading: false, 
          error: `Erro ao carregar transações: ${transactionsError.message}` 
        })
        return
      }

      console.log(`📈 Transações encontradas: ${transactions?.length || 0}`)

      let totalBudget = 0
      let availableBalance = 0

      // Buscar orçamentos do usuário (com fallback seguro)
      try {
        const { data: budgets, error: budgetsError } = await supabase
          .from('budgets')
          .select('amount, start_date, end_date')
          .eq('user_id', user.id)
          .or(`start_date.lte.${end},end_date.gte.${start}`)

        if (!budgetsError && budgets) {
          totalBudget = budgets.reduce((sum: number, b: any) => sum + (b.amount || 0), 0)
          console.log(`💰 Orçamento total: ${totalBudget}`)
        } else if (budgetsError && budgetsError.code !== '42703') {
          console.warn('Erro ao buscar orçamentos:', budgetsError)
        }
      } catch (budgetsError) {
        console.warn('Erro na busca de orçamentos:', budgetsError)
        // Continua sem orçamentos
      }

      // Buscar saldo disponível (com fallback seguro)
      try {
        // Tenta buscar da tabela accounts primeiro
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('balance')
          .eq('user_id', user.id)
          .single()

        if (!accountError && accountData) {
          availableBalance = accountData.balance || 0
        } else {
          // Fallback: calcula saldo baseado em transações de receita vs despesa
          const { data: incomeTransactions } = await supabase
            .from('transactions')
            .select('amount, type')
            .eq('user_id', user.id)
            .lte('transaction_date', end)

          if (incomeTransactions) {
            const totalIncome = incomeTransactions
              .filter((t: any) => t.type === 'income')
              .reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
            
            const totalExpenses = incomeTransactions
              .filter((t: any) => t.type === 'expense')
              .reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
            
            availableBalance = totalIncome - totalExpenses
          }
        }
        console.log(`💳 Saldo disponível: ${availableBalance}`)
      } catch (accountError) {
        console.warn('Erro na busca de saldo:', accountError)
        availableBalance = 0
      }

      // Calcular KPIs
      const totalSpent = transactions?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0
      
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
      const budgetUsedPercentage = totalBudget > 0 ? 
        Math.min((totalSpent / totalBudget) * 100, 100) : 0

      // Calcular dias de reserva
      const daysOfReserve = dailyAverage > 0 ? 
        Math.floor(Math.max(availableBalance, 0) / dailyAverage) : 0

      const kpis: DashboardKPIs = {
        totalSpent: Number(totalSpent.toFixed(2)),
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

      // Adicionar valores reais das transações
      transactions?.forEach((transaction: any) => {
        const date = transaction.transaction_date
        const current = timeSeriesMap.get(date) || 0
        timeSeriesMap.set(date, current + (transaction.amount || 0))
      })

      const timeSeriesData: TimeSeriesData[] = Array.from(timeSeriesMap.entries())
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([date, amount]) => ({
          date,
          amount: Number(amount.toFixed(2)),
          label: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        }))

      // Gerar dados de categoria
      const categoryMap = new Map<string, number>()
      transactions?.forEach((transaction: any) => {
        const categoryName = transaction.category?.name || 'Sem Categoria'
        const current = categoryMap.get(categoryName) || 0
        categoryMap.set(categoryName, current + (transaction.amount || 0))
      })

      const categoryData: ChartData[] = Array.from(categoryMap.entries())
        .map(([name, value], index) => ({
          name,
          value: Number(value.toFixed(2)),
          color: getCategoryColor(index)
        }))
        .sort((a, b) => b.value - a.value) // Ordenar por valor decrescente

      // Pegar top 5 transações
      const topTransactions = transactions
        ?.filter((t: any) => t.amount > 0) // Apenas transações com valor positivo
        .sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0))
        .slice(0, 5)
        .map((transaction: any) => ({
          ...transaction,
          amount: Number((transaction.amount || 0).toFixed(2))
        })) || []

      console.log('✅ Dashboard: Dados carregados com sucesso')
      console.log(`📊 KPIs: Total gasto: R$ ${kpis.totalSpent}, Média diária: R$ ${kpis.dailyAverage}`)

      set({
        kpis,
        timeSeriesData,
        categoryData,
        topTransactions,
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