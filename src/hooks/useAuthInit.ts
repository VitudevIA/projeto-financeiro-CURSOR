'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'

/**
 * Hook para inicializar autenticação apenas uma vez
 * Evita loops de verificação causados por múltiplas chamadas
 */
export function useAuthInit(): void {
  const { checkAuth } = useAuthStore()
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      Promise.resolve().then(() => {
        checkAuth().catch((err) => {
          console.error('Erro ao inicializar autenticação:', err)
        })
      })
    }
  }, [checkAuth])
}
