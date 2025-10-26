import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface Plan {
  id: string
  name: string
  price: number
  transaction_limit: number
  features: string[]
  is_popular?: boolean
}

export interface UserPlan {
  plan_id: string
  transaction_count: number
  is_active: boolean
  expires_at?: string
}

interface PlansState {
  plans: Plan[]
  userPlan: UserPlan | null
  loading: boolean
  fetchPlans: () => Promise<void>
  fetchUserPlan: () => Promise<void>
  checkTransactionLimit: () => Promise<{ canAdd: boolean; remaining: number }>
  incrementTransactionCount: () => Promise<void>
}

const DEFAULT_PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Gratuito',
    price: 0,
    transaction_limit: 100,
    features: [
      'Até 100 transações por mês',
      'Dashboard básico',
      'Categorias personalizadas',
      'Exportação CSV/JSON',
      'Suporte por email'
    ]
  },
  {
    id: 'basic',
    name: 'Básico',
    price: 9.90,
    transaction_limit: 1000,
    features: [
      'Até 1.000 transações por mês',
      'Dashboard completo com gráficos',
      'Sistema de orçamentos',
      'Insights automáticos',
      'Exportação PDF',
      'Suporte prioritário'
    ],
    is_popular: true
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 19.90,
    transaction_limit: -1, // Ilimitado
    features: [
      'Transações ilimitadas',
      'Todas as funcionalidades do Básico',
      'Relatórios avançados',
      'Integração com bancos',
      'Suporte 24/7',
      'API personalizada'
    ]
  }
]

export const usePlansStore = create<PlansState>((set, get) => ({
  plans: DEFAULT_PLANS,
  userPlan: null,
  loading: false,

  fetchPlans: async () => {
    // Por enquanto, usar planos hardcoded
    // No futuro, buscar do banco de dados
    set({ plans: DEFAULT_PLANS })
  },

  fetchUserPlan: async () => {
    set({ loading: true })
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        set({ userPlan: null, loading: false })
        return
      }

      // Buscar plano do usuário na tabela users
      const { data: userData, error } = await supabase
        .from('users')
        .select('plan, transaction_count')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Erro ao buscar plano do usuário:', error)
        set({ userPlan: null, loading: false })
        return
      }

      const userPlan: UserPlan = {
        plan_id: userData.plan || 'free',
        transaction_count: userData.transaction_count || 0,
        is_active: true
      }

      set({ userPlan, loading: false })
    } catch (error) {
      console.error('Erro inesperado ao buscar plano:', error)
      set({ userPlan: null, loading: false })
    }
  },

  checkTransactionLimit: async () => {
    const { userPlan, plans } = get()
    
    if (!userPlan) {
      return { canAdd: false, remaining: 0 }
    }

    const currentPlan = plans.find(p => p.id === userPlan.plan_id)
    
    if (!currentPlan) {
      return { canAdd: false, remaining: 0 }
    }

    // Se o limite é -1, é ilimitado
    if (currentPlan.transaction_limit === -1) {
      return { canAdd: true, remaining: -1 }
    }

    const remaining = currentPlan.transaction_limit - userPlan.transaction_count
    return { canAdd: remaining > 0, remaining: Math.max(0, remaining) }
  },

  incrementTransactionCount: async () => {
    const { userPlan } = get()
    
    if (!userPlan) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { error } = await supabase
        .from('users')
        .update({ 
          transaction_count: userPlan.transaction_count + 1 
        })
        .eq('id', user.id)

      if (error) {
        console.error('Erro ao incrementar contador de transações:', error)
        return
      }

      // Atualizar estado local
      set((state) => ({
        userPlan: state.userPlan ? {
          ...state.userPlan,
          transaction_count: state.userPlan.transaction_count + 1
        } : null
      }))
    } catch (error) {
      console.error('Erro inesperado ao incrementar contador:', error)
    }
  },
}))
