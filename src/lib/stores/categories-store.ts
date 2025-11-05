import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/types/database.types'

interface CategoriesState {
  categories: Category[]
  loading: boolean
  fetchCategories: () => Promise<void>
  addCategory: (category: Omit<Category, 'id' | 'created_at'>) => Promise<{ error: string | null }>
  updateCategory: (id: string, updates: Partial<Category>) => Promise<{ error: string | null }>
  deleteCategory: (id: string) => Promise<{ error: string | null }>
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: [],
  loading: false,

  fetchCategories: async () => {
    try {
      set({ loading: true })
      
      // Obtém o user_id do usuário autenticado
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        console.warn('⚠️ Nenhum usuário autenticado para buscar categorias')
        set({ categories: [], loading: false })
        return
      }
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', session.user.id) // CRÍTICO: Filtrar por user_id
        .order('name', { ascending: true })

      if (error) {
        console.error('Erro ao buscar categorias:', error)
        return
      }

      console.log(`[Categories Store] ✅ ${data?.length || 0} categorias carregadas`)
      set({ categories: data || [], loading: false })
    } catch (error) {
      console.error('Erro inesperado ao buscar categorias:', error)
      set({ loading: false })
    }
  },

  addCategory: async (categoryData) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([categoryData])
        .select()
        .single()

      if (error) {
        return { error: error.message }
      }

      // Add to local state
      const { categories } = get()
      set({ categories: [...categories, data] })

      return { error: null }
    } catch (error) {
      return { error: 'Erro inesperado ao criar categoria' }
    }
  },

  updateCategory: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { error: error.message }
      }

      // Update local state
      const { categories } = get()
      const updatedCategories = categories.map(category => 
        category.id === id ? { ...category, ...data } : category
      )
      set({ categories: updatedCategories })

      return { error: null }
    } catch (error) {
      return { error: 'Erro inesperado ao atualizar categoria' }
    }
  },

  deleteCategory: async (id) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) {
        return { error: error.message }
      }

      // Remove from local state
      const { categories } = get()
      const filteredCategories = categories.filter(category => category.id !== id)
      set({ categories: filteredCategories })

      return { error: null }
    } catch (error) {
      return { error: 'Erro inesperado ao deletar categoria' }
    }
  },
}))
