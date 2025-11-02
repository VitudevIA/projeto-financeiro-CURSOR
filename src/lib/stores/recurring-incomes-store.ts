import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { RecurringIncome, RecurringIncomeInsert, RecurringIncomeUpdate } from '@/types/database.types'

interface RecurringIncomesState {
  recurringIncomes: RecurringIncome[]
  loading: boolean
  error: string | null
  fetchRecurringIncomes: () => Promise<void>
  addRecurringIncome: (income: RecurringIncomeInsert) => Promise<{ error: string | null }>
  updateRecurringIncome: (id: string, updates: RecurringIncomeUpdate) => Promise<{ error: string | null }>
  deleteRecurringIncome: (id: string) => Promise<{ error: string | null }>
  provisionIncomes: (params: { recurringIncomeId?: string; months?: number; startMonth?: string }) => Promise<{ error: string | null; count?: number }>
}

export const useRecurringIncomesStore = create<RecurringIncomesState>((set, get) => ({
  recurringIncomes: [],
  loading: false,
  error: null,

  fetchRecurringIncomes: async () => {
    try {
      set({ loading: true, error: null })
      const response = await fetch('/api/incomes/recurring')
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao buscar receitas recorrentes')
      }

      const { data } = await response.json()
      set({ recurringIncomes: data || [], loading: false })
    } catch (error) {
      const errorMessage = (error as Error).message || 'Erro desconhecido'
      set({ error: errorMessage, loading: false })
      console.error('Erro ao buscar receitas recorrentes:', error)
    }
  },

  addRecurringIncome: async (income) => {
    try {
      set({ loading: true, error: null })
      const response = await fetch('/api/incomes/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(income),
      })

      if (!response.ok) {
        const data = await response.json()
        return { error: data.error || 'Erro ao criar receita recorrente' }
      }

      const { data } = await response.json()
      set((state) => ({
        recurringIncomes: [data, ...state.recurringIncomes],
        loading: false,
      }))

      return { error: null }
    } catch (error) {
      const errorMessage = (error as Error).message || 'Erro desconhecido'
      set({ error: errorMessage, loading: false })
      return { error: errorMessage }
    }
  },

  updateRecurringIncome: async (id, updates) => {
    try {
      set({ loading: true, error: null })
      const response = await fetch(`/api/incomes/recurring/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const data = await response.json()
        return { error: data.error || 'Erro ao atualizar receita recorrente' }
      }

      const { data } = await response.json()
      set((state) => ({
        recurringIncomes: state.recurringIncomes.map((income) =>
          income.id === id ? data : income
        ),
        loading: false,
      }))

      return { error: null }
    } catch (error) {
      const errorMessage = (error as Error).message || 'Erro desconhecido'
      set({ error: errorMessage, loading: false })
      return { error: errorMessage }
    }
  },

  deleteRecurringIncome: async (id) => {
    try {
      set({ loading: true, error: null })
      const response = await fetch(`/api/incomes/recurring/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        return { error: data.error || 'Erro ao deletar receita recorrente' }
      }

      set((state) => ({
        recurringIncomes: state.recurringIncomes.filter((income) => income.id !== id),
        loading: false,
      }))

      return { error: null }
    } catch (error) {
      const errorMessage = (error as Error).message || 'Erro desconhecido'
      set({ error: errorMessage, loading: false })
      return { error: errorMessage }
    }
  },

  provisionIncomes: async (params) => {
    try {
      set({ loading: true, error: null })
      const response = await fetch('/api/incomes/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const data = await response.json()
        return { error: data.error || 'Erro ao provisionar receitas' }
      }

      const { data } = await response.json()
      set({ loading: false })
      
      return { error: null, count: data.transactions?.length || 0 }
    } catch (error) {
      const errorMessage = (error as Error).message || 'Erro desconhecido'
      set({ error: errorMessage, loading: false })
      return { error: errorMessage }
    }
  },
}))
