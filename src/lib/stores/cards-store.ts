import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

// Interface correta baseada na estrutura real da tabela cards
interface Card {
  id: string
  user_id: string
  limit: number | null  // ✅ CORRETO: a tabela usa 'limit', não 'limit_amount'
  is_active: boolean
  created_at: string | null   // Pode ser null do banco
  updated_at: string | null    // Pode ser null do banco
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

      // Garante valores padrão corretos
      const cardsWithDefaults: Card[] = (data || []).map((card: any): Card => ({
        ...card,
        limit: card.limit ?? null, // A tabela já usa 'limit'
        is_active: card.is_active ?? true, // Garante que sempre seja boolean (default true)
        created_at: card.created_at ?? new Date().toISOString(),
        updated_at: card.updated_at ?? new Date().toISOString(),
      }))

      set({ cards: cardsWithDefaults, loading: false })
    } catch (error) {
      console.error('Erro inesperado ao buscar cartões:', error)
      set({ loading: false })
    }
  },

  addCard: async (cardData) => {
    try {
      const supabase = createClient()
      
      // Remove limit_amount se existir e garante que use 'limit'
      const insertData: any = { ...cardData }
      if ('limit_amount' in insertData) {
        insertData.limit = insertData.limit_amount
        delete insertData.limit_amount
      }
      // Garante que 'limit' seja null para cartões de débito
      if (insertData.type === 'debit') {
        insertData.limit = null
      }
      
      const { data, error } = await supabase
        .from('cards')
        .insert([insertData])
        .select()
        .single()

      if (error) {
        console.error('Erro ao inserir cartão:', error, 'Data:', insertData)
        return { error: error.message }
      }

      // Add to local state
      const { cards } = get()
      const newCard: Card = {
        ...data,
        limit: data.limit ?? null,
        is_active: data.is_active ?? true,
        created_at: data.created_at ?? new Date().toISOString(),
        updated_at: data.updated_at ?? new Date().toISOString(),
      }
      set({ cards: [newCard, ...cards] })

      return { error: null }
    } catch (error) {
      console.error('Erro inesperado ao criar cartão:', error)
      return { error: 'Erro inesperado ao criar cartão' }
    }
  },

  updateCard: async (id, updates) => {
    try {
      const supabase = createClient()
      
      // Remove limit_amount se existir e garante que use 'limit'
      const updateData: any = { ...updates }
      if ('limit_amount' in updateData) {
        updateData.limit = updateData.limit_amount
        delete updateData.limit_amount
      }
      
      const { data, error } = await supabase
        .from('cards')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Erro ao atualizar cartão:', error)
        return { error: error.message }
      }

      // Update local state
      const { cards } = get()
      const updatedCards: Card[] = cards.map(card => 
        card.id === id ? { 
          ...card, 
          ...data, 
          limit: data.limit ?? null,
          is_active: data.is_active ?? card.is_active ?? true,
          created_at: data.created_at ?? card.created_at ?? new Date().toISOString(),
          updated_at: data.updated_at ?? new Date().toISOString(),
        } : card
      )
      set({ cards: updatedCards })

      return { error: null }
    } catch (error) {
      console.error('Erro inesperado ao atualizar cartão:', error)
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