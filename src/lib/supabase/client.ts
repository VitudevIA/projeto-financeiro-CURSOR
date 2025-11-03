import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

// Singleton para garantir apenas uma instância do cliente
let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Validação das variáveis de ambiente
  if (!supabaseUrl || !supabaseAnonKey) {
    const missingVars = []
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    throw new Error(
      `Variáveis de ambiente do Supabase não configuradas: ${missingVars.join(', ')}. ` +
      `Verifique se o arquivo .env.local existe e contém essas variáveis.`
    )
  }

  // Verifica se a URL ou chave mudaram (útil em desenvolvimento)
  // Se mudaram, recria o cliente
  if (clientInstance) {
    const currentUrl = (clientInstance as any).supabaseUrl
    const currentKey = (clientInstance as any).supabaseAnonKey
    
    if (currentUrl !== supabaseUrl || currentKey !== supabaseAnonKey) {
      clientInstance = null // Força recriação
    }
  }

  // Se já existe uma instância válida, retorna ela (singleton)
  if (clientInstance) {
    return clientInstance
  }

  // Cria nova instância apenas se não existir
  clientInstance = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'supabase-auth-token',
      },
    }
  )

  // Armazena referências para validação futura (desenvolvimento)
  if (typeof window !== 'undefined') {
    (clientInstance as any).supabaseUrl = supabaseUrl
    ;(clientInstance as any).supabaseAnonKey = supabaseAnonKey
  }

  return clientInstance
}