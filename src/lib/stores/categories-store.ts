import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
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
      
      const supabase = createClient()
      
      // Obtém o user_id do usuário autenticado
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('[Categories Store] ❌ Erro ao obter sessão:', sessionError)
        set({ categories: [], loading: false })
        return
      }
      
      if (!session?.user) {
        console.warn('[Categories Store] ⚠️ Nenhum usuário autenticado para buscar categorias')
        set({ categories: [], loading: false })
        return
      }
      
      console.log('[Categories Store] 🔍 Buscando categorias para usuário:', session.user.id)
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', session.user.id) // CRÍTICO: Filtrar por user_id
        .order('name', { ascending: true })

      if (error) {
        console.error('[Categories Store] ❌ Erro ao buscar categorias:', error)
        set({ categories: [], loading: false })
        return
      }

      console.log(`[Categories Store] ✅ ${data?.length || 0} categorias carregadas`)
      if (data && data.length > 0) {
        console.log('[Categories Store] 📋 Categorias:', data.map(c => ({ id: c.id, name: c.name, type: c.type })))
      }
      
      // Mapeia os dados do Supabase para o tipo Category, garantindo que updated_at seja incluído
      const mappedCategories: Category[] = (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        type: (c.type === 'income' || c.type === 'expense') ? c.type : 'expense',
        user_id: c.user_id || '',
        created_at: c.created_at || new Date().toISOString(),
        updated_at: c.updated_at || null,
      }))
      
      set({ categories: mappedCategories, loading: false })
    } catch (error) {
      console.error('[Categories Store] ❌ Erro inesperado ao buscar categorias:', error)
      set({ categories: [], loading: false })
    }
  },

  addCategory: async (categoryData) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('categories')
        .insert([categoryData])
        .select()
        .single()

      if (error) {
        return { error: error.message }
      }

      // Add to local state - mapeia para o tipo Category
      const { categories } = get()
      // Cast para any para acessar campos que podem não estar no tipo Row do Supabase
      const insertedCategory = data as any
      const mappedCategory: Category = {
        id: insertedCategory.id,
        name: insertedCategory.name,
        type: (insertedCategory.type === 'income' || insertedCategory.type === 'expense') ? insertedCategory.type : 'expense',
        user_id: insertedCategory.user_id || '',
        created_at: insertedCategory.created_at || new Date().toISOString(),
        updated_at: insertedCategory.updated_at || null,
      }
      set({ categories: [...categories, mappedCategory] })

      return { error: null }
    } catch (error) {
      return { error: 'Erro inesperado ao criar categoria' }
    }
  },

  updateCategory: async (id, updates) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { error: error.message }
      }

      // Update local state - mapeia para o tipo Category
      const { categories } = get()
      // Cast para any para acessar campos que podem não estar no tipo Row do Supabase
      const updatedCategory = data as any
      const mappedData: Category = {
        id: updatedCategory.id,
        name: updatedCategory.name,
        type: (updatedCategory.type === 'income' || updatedCategory.type === 'expense') ? updatedCategory.type : 'expense',
        user_id: updatedCategory.user_id || '',
        created_at: updatedCategory.created_at || new Date().toISOString(),
        updated_at: updatedCategory.updated_at || null,
      }
      const updatedCategories = categories.map(category => 
        category.id === id ? mappedData : category
      )
      set({ categories: updatedCategories })

      return { error: null }
    } catch (error) {
      return { error: 'Erro inesperado ao atualizar categoria' }
    }
  },

  deleteCategory: async (id) => {
    try {
      const supabase = createClient()
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
