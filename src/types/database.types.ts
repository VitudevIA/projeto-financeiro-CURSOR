export interface Budget {
  id: string
  user_id: string
  category_id: string
  month: string // date no formato ISO
  limit_amount: number
  alert_percentage: number | null
  created_at: string
  updated_at: string | null
}

export interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  user_id: string
  created_at: string
  updated_at: string | null
}

export interface Transaction {
  id: string
  user_id: string
  category_id: string
  amount: number
  description: string
  transaction_date: string
  type: 'income' | 'expense'
  created_at: string
  updated_at: string | null
}

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  created_at: string
  updated_at: string | null
}

// Tipos para joins e relações
export interface BudgetWithCategory extends Budget {
  categories: Category
}

export interface TransactionWithCategory extends Transaction {
  categories: Category
}

// Tipos para inserção (sem id e timestamps)
export type BudgetInsert = Omit<Budget, 'id' | 'created_at' | 'updated_at'>
export type CategoryInsert = Omit<Category, 'id' | 'created_at' | 'updated_at'>
export type TransactionInsert = Omit<Transaction, 'id' | 'created_at' | 'updated_at'>

// Tipos para atualização (sem campos obrigatórios)
export type BudgetUpdate = Partial<Omit<Budget, 'id' | 'user_id' | 'created_at'>>
export type CategoryUpdate = Partial<Omit<Category, 'id' | 'user_id' | 'created_at'>>
export type TransactionUpdate = Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at'>>

// Database types para o Supabase (se estiver usando a geração automática)
export interface Database {
  public: {
    Tables: {
      budgets: {
        Row: Budget
        Insert: BudgetInsert
        Update: BudgetUpdate
      }
      categories: {
        Row: Category
        Insert: CategoryInsert
        Update: CategoryUpdate
      }
      transactions: {
        Row: Transaction
        Insert: TransactionInsert
        Update: TransactionUpdate
      }
      users: {
        Row: User
        Insert: User
        Update: Partial<User>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}