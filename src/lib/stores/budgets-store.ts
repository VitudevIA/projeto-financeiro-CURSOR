import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth-store'
import type { Budget, BudgetWithCategory } from '@/types/database.types'
import { getCurrentMesReferencia, isValidMesReferencia } from '@/utils/mes-referencia'

interface BudgetsStore {
  budgets: BudgetWithCategory[]
  mesReferencia: string | null
  loading: boolean
  error: string | null
  /** @param mesReferencia Mês de competência no formato YYYY-MM (seletor da UI) */
  fetchBudgets: (mesReferencia?: string) => Promise<void>
  addBudget: (budget: {
    category_id: string
    month: string
    limit_amount: number
    alert_percentage: number | null
  }) => Promise<void>
  updateBudget: (id: string, updates: Partial<Budget>) => Promise<void>
  deleteBudget: (id: string) => Promise<void>
}

function normalizeMesReferencia(input?: string): string {
  if (input && isValidMesReferencia(input)) {
    return input
  }
  if (input && /^\d{4}-\d{2}-\d{2}/.test(input)) {
    const candidate = input.slice(0, 7)
    if (isValidMesReferencia(candidate)) return candidate
  }
  return getCurrentMesReferencia()
}

function monthDateFromMesReferencia(mesReferencia: string): string {
  return `${mesReferencia}-01`
}

function ensureNumber(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

async function resolveUserId(): Promise<string> {
  const authState = useAuthStore.getState()
  if (authState.user?.id) return authState.user.id

  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) {
    throw new Error('Usuário não autenticado')
  }
  return session.user.id
}

async function fetchSpentByCategory(
  mesReferencia: string,
  userId: string,
  categoryIds: string[]
): Promise<Map<string, number>> {
  const spentByCategory = new Map<string, number>()
  if (categoryIds.length === 0) return spentByCategory

  const supabase = createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('category_id, amount')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('mes_referencia', mesReferencia)
    .in('category_id', categoryIds)

  if (error) throw error

  for (const row of data ?? []) {
    const categoryId = row.category_id as string
    const current = spentByCategory.get(categoryId) ?? 0
    spentByCategory.set(categoryId, current + ensureNumber(row.amount))
  }

  return spentByCategory
}

function attachConsumption(
  budgets: BudgetWithCategory[],
  spentByCategory: Map<string, number>
): BudgetWithCategory[] {
  return budgets.map((budget) => {
    const spent = spentByCategory.get(budget.category_id) ?? 0
    const usagePercentage =
      budget.limit_amount > 0
        ? Number(((spent / budget.limit_amount) * 100).toFixed(1))
        : 0

    return {
      ...budget,
      spent_amount: Number(spent.toFixed(2)),
      usage_percentage: usagePercentage,
    }
  })
}

export const useBudgetsStore = create<BudgetsStore>((set) => ({
  budgets: [],
  mesReferencia: null,
  loading: false,
  error: null,

  fetchBudgets: async (mesReferenciaInput?: string) => {
    const targetMesReferencia = normalizeMesReferencia(mesReferenciaInput)
    const monthStart = monthDateFromMesReferencia(targetMesReferencia)

    set({ loading: true, error: null, mesReferencia: targetMesReferencia })
    try {
      const supabase = createClient()
      const userId = await resolveUserId()

      let query = supabase
        .from('budgets')
        .select(`
          *,
          categories (
            id,
            name,
            type
          )
        `)
        .eq('user_id', userId)
        .gte('month', monthStart)
        .lt('month', getNextMonth(monthStart))

      const { data, error } = await query.order('month', { ascending: false })

      if (error) throw error

      const budgets = (data ?? []) as unknown as BudgetWithCategory[]
      const categoryIds = [...new Set(budgets.map((b) => b.category_id))]
      const spentByCategory = await fetchSpentByCategory(
        targetMesReferencia,
        userId,
        categoryIds
      )

      set({
        budgets: attachConsumption(budgets, spentByCategory),
        mesReferencia: targetMesReferencia,
      })
    } catch (error) {
      set({ error: (error as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  addBudget: async (budget: {
    category_id: string
    month: string
    limit_amount: number
    alert_percentage: number | null
  }) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('budgets')
        .insert([budget as never])
        .select()
        .single()

      if (error) throw error

      const created = data as unknown as BudgetWithCategory
      set((state) => ({
        budgets: [created, ...state.budgets],
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  updateBudget: async (id: string, updates: Partial<Budget>) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('budgets')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const updated = data as unknown as BudgetWithCategory
      set((state) => ({
        budgets: state.budgets.map((b) =>
          b.id === id ? { ...b, ...updated } : b
        ),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  deleteBudget: async (id: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('budgets').delete().eq('id', id)

      if (error) throw error

      set((state) => ({
        budgets: state.budgets.filter((b) => b.id !== id),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },
}))

function getNextMonth(month: string): string {
  const date = new Date(month)
  date.setMonth(date.getMonth() + 1)
  return date.toISOString().split('T')[0]
}
