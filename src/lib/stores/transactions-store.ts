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
  deleteTransactions: (ids: string[]) => Promise<void>
}

export const useTransactionsStore = create<TransactionsStore>((set, get) => ({
  transactions: [],
  loading: false,
  error: null,

  fetchTransactions: async (filters) => {
    set({ loading: true, error: null })
    try {
      const supabase = createClient()
      
      // Obtém o user_id do usuário autenticado
      const authState = useAuthStore.getState()
      let userId = authState.user?.id
      
      if (!userId) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          throw new Error('Usuário não autenticado')
        }
        userId = session.user.id
      }
      
      console.log('[Transactions Store] 🔍 Buscando transações para usuário:', userId)
      
      // Faz JOIN com categorias para trazer o nome da categoria junto
      // Usa a mesma sintaxe do Dashboard que sabemos que funciona
      let query = supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', userId) // CRÍTICO: Filtrar por user_id

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

      if (error) {
        console.error('[Transactions Store] ❌ Erro ao buscar transações:', error)
        throw error
      }
      
      console.log(`[Transactions Store] ✅ ${data?.length || 0} transações encontradas`)
      
      // Busca todas as categorias do usuário como fallback (caso o JOIN não funcione)
      const { data: allCategories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true })
      
      if (categoriesError) {
        console.warn('[Transactions Store] ⚠️ Erro ao buscar categorias (fallback):', categoriesError)
      }
      
      // Cria um mapa de categorias por ID para busca rápida
      const categoriesMap = new Map<string, any>()
      if (allCategories) {
        allCategories.forEach(cat => {
          categoriesMap.set(cat.id, cat)
        })
      }
      
      console.log(`[Transactions Store] 📚 ${categoriesMap.size} categorias carregadas para fallback`)
      
      // Log da primeira transação para debug
      if (data && data.length > 0) {
        const firstItem = data[0]
        const categoryFromJoin = firstItem.category
        const categoryFromMap = firstItem.category_id ? categoriesMap.get(firstItem.category_id) : null
        
        console.log('[Transactions Store] 📋 Primeira transação (debug):', {
          id: firstItem.id,
          description: firstItem.description,
          category_id: firstItem.category_id,
          category_from_join: categoryFromJoin,
          category_name_from_join: categoryFromJoin?.name || 'N/A',
          category_from_map: categoryFromMap,
          category_name_from_map: categoryFromMap?.name || 'N/A',
          category_full_join: JSON.stringify(categoryFromJoin),
        })
      }
      
      // Garante que os tipos sejam corretos conforme a interface Transaction
      // Agora inclui a categoria no objeto (mas mantém compatibilidade com Transaction)
      const typedTransactions: Transaction[] = (data || []).map((item: any): Transaction => {
        const transaction: Transaction = {
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
        }
        
        // Prioridade 1: Categoria do JOIN (mais eficiente)
        // Prioridade 2: Busca no mapa de categorias (fallback)
        let categoryData = item.category
        
        // Se o JOIN não retornou categoria mas temos category_id, busca no mapa
        if (!categoryData && item.category_id && categoriesMap.has(item.category_id)) {
          categoryData = categoriesMap.get(item.category_id)
          console.log(`[Transactions Store] 🔄 Fallback: Categoria encontrada no mapa para transação ${item.id}:`, categoryData?.name)
        }
        
        // Adiciona categoria como propriedade extra (não tipada para manter compatibilidade)
        ;(transaction as any).category = categoryData || null
        
        return transaction
      })
      
      set({ transactions: typedTransactions })
    } catch (error) {
      console.error('[Transactions Store] ❌ Erro:', error)
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

      // Garante que o tipo seja sempre 'income' ou 'expense' (conforme constraint do banco)
      // Remove espaços, converte para lowercase e valida rigorosamente
      const rawType = String(transaction.type || '').trim().toLowerCase()
      const validatedType: 'income' | 'expense' = 
        (rawType === 'income' || rawType === 'expense') 
          ? rawType as 'income' | 'expense'
          : 'expense'

      // Garante que o payment_method seja válido
      const rawPaymentMethod = String(transaction.payment_method || '').trim().toLowerCase()
      const validPaymentMethods = ['credit', 'debit', 'cash', 'pix', 'boleto']
      const validatedPaymentMethod = validPaymentMethods.includes(rawPaymentMethod)
        ? rawPaymentMethod as PaymentMethod
        : 'cash'

      const insertData: any = {
        description: transaction.description,
        amount: transaction.amount,
        type: validatedType, // ✅ Tipo validado e garantido
        category_id: transaction.category_id,
        transaction_date: transaction.transaction_date,
        user_id: userId,
        payment_method: validatedPaymentMethod,
        card_id: transaction.card_id || null,
        notes: notes,
      }

      // Log para debug (remover em produção se necessário)
      console.log('Inserting transaction:', {
        type: validatedType,
        payment_method: validatedPaymentMethod,
        typeOriginal: transaction.type,
        typeRaw: rawType
      })

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
  },

  deleteTransactions: async (ids: string[]) => {
    try {
      if (ids.length === 0) return

      const supabase = createClient()
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', ids)

      if (error) throw error

      set((state) => ({
        transactions: state.transactions.filter((t) => !ids.includes(t.id))
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