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
      // Mapeia limit_amount (do tipo Supabase) para limit (nosso tipo Card)
      const cardsWithDefaults: Card[] = (data || []).map((card: any): Card => ({
        ...card,
        limit: card.limit_amount ?? card.limit ?? null, // Mapeia de limit_amount para limit
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
      
      // Prepara dados para insert - o banco usa 'limit', mas os tipos Supabase esperam 'limit_amount'
      // Como o banco real tem 'limit', vamos usar um cast para contornar a validação de tipos
      const insertData: any = { ...cardData }
      // Remove 'limit_amount' se existir (do nosso tipo interno)
      if ('limit_amount' in insertData) {
        delete insertData.limit_amount
      }
      // Garante que 'limit' seja null para cartões de débito
      if (insertData.type === 'debit') {
        insertData.limit = null
      }
      
      // Usa insert com tipo any para contornar a diferença entre limit (banco) e limit_amount (tipos Supabase)
      const { data, error } = await supabase
        .from('cards')
        .insert([insertData] as any)
        .select()
        .single()

      if (error) {
        console.error('Erro ao inserir cartão:', error, 'Data:', insertData)
        return { error: error.message }
      }

      // Add to local state
      // Mapeia limit_amount (do tipo Supabase) para limit (nosso tipo Card)
      const { cards } = get()
      const cardData = data as any
      const newCard: Card = {
        id: data.id,
        user_id: data.user_id,
        name: data.name,
        type: data.type,
        brand: data.brand,
        last_digits: data.last_digits,
        limit: cardData.limit_amount ?? cardData.limit ?? null, // Mapeia de limit_amount para limit
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
      
      // Prepara dados para update - o banco usa 'limit', mas os tipos Supabase esperam 'limit_amount'
      // Como o banco real tem 'limit', vamos usar um cast para contornar a validação de tipos
      const updateData: any = { ...updates }
      // Remove 'limit_amount' se existir (do nosso tipo interno)
      if ('limit_amount' in updateData) {
        delete updateData.limit_amount
      }
      
      // Usa update com tipo any para contornar a diferença entre limit (banco) e limit_amount (tipos Supabase)
      const { data, error } = await supabase
        .from('cards')
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Erro ao atualizar cartão:', error)
        return { error: error.message }
      }

      // Update local state
      // Mapeia limit_amount (do tipo Supabase) para limit (nosso tipo Card)
      const { cards } = get()
      const cardData = data as any
      const updatedCards: Card[] = cards.map(card => 
        card.id === id ? { 
          id: data.id,
          user_id: data.user_id,
          name: data.name,
          type: data.type,
          brand: data.brand,
          last_digits: data.last_digits,
          limit: cardData.limit_amount ?? cardData.limit ?? null, // Mapeia de limit_amount para limit
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