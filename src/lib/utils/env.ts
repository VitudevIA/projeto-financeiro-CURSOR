/**
 * Gerenciamento de Ambientes
 * Dev, Staging, Production
 */

export type Environment = 'development' | 'staging' | 'production'

export function getEnvironment(): Environment {
  const env = process.env.NODE_ENV || 'development'
  
  if (env === 'production') {
    // Verificar se é staging pela URL
    const url = process.env.NEXT_PUBLIC_APP_URL || ''
    if (url.includes('staging') || url.includes('dev')) {
      return 'staging'
    }
    return 'production'
  }
  
  return env as Environment
}

export const ENV = getEnvironment()

export const isDevelopment = ENV === 'development'
export const isStaging = ENV === 'staging'
export const isProduction = ENV === 'production'

/**
 * Configurações por ambiente
 */
export const ENV_CONFIG = {
  development: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    enableDebug: true,
    enableAnalytics: false,
    logLevel: 'debug' as const,
  },
  staging: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || '',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    enableDebug: true,
    enableAnalytics: true,
    logLevel: 'info' as const,
  },
  production: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || '',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    enableDebug: false,
    enableAnalytics: true,
    logLevel: 'error' as const,
  },
} as const

export const config = ENV_CONFIG[ENV]

/**
 * Requer confirmação dupla em produção para ações destrutivas
 */
export function requiresDoubleConfirmation(): boolean {
  return isProduction || isStaging
}

/**
 * Log apenas em desenvolvimento/staging
 */
export function debugLog(...args: any[]): void {
  if (config.enableDebug) {
    console.log(`[${ENV}]`, ...args)
  }
}

