import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ✅ CORREÇÃO: Verificação mais robusta
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase: Missing environment variables, running in mock mode')
}

// ✅ IMPORTANTE: Singleton - criar apenas UMA instância
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null

const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      auth: {
        signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        signOut: () => Promise.resolve({ error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        resetPasswordForEmail: () => Promise.resolve({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
            then: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
          }),
          gte: () => ({
            lte: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
          }),
          then: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
          })
        }),
        update: () => ({
          eq: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
        }),
        delete: () => ({
          eq: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
        })
      })
    } as any
  }

  // ✅ Retorna a mesma instância (Singleton)
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'supabase-auth-token', // ✅ Chave única para evitar conflitos
      }
    })
  }

  return supabaseInstance
}

export const supabase = getSupabaseClient()