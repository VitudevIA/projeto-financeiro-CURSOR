import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

// Interface correta baseada na estrutura real da tabela cards
interface Card {
  id: string
  user_id: string
  limit_amount: number | null  // ✅ CORRETO: 'limit_amount' conforme banco de dados
  limit?: number | null        // Mantido para compatibilidade
  is_active: boolean | null   // ✅ Pode ser null no banco de dados
  created_at: string | null
  updated_at: string | null
  name: string
  type: string
  brand: string | null
  last_digits: string | null
}

interface CardsState {
  cards: Card[]
  loading: boolean
  fetchCards: () => Promise<void>
  addCard: (card: Omit<Card, 'id' | 'created_at' | 'updated_at'>) => Promise<{ error: string | null }>
  updateCard: (id: string, updates: Partial<Card>) => Promise<{ error: string | null }>
  deleteCard: (id: string) => Promise<{ error: string | null }>
  toggleCardStatus: (id: string) => Promise<{ error: string | null }>
}

export const useCardsStore = create<CardsState>((set, get) => ({
  cards: [],
  loading: false,

  fetchCards: async () => {
    try {
      set({ loading: true })
      const supabase = createClient()
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar cartões:', error)
        set({ loading: false })
        return
      }

      // Mapeia limit_amount para limit para compatibilidade com o código existente
      const cardsWithLimit: Card[] = (data || []).map((card: any): Card => ({
        ...card,
        limit: card.limit_amount, // Adiciona 'limit' para compatibilidade
        is_active: card.is_active ?? true, // Garante boolean (default true se null)
      }))

      set({ cards: cardsWithLimit, loading: false })
    } catch (error) {
      console.error('Erro inesperado ao buscar cartões:', error)
      set({ loading: false })
    }
  },

  addCard: async (cardData) => {
    try {
      const supabase = createClient()
      
      // Mapeia 'limit' para 'limit_amount' conforme a estrutura do banco
      const insertData: any = {
        ...cardData,
        limit_amount: (cardData as any).limit || null,
      }
      delete insertData.limit // Remove 'limit' se existir
      
      const { data, error } = await supabase
        .from('cards')
        .insert([insertData])
        .select()
        .single()

      if (error) {
        return { error: error.message }
      }

      // Add to local state - mapeia limit_amount para limit para compatibilidade
      const { cards } = get()
      const cardWithLimit: Card = {
        ...data,
        limit: data.limit_amount, // Adiciona 'limit' para compatibilidade
        is_active: data.is_active ?? true, // Garante que is_active seja boolean (default true)
      }
      set({ cards: [cardWithLimit, ...cards] })

      return { error: null }
    } catch (error) {
      return { error: 'Erro inesperado ao criar cartão' }
    }
  },

  updateCard: async (id, updates) => {
    try {
      const supabase = createClient()
      
      // Mapeia 'limit' para 'limit_amount' se existir
      const updateData: any = { ...updates }
      if ('limit' in updateData) {
        updateData.limit_amount = updateData.limit
        delete updateData.limit
      }
      
      const { data, error } = await supabase
        .from('cards')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { error: error.message }
      }

      // Update local state - mapeia limit_amount para limit
      const { cards } = get()
      const updatedCards: Card[] = cards.map(card => 
        card.id === id ? { 
          ...card, 
          ...data, 
          limit: data.limit_amount,
          is_active: data.is_active ?? card.is_active ?? true, // Garante boolean
        } : card
      )
      set({ cards: updatedCards })

      return { error: null }
    } catch (error) {
      return { error: 'Erro inesperado ao atualizar cartão' }
    }
  },

  deleteCard: async (id) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', id)

      if (error) {
        return { error: error.message }
      }

      // Remove from local state
      const { cards } = get()
      const filteredCards = cards.filter(card => card.id !== id)
      set({ cards: filteredCards })

      return { error: null }
    } catch (error) {
      return { error: 'Erro inesperado ao deletar cartão' }
    }
  },

  toggleCardStatus: async (id) => {
    try {
      const supabase = createClient()
      const { cards } = get()
      const card = cards.find(c => c.id === id)
      if (!card) {
        return { error: 'Cartão não encontrado' }
      }

      const { error } = await supabase
        .from('cards')
        .update({ is_active: !card.is_active })
        .eq('id', id)

      if (error) {
        return { error: error.message }
      }

      // Update local state
      const updatedCards = cards.map(c => 
        c.id === id ? { ...c, is_active: !c.is_active } : c
      )
      set({ cards: updatedCards })

      return { error: null }
    } catch (error) {
      return { error: 'Erro inesperado ao alterar status do cartão' }
    }
  },
}))