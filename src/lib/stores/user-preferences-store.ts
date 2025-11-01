import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from './auth-store'

export interface TransactionPreferences {
  lastCategoryId: string | null
  lastPaymentMethod: 'credit' | 'debit' | 'cash' | 'pix' | 'boleto' | null
  lastCardId: string | null
  mostUsedCategoryByType: {
    income: string | null
    expense: string | null
  }
  averageAmountByCategory: Record<string, number>
  updatedAt: string | null
}

interface UserPreferencesState {
  preferences: TransactionPreferences
  loading: boolean
  loadPreferences: () => Promise<void>
  savePreference: <K extends keyof TransactionPreferences>(
    key: K,
    value: TransactionPreferences[K]
  ) => Promise<void>
  updateMostUsedCategory: (type: 'income' | 'expense', categoryId: string) => Promise<void>
  calculateAverageAmount: (categoryId: string) => Promise<number>
  getLastPreferences: () => TransactionPreferences
}

const defaultPreferences: TransactionPreferences = {
  lastCategoryId: null,
  lastPaymentMethod: null,
  lastCardId: null,
  mostUsedCategoryByType: {
    income: null,
    expense: null,
  },
  averageAmountByCategory: {},
  updatedAt: null,
}

export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set, get) => ({
      preferences: defaultPreferences,
      loading: false,

      loadPreferences: async () => {
        try {
          set({ loading: true })
          const supabase = createClient()
          const { user } = useAuthStore.getState()

          if (!user) {
            set({ loading: false })
            return
          }

          // Tenta carregar do localStorage primeiro
          const localPrefs = localStorage.getItem('user-preferences-storage')
          if (localPrefs) {
            try {
              const parsed = JSON.parse(localPrefs)
              if (parsed?.state?.preferences) {
                set({ preferences: parsed.state.preferences, loading: false })
              }
            } catch (e) {
              // Ignora erro de parsing
            }
          }

          // Busca preferências do usuário no banco
          const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single()

          if (!error && data?.dashboard_data) {
            try {
              const dashboardData = typeof data.dashboard_data === 'string' 
                ? JSON.parse(data.dashboard_data) 
                : data.dashboard_data

              if (dashboardData?.transactionPreferences) {
                set({ preferences: dashboardData.transactionPreferences, loading: false })
              }
            } catch (e) {
              console.error('Erro ao parsear preferências:', e)
            }
          }

          set({ loading: false })
        } catch (error) {
          console.error('Erro ao carregar preferências:', error)
          set({ loading: false })
        }
      },

      savePreference: async <K extends keyof TransactionPreferences>(
        key: K,
        value: TransactionPreferences[K]
      ) => {
        try {
          const { preferences } = get()
          const updatedPreferences = {
            ...preferences,
            [key]: value,
            updatedAt: new Date().toISOString(),
          }

          set({ preferences: updatedPreferences })

          // Salva no banco de dados
          const supabase = createClient()
          const { user } = useAuthStore.getState()

          if (!user) return

          // Busca dados existentes ou cria novo
          const { data: existing } = await supabase
            .from('user_preferences')
            .select('dashboard_data')
            .eq('user_id', user.id)
            .single()

          let dashboardData: any = {}
          if (existing?.dashboard_data) {
            try {
              dashboardData = typeof existing.dashboard_data === 'string'
                ? JSON.parse(existing.dashboard_data)
                : existing.dashboard_data
            } catch (e) {
              dashboardData = {}
            }
          }

          dashboardData.transactionPreferences = updatedPreferences

          await supabase
            .from('user_preferences')
            .upsert({
              user_id: user.id,
              dashboard_data: dashboardData,
              updated_at: new Date().toISOString(),
            } as any)
        } catch (error) {
          console.error('Erro ao salvar preferência:', error)
        }
      },

      updateMostUsedCategory: async (type: 'income' | 'expense', categoryId: string) => {
        const { preferences } = get()
        await get().savePreference('mostUsedCategoryByType', {
          ...preferences.mostUsedCategoryByType,
          [type]: categoryId,
        })
      },

      calculateAverageAmount: async (categoryId: string) => {
        try {
          const supabase = createClient()
          const { user } = useAuthStore.getState()

          if (!user) return 0

          const { data, error } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('category_id', categoryId)
            .limit(100) // Limita para performance

          if (error || !data || data.length === 0) return 0

          const sum = data.reduce((acc, t) => acc + Number(t.amount || 0), 0)
          const average = sum / data.length

          // Salva no cache de médias
          const { preferences } = get()
          await get().savePreference('averageAmountByCategory', {
            ...preferences.averageAmountByCategory,
            [categoryId]: average,
          })

          return average
        } catch (error) {
          console.error('Erro ao calcular média:', error)
          return 0
        }
      },

      getLastPreferences: () => {
        return get().preferences
      },
    }),
    {
      name: 'user-preferences-storage',
      partialize: (state) => ({
        preferences: state.preferences,
      }),
    }
  )
)
