'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'

/**
 * Hook para inicializar autenticação apenas uma vez
 * Evita loops de verificação causados por múltiplas chamadas
 */
export function useAuthInit() {
  const { checkAuth } = useAuthStore()
  const hasInitialized = useRef(false)

  useEffect(() => {
    // Garante que só inicializa uma única vez
    if (!hasInitialized.current) {
      hasInitialized.current = true
      // Chama checkAuth de forma assíncrona sem bloquear
      Promise.resolve().then(() => {
        checkAuth().catch((err) => {
          // Erros são silenciosamente tratados
          console.error('Erro ao inicializar autenticação:', err)
        })
      })
    }
  }, [checkAuth])
  
  return hasInitialized.current
}

