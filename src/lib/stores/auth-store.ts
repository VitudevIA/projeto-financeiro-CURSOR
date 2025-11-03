import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'
import type { AppUser } from '../../types/user_types'

// Interface para user_preferences
interface UserPreferences {
  user_id: string
  dashboard_data: any // jsonb
  updated_at: string | null
}

interface AuthState {
  user: AppUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  updateProfile: (updates: Partial<AppUser>) => Promise<{ error: string | null }>
  checkAuth: () => Promise<void>
  syncUserData: () => Promise<{ error: string | null }>
}

const supabase = createClient()

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
        user: null,
        loading: false,

      signIn: async (email: string, password: string) => {
        try {
          set({ loading: true })
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) {
            set({ loading: false })
            console.error('Erro no login do Supabase:', {
              message: error.message,
              status: error.status,
              name: error.name
            })
            
            // Mensagens de erro mais específicas
            if (error.status === 401) {
              return { error: 'Email ou senha incorretos. Verifique suas credenciais.' }
            }
            if (error.message?.includes('Email not confirmed')) {
              return { error: 'Por favor, confirme seu email antes de fazer login. Verifique sua caixa de entrada.' }
            }
            if (error.message?.includes('Invalid login credentials')) {
              return { error: 'Email ou senha incorretos. Verifique suas credenciais.' }
            }
            
            return { error: error.message || 'Erro ao fazer login. Tente novamente.' }
          }

          if (data.user) {
            const { data: profile, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('id', data.user.id)
              .single()

            if (profileError) {
              set({ loading: false })
              return { error: 'Erro ao carregar perfil do usuário' }
            }

            if (profile) {
              set({ user: profile as AppUser, loading: false })
              await get().syncUserData()
              return { error: null }
            } else {
              set({ loading: false })
              return { error: 'Perfil do usuário não encontrado' }
            }
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
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', data.user.id)
              .single()

            if (profile) {
              set({ user: profile as AppUser, loading: false })
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
          // Limpa completamente o estado
          set({ user: null, loading: false })
          // Limpa o localStorage para evitar persistência de dados inválidos
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-storage')
          }
        } catch (error) {
          console.error('Erro ao fazer logout:', error)
          // Mesmo com erro, limpa o estado local
          set({ user: null, loading: false })
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth-storage')
          }
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

      updateProfile: async (updates: Partial<AppUser>) => {
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
          const currentState = get()
          // Evita múltiplas chamadas simultâneas
          if (currentState.loading) {
            return
          }
          
          set({ loading: true })
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()

          if (sessionError) {
            console.error('Erro ao obter sessão:', sessionError)
            set({ user: null, loading: false })
            return
          }

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

            if (profile) {
              set({ user: profile as AppUser, loading: false })
              // Sync não bloqueia
              get().syncUserData().catch(console.error)
            } else {
              set({ user: null, loading: false })
            }
          } else {
            // Não há sessão, limpa o estado
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

          const supabase = createClient()
          
          // ✅ CORREÇÃO: Tipagem explícita para user_preferences
          const { data: remoteData, error } = await supabase
            .from('user_preferences' as any)
            .select('*')
            .eq('user_id', user.id)
            .single() as { data: UserPreferences | null, error: any }

          const localDashboardData = localStorage.getItem('dashboard-storage')
          
          if (!error && remoteData) {
            const localParsed = localDashboardData ? JSON.parse(localDashboardData) : null
            
            if (!localParsed || !remoteData.updated_at || new Date(remoteData.updated_at) > new Date(localParsed.state?.updated_at || 0)) {
              if (remoteData.dashboard_data) {
                localStorage.setItem('dashboard-storage', JSON.stringify({
                  ...localParsed,
                  state: {
                    ...remoteData.dashboard_data,
                    updated_at: remoteData.updated_at
                  }
                }))
              }
            } else if (localParsed && localParsed.state) {
              // ✅ CORREÇÃO: Tipagem explícita no upsert
              await supabase
                .from('user_preferences' as any)
                .upsert({
                  user_id: user.id,
                  dashboard_data: localParsed.state,
                  updated_at: new Date().toISOString()
                } as any)
            }
          } else if (localDashboardData) {
            const localParsed = JSON.parse(localDashboardData)
            if (localParsed.state) {
              // ✅ CORREÇÃO: Tipagem explícita no upsert
              await supabase
                .from('user_preferences' as any)
                .upsert({
                  user_id: user.id,
                  dashboard_data: localParsed.state,
                  updated_at: new Date().toISOString()
                } as any)
            }
          }

          return { error: null }
        } catch (error) {
          console.error('Erro na sincronização:', error)
          return { error: 'Erro ao sincronizar dados' }
        }
      },
    }),
    {
      name: 'auth-storage',
      // Só persiste o user, não o loading (evita loops)
      partialize: (state) => ({ 
        user: state.user 
      }),
      // Limpa o estado após hidratação se não houver usuário válido
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Sempre inicia com loading false após hidratação
          state.loading = false
          // O checkAuth será chamado depois para verificar se há sessão válida
        }
      },
    }
  )
)