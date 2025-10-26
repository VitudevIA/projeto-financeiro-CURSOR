import type { Database } from './supabase'

export type User = Database['public']['Tables']['users']['Row']
export type Card = Database['public']['Tables']['cards']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type Budget = Database['public']['Tables']['budgets']['Row']
export type Insight = Database['public']['Tables']['insights']['Row']