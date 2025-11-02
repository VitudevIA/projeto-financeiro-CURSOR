'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'

export function useUserDataSync() {
  const { user, syncUserData } = useAuthStore()

  useEffect(() => {
    if (user) {
      console.log('🔄 useUserDataSync: Usuário detectado, iniciando sincronização...')
      
      // Sincronizar dados quando o usuário é detectado
      syncUserData()
      
      // Sincronizar a cada 30 segundos (opcional)
      const interval = setInterval(() => {
        console.log('🔄 useUserDataSync: Sincronização automática...')
        syncUserData()
      }, 30000)
      
      return () => {
        console.log('🔄 useUserDataSync: Limpando intervalo...')
        clearInterval(interval)
      }
    }
  }, [user, syncUserData])

  return {
    forceSync: () => {
      if (user) {
        console.log('🔄 useUserDataSync: Sincronização forçada...')
        syncUserData()
      }
    }
  }
}