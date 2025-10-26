export type { Database } from '@/lib/supabase'

export type User = Database['public']['Tables']['users']['Row']
export type Card = Database['public']['Tables']['cards']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type Budget = Database['public']['Tables']['budgets']['Row']
export type Insight = Database['public']['Tables']['insights']['Row']

export type TransactionType = 'credit' | 'debit' | 'cash' | 'pix' | 'boleto'
export type CardType = 'credit' | 'debit'
export type InsightType = 'comparison' | 'prediction' | 'alert'
export type InsightSeverity = 'info' | 'warning' | 'critical'

export interface TransactionWithDetails extends Transaction {
  card?: Card | null
  category: Category
}

export interface DashboardKPIs {
  totalSpent: number
  dailyAverage: number
  monthlyProjection: number
  budgetUsedPercentage: number
  availableBalance: number
  daysOfReserve: number
}

export interface ChartData {
  name: string
  value: number
  color?: string
}

export interface TimeSeriesData {
  date: string
  amount: number
  label?: string
}
