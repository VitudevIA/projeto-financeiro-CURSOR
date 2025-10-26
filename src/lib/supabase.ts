import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          full_name: string | null
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      cards: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'credit' | 'debit'
          brand: string | null
          last_digits: string | null
          limit_amount: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'credit' | 'debit'
          brand?: string | null
          last_digits?: string | null
          limit_amount?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'credit' | 'debit'
          brand?: string | null
          last_digits?: string | null
          limit_amount?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string | null
          name: string
          icon: string | null
          color: string | null
          is_system: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          icon?: string | null
          color?: string | null
          is_system?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          icon?: string | null
          color?: string | null
          is_system?: boolean
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          card_id: string | null
          category_id: string
          type: 'credit' | 'debit' | 'cash' | 'pix' | 'boleto'
          amount: number
          description: string
          transaction_date: string
          is_recurring: boolean
          recurring_type: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          card_id?: string | null
          category_id: string
          type: 'credit' | 'debit' | 'cash' | 'pix' | 'boleto'
          amount: number
          description: string
          transaction_date: string
          is_recurring?: boolean
          recurring_type?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          card_id?: string | null
          category_id?: string
          type?: 'credit' | 'debit' | 'cash' | 'pix' | 'boleto'
          amount?: number
          description?: string
          transaction_date?: string
          is_recurring?: boolean
          recurring_type?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category_id: string
          month: string
          limit_amount: number
          alert_percentage: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          month: string
          limit_amount: number
          alert_percentage?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          month?: string
          limit_amount?: number
          alert_percentage?: number
          created_at?: string
          updated_at?: string
        }
      }
      insights: {
        Row: {
          id: string
          user_id: string
          type: 'comparison' | 'prediction' | 'alert'
          message: string
          severity: 'info' | 'warning' | 'critical'
          generated_at: string
          is_read: boolean
        }
        Insert: {
          id?: string
          user_id: string
          type: 'comparison' | 'prediction' | 'alert'
          message: string
          severity: 'info' | 'warning' | 'critical'
          generated_at?: string
          is_read?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'comparison' | 'prediction' | 'alert'
          message?: string
          severity?: 'info' | 'warning' | 'critical'
          generated_at?: string
          is_read?: boolean
        }
      }
    }
  }
}
