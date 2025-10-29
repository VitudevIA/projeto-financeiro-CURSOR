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
  fetchDashboardData: (user: User | null, startDate?: string, endDate?: string) => Promise<void>
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  kpis: null,
  timeSeriesData: [],
  categoryData: [],
  topTransactions: [],
  loading: false,

  fetchDashboardData: async (user, startDate, endDate) => {
    try {
      set({ loading: true })

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

      // Fetch transactions for the period
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
        return
      }

      // Calculate KPIs
      const totalSpent = transactions?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0
      const daysInMonth = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1
      const daysPassed = Math.ceil((now.getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1
      const dailyAverage = daysPassed > 0 ? totalSpent / daysPassed : 0
      const monthlyProjection = dailyAverage * daysInMonth

      // Calculate budget usage (simplified - would need budget data)
      const budgetUsedPercentage = 0 // TODO: Calculate based on actual budgets

      // Calculate available balance (simplified)
      const availableBalance = 0 // TODO: Calculate based on income vs expenses

      // Calculate days of reserve (simplified)
      const daysOfReserve = availableBalance > 0 ? Math.floor(availableBalance / dailyAverage) : 0

      const kpis: DashboardKPIs = {
        totalSpent,
        dailyAverage,
        monthlyProjection,
        budgetUsedPercentage,
        availableBalance,
        daysOfReserve,
      }

      // Generate time series data
      const timeSeriesMap = new Map<string, number>()
      transactions?.forEach((transaction: any) => {
        const date = transaction.transaction_date
        const current = timeSeriesMap.get(date) || 0
        timeSeriesMap.set(date, current + transaction.amount)
      })

      const timeSeriesData: TimeSeriesData[] = Array.from(timeSeriesMap.entries()).map(([date, amount]) => ({
        date,
        amount,
        label: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      }))

      // Generate category data
      const categoryMap = new Map<string, number>()
      transactions?.forEach((transaction: any) => {
        const categoryName = transaction.category.name
        const current = categoryMap.get(categoryName) || 0
        categoryMap.set(categoryName, current + transaction.amount)
      })

      const categoryData: ChartData[] = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name,
        value,
        color: `hsl(${Math.random() * 360}, 70%, 50%)` // Random color for now
      }))

      // Get top 5 transactions
      const topTransactions = transactions
        ?.sort((a: any, b: any) => b.amount - a.amount)
        .slice(0, 5) || []

      set({
        kpis,
        timeSeriesData,
        categoryData,
        topTransactions,
        loading: false
      })
    } catch (error) {
      console.error('Erro inesperado ao buscar dados do dashboard:', error)
      set({ loading: false })
    }
  },
}))