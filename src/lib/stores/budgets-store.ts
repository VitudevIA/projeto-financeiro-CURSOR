import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Budget, BudgetWithCategory } from '@/types/database.types'

interface BudgetsStore {
  budgets: BudgetWithCategory[]
  loading: boolean
  error: string | null
  fetchBudgets: (month?: string) => Promise<void>
  addBudget: (budget: {
    category_id: string
    month: string
    limit_amount: number
    alert_percentage: number | null
  }) => Promise<void>
  updateBudget: (id: string, updates: Partial<Budget>) => Promise<void>
  deleteBudget: (id: string) => Promise<void>
}

export const useBudgetsStore = create<BudgetsStore>((set, get) => ({
  budgets: [],
  loading: false,
  error: null,

  fetchBudgets: async (month?: string) => {
    set({ loading: true, error: null })
    try {
      let query = supabase
        .from('budgets')
        .select(`
          *,
          categories (
            id,
            name,
            type
          )
        `)

      // Se month foi fornecido, filtra por mês
      if (month) {
        query = query.gte('month', month).lt('month', getNextMonth(month))
      }

      const { data, error } = await query.order('month', { ascending: false })

      if (error) throw error
      set({ budgets: data as BudgetWithCategory[] || [] })
    } catch (error) {
      set({ error: (error as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  addBudget: async (budget: {
    category_id: string
    month: string
    limit_amount: number
    alert_percentage: number | null
  }) => {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .insert([budget])
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        budgets: [data, ...state.budgets]
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  updateBudget: async (id: string, updates: Partial<Budget>) => {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === id ? data : b))
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  deleteBudget: async (id: string) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        budgets: state.budgets.filter((b) => b.id !== id)
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  }
}))

// Função auxiliar para calcular o próximo mês
function getNextMonth(month: string): string {
  const date = new Date(month)
  date.setMonth(date.getMonth() + 1)
  return date.toISOString().split('T')[0]
}