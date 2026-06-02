import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

const BILLING_DAY_MIN = 1
const BILLING_DAY_MAX = 31

export interface Card {
  id: string
  user_id: string
  limit: number | null
  is_active: boolean
  created_at: string | null
  updated_at: string | null
  name: string
  type: string
  brand: string | null
  last_digits: string | null
  closing_day: number
  due_day: number
}

export type CardInput = Omit<Card, 'id' | 'created_at' | 'updated_at'>

export function validateCardBillingDays(
  closing_day: number | null | undefined,
  due_day: number | null | undefined
): string | null {
  if (closing_day == null || due_day == null) {
    return 'Dia de fechamento e dia de vencimento são obrigatórios'
  }
  if (
    !Number.isInteger(closing_day) ||
    closing_day < BILLING_DAY_MIN ||
    closing_day > BILLING_DAY_MAX
  ) {
    return `Dia de fechamento deve ser um número entre ${BILLING_DAY_MIN} e ${BILLING_DAY_MAX}`
  }
  if (
    !Number.isInteger(due_day) ||
    due_day < BILLING_DAY_MIN ||
    due_day > BILLING_DAY_MAX
  ) {
    return `Dia de vencimento deve ser um número entre ${BILLING_DAY_MIN} e ${BILLING_DAY_MAX}`
  }
  return null
}

function mapCardFromDb(card: Record<string, unknown>): Card {
  return {
    id: card.id as string,
    user_id: card.user_id as string,
    name: card.name as string,
    type: card.type as string,
    brand: (card.brand as string) ?? null,
    last_digits: (card.last_digits as string) ?? null,
    limit: (card.limit_amount as number) ?? (card.limit as number) ?? null,
    is_active: (card.is_active as boolean) ?? true,
    closing_day: Number(card.closing_day ?? 25),
    due_day: Number(card.due_day ?? 10),
    created_at: (card.created_at as string) ?? new Date().toISOString(),
    updated_at: (card.updated_at as string) ?? new Date().toISOString(),
  }
}

interface CardsState {
  cards: Card[]
  loading: boolean
  fetchCards: () => Promise<void>
  addCard: (card: CardInput) => Promise<{ error: string | null }>
  updateCard: (id: string, updates: Partial<CardInput>) => Promise<{ error: string | null }>
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

      const cardsWithDefaults: Card[] = (data || []).map((card) =>
        mapCardFromDb(card as Record<string, unknown>)
      )

      set({ cards: cardsWithDefaults, loading: false })
    } catch (error) {
      console.error('Erro inesperado ao buscar cartões:', error)
      set({ loading: false })
    }
  },

  addCard: async (cardData) => {
    const billingError = validateCardBillingDays(cardData.closing_day, cardData.due_day)
    if (billingError) {
      return { error: billingError }
    }

    try {
      const supabase = createClient()

      const insertData: Record<string, unknown> = { ...cardData }
      if ('limit_amount' in insertData) {
        delete insertData.limit_amount
      }
      if (insertData.type === 'debit') {
        insertData.limit = null
      }

      const { data, error } = await supabase
        .from('cards')
        .insert([insertData] as never)
        .select()
        .single()

      if (error) {
        console.error('Erro ao inserir cartão:', error, 'Data:', insertData)
        return { error: error.message }
      }

      const { cards } = get()
      const newCard = mapCardFromDb(data as Record<string, unknown>)
      set({ cards: [newCard, ...cards] })

      return { error: null }
    } catch (error) {
      console.error('Erro inesperado ao criar cartão:', error)
      return { error: 'Erro inesperado ao criar cartão' }
    }
  },

  updateCard: async (id, updates) => {
    const { cards } = get()
    const existing = cards.find((c) => c.id === id)
    if (!existing) {
      return { error: 'Cartão não encontrado' }
    }

    const closing_day = updates.closing_day ?? existing.closing_day
    const due_day = updates.due_day ?? existing.due_day
    const billingError = validateCardBillingDays(closing_day, due_day)
    if (billingError) {
      return { error: billingError }
    }

    try {
      const supabase = createClient()

      const updateData: Record<string, unknown> = { ...updates, closing_day, due_day }
      if ('limit_amount' in updateData) {
        delete updateData.limit_amount
      }

      const { data, error } = await supabase
        .from('cards')
        .update(updateData as never)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Erro ao atualizar cartão:', error)
        return { error: error.message }
      }

      const updatedCard = mapCardFromDb(data as Record<string, unknown>)
      const updatedCards: Card[] = cards.map((card) =>
        card.id === id ? updatedCard : card
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
      const { error } = await supabase.from('cards').delete().eq('id', id)

      if (error) {
        return { error: error.message }
      }

      const { cards } = get()
      set({ cards: cards.filter((card) => card.id !== id) })

      return { error: null }
    } catch (error) {
      return { error: 'Erro inesperado ao deletar cartão' }
    }
  },

  toggleCardStatus: async (id) => {
    try {
      const supabase = createClient()
      const { cards } = get()
      const card = cards.find((c) => c.id === id)
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

      set({
        cards: cards.map((c) =>
          c.id === id ? { ...c, is_active: !c.is_active } : c
        ),
      })

      return { error: null }
    } catch (error) {
      return { error: 'Erro inesperado ao alterar status do cartão' }
    }
  },
}))
