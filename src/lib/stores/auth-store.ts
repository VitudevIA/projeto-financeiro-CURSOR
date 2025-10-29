import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types/database.types'

interface UserPreferences {
  user_id: string
  dashboard_data: any
  updated_at: string
}

// Cria uma instância do cliente para o store
const supabase = createClient()

interface AuthState {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  updateProfile: (updates: Partial<User>) => Promise<{ error: string | null }>
  checkAuth: () => Promise<void>
  syncUserData: () => Promise<{ error: string | null }>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,

      signIn: async (email: string, password: string) => {
        try {
          set({ loading: true })
          
          // IMPORTANTE: signInWithPassword salva a sessão automaticamente nos cookies
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) {
            set({ loading: false })
            return { error: error.message }
          }

          if (data.user) {
            // Fetch user profile
            const { data: profile, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('id', data.user.id)
              .single()

            if (profileError) {
              set({ loading: false })
              return { error: 'Erro ao carregar perfil do usuário' }
            }

            set({ user: profile, loading: false })
            await get().syncUserData()

            return { error: null }
          }

          set({ loading: false })
          return { error: 'Erro ao fazer login' }
        } catch (error) {
          set({ loading: false })
          console.error('Erro no login:', error)
          return { error: 'Erro inesperado ao fazer login' }
        }
      },

      signUp: async (email: string, password: string, fullName: string) => {
        try {
          set({ loading: true })
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
              },
            },
          })

          if (error) {
            set({ loading: false })
            return { error: error.message }
          }

          if (data.user) {
            // Aguarda um pouco para o trigger criar o perfil
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Busca o perfil criado
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', data.user.id)
              .single()

            if (profile) {
              set({ user: profile, loading: false })
            } else {
              set({ loading: false })
            }
          }

          return { error: null }
        } catch (error) {
          set({ loading: false })
          return { error: 'Erro inesperado ao criar conta' }
        }
      },

      signOut: async () => {
        try {
          await supabase.auth.signOut()
          set({ user: null, loading: false })
        } catch (error) {
          console.error('Erro ao fazer logout:', error)
        }
      },

      resetPassword: async (email: string) => {
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          })

          if (error) {
            return { error: error.message }
          }

          return { error: null }
        } catch (error) {
          return { error: 'Erro inesperado ao enviar email de recuperação' }
        }
      },

      updateProfile: async (updates: Partial<User>) => {
        try {
          const { user } = get()
          if (!user) {
            return { error: 'Usuário não autenticado' }
          }

          const { error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', user.id)

          if (error) {
            return { error: error.message }
          }

          set({ user: { ...user, ...updates } })
          return { error: null }
        } catch (error) {
          return { error: 'Erro inesperado ao atualizar perfil' }
        }
      },

      checkAuth: async () => {
        try {
          set({ loading: true })
          const { data: { session } } = await supabase.auth.getSession()

          if (session?.user) {
            const { data: profile, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (error) {
              console.error('Erro ao carregar perfil:', error)
              set({ user: null, loading: false })
              return
            }

            set({ user: profile, loading: false })

            await get().syncUserData()
            
          } else {
            set({ user: null, loading: false })
          }
        } catch (error) {
          console.error('Erro ao verificar autenticação:', error)
          set({ user: null, loading: false })
        }
      },

            syncUserData: async () => {
        try {
          const { user } = get()
          if (!user) return { error: 'Usuário não autenticado' }

          console.log('🔄 syncUserData: Iniciando sincronização...')
          
          const supabase = createClient()
          
          // 1. Buscar dados do Supabase
          const { data: remoteData, error } = await supabase
            .from('user_preferences' as any)
            .select('*')
            .eq('user_id', user.id)
            .single()

          // 2. Verificar dados locais
          const localDashboardData = localStorage.getItem('dashboard-storage')
          
          if (!error && remoteData) {
            const localParsed = localDashboardData ? JSON.parse(localDashboardData) : null
            
            // Extrair dados de forma segura com type assertion
            const remoteUpdated = (remoteData as any).updated_at
            const remoteDashboardData = (remoteData as any).dashboard_data
            
            if (!localParsed || new Date(remoteUpdated) > new Date(localParsed.state?.updated_at || 0)) {
              // Dados remotos são mais recentes
              if (remoteDashboardData) {
                localStorage.setItem('dashboard-storage', JSON.stringify({
                  ...localParsed,
                  state: {
                    ...remoteDashboardData,
                    updated_at: remoteUpdated
                  }
                }))
                console.log('✅ syncUserData: Dados sincronizados DO Supabase')
              }
            } else if (localParsed && localParsed.state) {
              // Dados locais são mais recentes
              const { error: updateError } = await supabase
                .from('user_preferences' as any)
                .upsert({
                  user_id: user.id,
                  dashboard_data: localParsed.state,
                  updated_at: new Date().toISOString()
                } as any)
              
              if (!updateError) {
                console.log('✅ syncUserData: Dados salvos NO Supabase')
              }
            }
          } else if (localDashboardData) {
            // Primeira vez - salvar dados locais no Supabase
            const localParsed = JSON.parse(localDashboardData)
            if (localParsed.state) {
              const { error: updateError } = await supabase
                .from('user_preferences' as any)
                .upsert({
                  user_id: user.id,
                  dashboard_data: localParsed.state,
                  updated_at: new Date().toISOString()
                } as any)
              
              if (!updateError) {
                console.log('✅ syncUserData: Dados salvos no Supabase (primeira vez)')
              }
            }
          }

          return { error: null }
        } catch (error) {
          console.error('❌ syncUserData: Erro:', error)
          return { error: 'Erro ao sincronizar dados' }
        }
      }, // ✅ VÍRGULA AQUI
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
)