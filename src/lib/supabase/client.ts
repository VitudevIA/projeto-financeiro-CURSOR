import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

// Singleton para garantir apenas uma instância do cliente
let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

// Mutex para evitar múltiplos refreshes simultâneos
let refreshInProgress = false
let refreshPromise: Promise<any> | null = null

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
        // Adiciona tratamento de erro para refresh token
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        // Evita múltiplos refreshes simultâneos
        flowType: 'pkce',
      },
    }
  )
  
  // Intercepta erros de refresh token para tratamento silencioso
  if (typeof window !== 'undefined') {
    // Adiciona listener para erros de autenticação
    clientInstance.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        // Token foi atualizado com sucesso
        refreshInProgress = false
        refreshPromise = null
        console.debug('Token atualizado com sucesso')
      } else if (event === 'SIGNED_OUT') {
        // Limpa localStorage quando há sign out
        refreshInProgress = false
        refreshPromise = null
        try {
          localStorage.removeItem('auth-storage')
        } catch (e) {
          // Ignora erros de localStorage
        }
      } else if (event === 'SIGNED_IN') {
        refreshInProgress = false
        refreshPromise = null
      }
    })
    
    // Intercepta erros de refresh token globalmente
    // Cria um proxy para interceptar chamadas de getSession e getUser
    const originalAuth = clientInstance.auth
    
    // Intercepta getSession
    const originalGetSession = originalAuth.getSession.bind(originalAuth)
    originalAuth.getSession = async () => {
      try {
        // Se já está em progresso, aguarda o refresh atual
        if (refreshInProgress && refreshPromise) {
          await refreshPromise
        }
        
        const result = await originalGetSession()
        
        // Se há erro de refresh token já usado, limpa a sessão silenciosamente
        if (result.error && 
            (result.error.message?.includes('refresh_token_already_used') || 
             (result.error as any).code === 'refresh_token_already_used' ||
             result.error.status === 400)) {
          
          // Limpa sessão silenciosamente (sem logs)
          if (!refreshInProgress) {
            refreshInProgress = true
            refreshPromise = originalAuth.signOut().catch(() => {
              refreshInProgress = false
              refreshPromise = null
            })
            
            // Limpa localStorage silenciosamente
            try {
              localStorage.removeItem('auth-storage')
              localStorage.removeItem('supabase.auth.token')
            } catch (e) {
              // Ignora erros
            }
          }
          
          // Retorna sessão vazia sem erro (para não quebrar o fluxo)
          return { data: { session: null }, error: null }
        }
        
        return result
      } catch (error: any) {
        // Trata erros de refresh token já usado silenciosamente
        if (error?.message?.includes('refresh_token_already_used') || 
            error?.code === 'refresh_token_already_used' ||
            error?.status === 400) {
          
          if (!refreshInProgress) {
            refreshInProgress = true
            refreshPromise = originalAuth.signOut().catch(() => {
              refreshInProgress = false
              refreshPromise = null
            })
            
            try {
              localStorage.removeItem('auth-storage')
              localStorage.removeItem('supabase.auth.token')
            } catch (e) {
              // Ignora erros
            }
          }
          
          // Retorna sessão vazia sem erro
          return { data: { session: null }, error: null }
        }
        
        throw error
      }
    }
    
    // Intercepta getUser também (usado no middleware)
    // NOTA: Não sobrescrevemos getUser para evitar problemas de tipo
    // O tratamento de erro será feito no middleware e auth-store
  }

  // Armazena referências para validação futura (desenvolvimento)
  if (typeof window !== 'undefined') {
    (clientInstance as any).supabaseUrl = supabaseUrl
    ;(clientInstance as any).supabaseAnonKey = supabaseAnonKey
  }

  return clientInstance
}