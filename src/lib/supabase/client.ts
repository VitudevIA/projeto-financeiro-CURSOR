import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

// Singleton para garantir apenas uma instância do cliente
let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  // Se já existe uma instância, retorna ela (singleton)
  if (clientInstance) {
    return clientInstance
  }

  // Cria nova instância apenas se não existir
  clientInstance = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'supabase-auth-token',
      },
    }
  )

  return clientInstance
}