/**
 * Sanitização de Inputs
 * Proteção contra XSS e SQL Injection
 */

import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitiza string contra XSS
 */
export function sanitizeHTML(html: string): string {
  if (typeof window !== 'undefined') {
    return DOMPurify.sanitize(html)
  }
  
  // Server-side fallback
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Sanitiza string para uso em SQL (preparação de parametrização)
 */
export function sanitizeSQLInput(input: string): string {
  // Remove caracteres perigosos
  return input
    .replace(/['";\\]/g, '') // Remove aspas e ponto-e-vírgula
    .trim()
}

/**
 * Valida e sanitiza email
 */
export function sanitizeEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const sanitized = email.trim().toLowerCase()
  
  if (!emailRegex.test(sanitized)) {
    return null
  }
  
  // Limitar tamanho
  if (sanitized.length > 254) {
    return null
  }
  
  return sanitized
}

/**
 * Valida e sanitiza número
 */
export function sanitizeNumber(value: string | number): number | null {
  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) {
      return null
    }
    return value
  }
  
  const num = parseFloat(value)
  if (isNaN(num) || !isFinite(num)) {
    return null
  }
  
  return num
}

/**
 * Valida e sanitiza URL
 */
export function sanitizeURL(url: string): string | null {
  try {
    const parsed = new URL(url)
    
    // Permitir apenas HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }
    
    return parsed.toString()
  } catch {
    return null
  }
}

/**
 * Remove caracteres perigosos de string
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input
    .slice(0, maxLength)
    .replace(/[<>]/g, '')
    .trim()
}

