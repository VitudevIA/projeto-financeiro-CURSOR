/**
 * Rate Limiter - Proteção contra ataques DDoS e brute force
 * Implementação usando sliding window algorithm
 */

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  keyGenerator?: (req: Request) => string
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

class RateLimiter {
  private store: RateLimitStore = {}
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
    
    // Limpar store periodicamente
    setInterval(() => this.cleanup(), config.windowMs)
  }

  /**
   * Verifica se a requisição está dentro do limite
   */
  async check(identifier: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now()
    const key = identifier
    
    // Buscar ou criar entrada
    if (!this.store[key] || this.store[key].resetTime < now) {
      this.store[key] = {
        count: 0,
        resetTime: now + this.config.windowMs
      }
    }

    const entry = this.store[key]
    
    // Incrementar contador
    entry.count++
    
    const allowed = entry.count <= this.config.maxRequests
    const remaining = Math.max(0, this.config.maxRequests - entry.count)
    
    return {
      allowed,
      remaining,
      resetTime: entry.resetTime
    }
  }

  /**
   * Limpar entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now()
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key]
      }
    })
  }

  /**
   * Resetar limite para uma chave específica
   */
  reset(identifier: string): void {
    delete this.store[identifier]
  }
}

// Instâncias para diferentes endpoints
export const authRateLimiter = new RateLimiter({
  maxRequests: 5, // 5 tentativas
  windowMs: 15 * 60 * 1000, // 15 minutos
})

export const apiRateLimiter = new RateLimiter({
  maxRequests: 100, // 100 requisições
  windowMs: 60 * 1000, // 1 minuto
})

export const createRateLimiter = (config: RateLimitConfig) => new RateLimiter(config)

