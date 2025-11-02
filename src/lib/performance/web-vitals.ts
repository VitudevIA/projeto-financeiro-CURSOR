/**
 * Core Web Vitals Monitoring
 * LCP, INP (substitui FID), CLS, FCP, TTFB
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'

export interface WebVitalsReport {
  name: string
  value: number
  id: string
  rating: 'good' | 'needs-improvement' | 'poor'
}

/**
 * Envia métricas para analytics
 */
function sendToAnalytics(metric: WebVitalsReport) {
  // Enviar para Vercel Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    })
  }

  // Enviar para endpoint próprio (opcional)
  if (process.env.NEXT_PUBLIC_ANALYTICS_URL) {
    fetch(process.env.NEXT_PUBLIC_ANALYTICS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
      keepalive: true,
    }).catch((error) => {
      // Silenciar erros de analytics para não poluir o console
      // Analytics não é crítico para a funcionalidade da aplicação
      if (process.env.NODE_ENV === 'development') {
        console.debug('Analytics error (não crítico):', error)
      }
    })
  }
}

/**
 * Inicializa monitoramento de Web Vitals
 */
export function reportWebVitals() {
  if (typeof window === 'undefined') return

  onCLS(sendToAnalytics)
  onINP(sendToAnalytics) // INP substitui FID no Web Vitals v3+
  onLCP(sendToAnalytics)
  onFCP(sendToAnalytics)
  onTTFB(sendToAnalytics)
}

/**
 * Thresholds do Core Web Vitals
 */
export const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint (substitui FID)
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
}

/**
 * Classifica métrica conforme threshold
 */
export function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = WEB_VITALS_THRESHOLDS[name as keyof typeof WEB_VITALS_THRESHOLDS]
  if (!threshold) return 'good'

  if (value <= threshold.good) return 'good'
  if (value <= threshold.poor) return 'needs-improvement'
  return 'poor'
}

