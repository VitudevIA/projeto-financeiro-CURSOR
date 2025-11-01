import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { InsightsGenerator } from '@/lib/insights-generator'
import type { Insight } from '@/lib/insights-generator'

interface InsightsState {
  insights: Insight[]
  loading: boolean
  error: string | null
  fetchInsights: () => Promise<void>
  generateInsights: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  deleteInsight: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
}

export const useInsightsStore = create<InsightsState>((set, get) => ({
  insights: [],
  loading: false,
  error: null,

  fetchInsights: async () => {
    set({ loading: true, error: null })
    
    try {
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(20)

      if (error) {
        set({ error: error.message, loading: false })
        return
      }

      set({ insights: data || [], loading: false })
    } catch (error) {
      set({ error: 'Erro inesperado ao buscar insights', loading: false })
    }
  },

  generateInsights: async () => {
    set({ loading: true, error: null })
    
    try {
      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        set({ error: 'Usuário não autenticado', loading: false })
        return
      }

      const generator = new InsightsGenerator(user.id)
      const newInsights = await generator.generateInsights()
      
      if (newInsights.length > 0) {
        await generator.saveInsights(newInsights)
        // Recarregar insights após gerar novos
        await get().fetchInsights()
      }
      
      set({ loading: false })
    } catch (error) {
      set({ error: 'Erro ao gerar insights', loading: false })
    }
  },

  markAsRead: async (id) => {
    try {
      const { error } = await supabase
        .from('insights')
        .update({ is_read: true })
        .eq('id', id)

      if (error) {
        set({ error: error.message })
        return
      }

      // Atualizar estado local
      set((state) => ({
        insights: state.insights.map(insight => 
          insight.id === id ? { ...insight, is_read: true } : insight
        )
      }))
    } catch (error) {
      set({ error: 'Erro ao marcar insight como lido' })
    }
  },

  deleteInsight: async (id) => {
    try {
      const { error } = await supabase
        .from('insights')
        .delete()
        .eq('id', id)

      if (error) {
        set({ error: error.message })
        return
      }

      // Remover do estado local
      set((state) => ({
        insights: state.insights.filter(insight => insight.id !== id)
      }))
    } catch (error) {
      set({ error: 'Erro ao excluir insight' })
    }
  },

  markAllAsRead: async () => {
    try {
      const { error } = await supabase
        .from('insights')
        .update({ is_read: true })
        .eq('is_read', false)

      if (error) {
        set({ error: error.message })
        return
      }

      // Atualizar estado local
      set((state) => ({
        insights: state.insights.map(insight => ({ ...insight, is_read: true }))
      }))
    } catch (error) {
      set({ error: 'Erro ao marcar todos os insights como lidos' })
    }
  },
}))
