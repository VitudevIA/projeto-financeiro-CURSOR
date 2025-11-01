'use client'

import { useEffect } from 'react'
import { reportWebVitals } from '@/lib/performance/web-vitals'

/**
 * Componente client-side para reportar Web Vitals
 */
export function WebVitalsReporter() {
  useEffect(() => {
    reportWebVitals()
  }, [])

  return null
}

