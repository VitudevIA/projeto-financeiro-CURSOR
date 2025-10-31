import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth-store'
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
    user_id?: string
    expense_nature?: string | null
    installment_number?: number | null
    total_installments?: number | null
    payment_method?: PaymentMethod
    card_id?: string | null
    notes?: string | null
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
      const supabase = createClient()
      let query = supabase
        .from('transactions')
        .select('*')

      if (filters?.startDate) {
        query = query.gte('transaction_date', filters.startDate)
      }
      if (filters?.endDate) {
        query = query.lte('transaction_date', filters.endDate)
      }
      if (filters?.categoryId && filters.categoryId !== 'all') {
        query = query.eq('category_id', filters.categoryId)
      }
      if (filters?.cardId && filters.cardId !== 'all') {
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
      
      // Garante que os tipos sejam corretos conforme a interface Transaction
      const typedTransactions: Transaction[] = (data || []).map((item: any): Transaction => ({
        id: item.id,
        user_id: item.user_id,
        category_id: item.category_id,
        amount: item.amount,
        description: item.description,
        transaction_date: item.transaction_date,
        type: (item.type === 'income' || item.type === 'expense') ? item.type : 'expense',
        payment_method: (['credit', 'debit', 'cash', 'pix', 'boleto'].includes(item.payment_method || ''))
          ? item.payment_method as PaymentMethod
          : 'cash',
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || null,
      }))
      
      set({ transactions: typedTransactions })
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
    user_id?: string
    expense_nature?: string | null
    installment_number?: number | null
    total_installments?: number | null
    payment_method?: PaymentMethod
    card_id?: string | null
    notes?: string | null
  }) => {
    try {
      set({ loading: true, error: null })
      const supabase = createClient()
      
      // Obtém o user_id do store de autenticação se não foi fornecido
      let userId = transaction.user_id
      if (!userId) {
        const authState = useAuthStore.getState()
        userId = authState.user?.id
        if (!userId) {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.user) {
            throw new Error('Usuário não autenticado')
          }
          userId = session.user.id
        }
      }

      // Prepara os dados para inserção
      // Nota: installment_number, total_installments e expense_nature não existem no banco
      // Usamos o campo 'notes' para armazenar informações de parcelas
      let notes: string | null = transaction.notes || null
      
      // Se há informações de parcelas, adiciona ao notes
      if (transaction.installment_number && transaction.total_installments) {
        const installmentInfo = `Parcela ${transaction.installment_number}/${transaction.total_installments}`
        if (transaction.expense_nature) {
          notes = notes ? `${notes} | ${installmentInfo} - ${transaction.expense_nature}` : `${installmentInfo} - ${transaction.expense_nature}`
        } else {
          notes = notes ? `${notes} | ${installmentInfo}` : installmentInfo
        }
      } else if (transaction.expense_nature && !notes) {
        notes = transaction.expense_nature
      }

      const insertData: any = {
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        category_id: transaction.category_id,
        transaction_date: transaction.transaction_date,
        user_id: userId,
        payment_method: transaction.payment_method || 'cash',
        card_id: transaction.card_id || null,
        notes: notes,
      }

      const { data, error } = await supabase
        .from('transactions')
        .insert([insertData])
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar transação:', error)
        throw error
      }

      // Garante que o tipo seja correto (income | expense)
      const newTransaction: Transaction = {
        ...data,
        type: (data.type === 'income' || data.type === 'expense') ? data.type : 'expense',
        payment_method: (['credit', 'debit', 'cash', 'pix', 'boleto'].includes(data.payment_method || ''))
          ? data.payment_method as PaymentMethod
          : 'cash',
      } as Transaction

      set((state) => ({
        transactions: [newTransaction, ...state.transactions],
        loading: false
      }))
    } catch (error) {
      const errorMessage = (error as Error).message
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  updateTransaction: async (id: string, updates: Partial<Transaction>) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Garante que o tipo seja correto (income | expense)
      const updatedTransaction: Transaction = {
        ...data,
        type: (data.type === 'income' || data.type === 'expense') ? data.type : 'expense',
        payment_method: (['credit', 'debit', 'cash', 'pix', 'boleto'].includes(data.payment_method || ''))
          ? data.payment_method as PaymentMethod
          : 'cash',
      } as Transaction

      set((state) => ({
        transactions: state.transactions.map((t) => (t.id === id ? updatedTransaction : t))
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  deleteTransaction: async (id: string) => {
    try {
      const supabase = createClient()
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