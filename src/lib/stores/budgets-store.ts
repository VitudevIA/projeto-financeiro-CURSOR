import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Budget } from '@/types/database.types'

// Se você precisar de dados relacionados (como nome da categoria)
interface BudgetWithDetails extends Budget {
  categories?: {
    name: string
    // outras propriedades da categoria se necessário
  }
}

interface BudgetsStore {
  budgets: BudgetWithDetails[]
  loading: boolean
  error: string | null
  fetchBudgets: () => Promise<void>
  addBudget: (budget: Omit<Budget, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
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
            name
          )
        `)
        .order('month', { ascending: false })

      if (error) throw error
      set({ budgets: data || [] })
    } catch (error) {
      set({ error: (error as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  addBudget: async (budget) => {
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