import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Transaction, TransactionWithDetails } from '@/types/database.types'

interface TransactionsState {
  transactions: TransactionWithDetails[]
  loading: boolean
  fetchTransactions: (filters?: TransactionFilters) => Promise<void>
  addTransaction: (transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => Promise<{ error: string | null }>
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<{ error: string | null }>
  deleteTransaction: (id: string) => Promise<{ error: string | null }>
}

interface TransactionFilters {
  startDate?: string
  endDate?: string
  categoryId?: string
  cardId?: string
  type?: string
  search?: string
}

export const useTransactionsStore = create<TransactionsState>((set, get) => ({
  transactions: [],
  loading: false,

  fetchTransactions: async (filters = {}) => {
    try {
      set({ loading: true })
      
      let query = supabase
        .from('transactions')
        .select(`
          *,
          card:cards(*),
          category:categories(*)
        `)
        .order('transaction_date', { ascending: false })

      // Apply filters
      if (filters.startDate) {
        query = query.gte('transaction_date', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('transaction_date', filters.endDate)
      }
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId)
      }
      if (filters.cardId) {
        query = query.eq('card_id', filters.cardId)
      }
      if (filters.type) {
        query = query.eq('type', filters.type)
      }
      if (filters.search) {
        query = query.ilike('description', `%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Erro ao buscar transações:', error)
        return
      }

      set({ transactions: data || [], loading: false })
    } catch (error) {
      console.error('Erro inesperado ao buscar transações:', error)
      set({ loading: false })
    }
  },

  addTransaction: async (transactionData) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select(`
          *,
          card:cards(*),
          category:categories(*)
        `)
        .single()

      if (error) {
        return { error: error.message }
      }

      // Add to local state
      const { transactions } = get()
      set({ transactions: [data, ...transactions] })

      return { error: null }
    } catch (error) {
      return { error: 'Erro inesperado ao criar transação' }
    }
  },

  updateTransaction: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          card:cards(*),
          category:categories(*)
        `)
        .single()

      if (error) {
        return { error: error.message }
      }

      // Update local state
      const { transactions } = get()
      const updatedTransactions = transactions.map(transaction => {
        const transactionAny = transaction as any
        return transactionAny.id === id ? { ...transaction, ...data } : transaction
      })
      set({ transactions: updatedTransactions })

      return { error: null }
    } catch (error) {
      return { error: 'Erro inesperado ao atualizar transação' }
    }
  },

  deleteTransaction: async (id) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)

      if (error) {
        return { error: error.message }
      }

      // Remove from local state
      const { transactions } = get()
      const filteredTransactions = transactions.filter(transaction => {
        const transactionAny = transaction as any
        return transactionAny.id !== id
      })
      set({ transactions: filteredTransactions })

      return { error: null }
    } catch (error) {
      return { error: 'Erro inesperado ao deletar transação' }
    }
  },
}))