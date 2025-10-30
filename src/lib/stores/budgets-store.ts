import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Budget, BudgetWithCategory } from '@/types/database.types'

interface BudgetsStore {
  budgets: BudgetWithCategory[]
  loading: boolean
  error: string | null
  fetchBudgets: () => Promise<void>
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

  fetchBudgets: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          categories (
            id,
            name,
            type
          )
        `)
        .order('month', { ascending: false })

      // AQUI É ONDE VOCÊ INSERE O CÓDIGO:
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

  updateBudget: async (id, updates) => {
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

  deleteBudget: async (id) => {
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