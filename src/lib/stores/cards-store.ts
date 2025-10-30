import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

// Interface correta baseada na estrutura real da tabela cards
interface Card {
  id: string
  user_id: string
  limit: number | null          // ✅ CORRETO: 'limit' (não 'limit_amount')
  is_active: boolean
  created_at: string
  updated_at: string
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
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar cartões:', error)
        return
      }

      set({ cards: data || [], loading: false })
    } catch (error) {
      console.error('Erro inesperado ao buscar cartões:', error)
      set({ loading: false })
    }
  },

  addCard: async (cardData) => {
    try {
      const { data, error } = await supabase
        .from('cards')
        .insert([cardData])
        .select()
        .single()

      if (error) {
        return { error: error.message }
      }

      // Add to local state
      const { cards } = get()
      set({ cards: [data, ...cards] })

      return { error: null }
    } catch (error) {
      return { error: 'Erro inesperado ao criar cartão' }
    }
  },

  updateCard: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('cards')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { error: error.message }
      }

      // Update local state
      const { cards } = get()
      const updatedCards = cards.map(card => 
        card.id === id ? { ...card, ...data } : card
      )
      set({ cards: updatedCards })

      return { error: null }
    } catch (error) {
      return { error: 'Erro inesperado ao atualizar cartão' }
    }
  },

  deleteCard: async (id) => {
    try {
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