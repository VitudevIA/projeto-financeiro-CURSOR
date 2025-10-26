import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Budget } from '@/types/database.types'

interface BudgetWithDetails extends Budget {
  category: {
    id: string
    name: string
    icon: string | null
    color: string | null
  }
  spent_amount: number
  percentage_used: number
  status: 'ok' | 'warning' | 'exceeded'
}

interface BudgetsState {
  budgets: BudgetWithDetails[]
  loading: boolean
  fetchBudgets: (month?: string) => Promise<void>
  addBudget: (budget: Omit<Budget, 'id' | 'created_at' | 'updated_at'>) => Promise<{ error: string | null }>
  updateBudget: (id: string, updates: Partial<Budget>) => Promise<{ error: string | null }>
  deleteBudget: (id: string) => Promise<{ error: string | null }>
}

export const useBudgetsStore = create<BudgetsState>((set, get) => ({
  budgets: [],
  loading: false,

  fetchBudgets: async (month) => {
    try {
      set({ loading: true })
      
      const currentMonth = month || new Date().toISOString().slice(0, 7) + '-01'
      
      // Fetch budgets with category details
      const { data: budgets, error: budgetsError } = await supabase
        .from('budgets')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('month', currentMonth)
        .order('created_at', { ascending: false })

      if (budgetsError) {
        console.error('Erro ao buscar orçamentos:', budgetsError)
        return
      }

      // Calculate spent amounts for each budget
      const budgetsWithDetails: BudgetWithDetails[] = []
      
      for (const budget of budgets || []) {
        // Get transactions for this category in the current month
        const { data: transactions, error: transactionsError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('category_id', budget.category_id)
          .gte('transaction_date', currentMonth)
          .lt('transaction_date', new Date(new Date(currentMonth).getFullYear(), new Date(currentMonth).getMonth() + 1, 1).toISOString().slice(0, 10))

        if (transactionsError) {
          console.error('Erro ao buscar transações:', transactionsError)
          continue
        }

        const spentAmount = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0
        const percentageUsed = budget.limit_amount > 0 ? (spentAmount / budget.limit_amount) * 100 : 0
        
        let status: 'ok' | 'warning' | 'exceeded' = 'ok'
        if (percentageUsed >= 100) {
          status = 'exceeded'
        } else if (percentageUsed >= budget.alert_percentage) {
          status = 'warning'
        }

        budgetsWithDetails.push({
          ...budget,
          spent_amount: spentAmount,
          percentage_used: percentageUsed,
          status
        })
      }

      set({ budgets: budgetsWithDetails, loading: false })
    } catch (error) {
      console.error('Erro inesperado ao buscar orçamentos:', error)
      set({ loading: false })
    }
  },

  addBudget: async (budgetData) => {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .insert([budgetData])
        .select(`
          *,
          category:categories(*)
        `)
        .single()

      if (error) {
        return { error: error.message }
      }

      // Add to local state
      const { budgets } = get()
      const budgetWithDetails: BudgetWithDetails = {
        ...data,
        spent_amount: 0,
        percentage_used: 0,
        status: 'ok'
      }
      set({ budgets: [budgetWithDetails, ...budgets] })

      return { error: null }
    } catch (error) {
      return { error: 'Erro inesperado ao criar orçamento' }
    }
  },

  updateBudget: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          category:categories(*)
        `)
        .single()

      if (error) {
        return { error: error.message }
      }

      // Update local state
      const { budgets } = get()
      const updatedBudgets = budgets.map(budget => 
        budget.id === id ? { ...budget, ...data } : budget
      )
      set({ budgets: updatedBudgets })

      return { error: null }
    } catch (error) {
      return { error: 'Erro inesperado ao atualizar orçamento' }
    }
  },

  deleteBudget: async (id) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id)

      if (error) {
        return { error: error.message }
      }

      // Remove from local state
      const { budgets } = get()
      const filteredBudgets = budgets.filter(budget => budget.id !== id)
      set({ budgets: filteredBudgets })

      return { error: null }
    } catch (error) {
      return { error: 'Erro inesperado ao deletar orçamento' }
    }
  },
}))
