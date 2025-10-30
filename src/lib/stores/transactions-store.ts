import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/types/database.types'

type PaymentMethod = 'credit' | 'debit' | 'cash' | 'pix' | 'boleto'

interface TransactionsStore {
  transactions: Transaction[]
  loading: boolean
  error: string | null
  fetchTransactions: (filters?: {
    startDate?: string
    endDate?: string
    categoryId?: string
    cardId?: string
    paymentMethod?: PaymentMethod | 'all'
    search?: string
  }) => Promise<void>
  addTransaction: (transaction: {
    description: string
    amount: number
    type: 'income' | 'expense'
    category_id: string
    transaction_date: string
  }) => Promise<void>
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
}

export const useTransactionsStore = create<TransactionsStore>((set, get) => ({
  transactions: [],
  loading: false,
  error: null,

  fetchTransactions: async (filters) => {
    set({ loading: true, error: null })
    try {
      let query = supabase
        .from('transactions')
        .select('*')

      if (filters?.startDate) {
        query = query.gte('transaction_date', filters.startDate)
      }
      if (filters?.endDate) {
        query = query.lte('transaction_date', filters.endDate)
      }
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId)
      }
      if (filters?.cardId) {
        query = query.eq('card_id', filters.cardId)
      }
      if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
        query = query.eq('payment_method', filters.paymentMethod)
      }
      if (filters?.search) {
        query = query.ilike('description', `%${filters.search}%`)
      }

      const { data, error } = await query.order('transaction_date', { ascending: false })

      if (error) throw error
      set({ transactions: (data as Transaction[]) || [] })
    } catch (error) {
      set({ error: (error as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  addTransaction: async (transaction: {
    description: string
    amount: number
    type: 'income' | 'expense'
    category_id: string
    transaction_date: string
  }) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([transaction])
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        transactions: [data, ...state.transactions]
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  updateTransaction: async (id: string, updates: Partial<Transaction>) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        transactions: state.transactions.map((t) => (t.id === id ? data : t))
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  deleteTransaction: async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)

      if (error) throw error

      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id)
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