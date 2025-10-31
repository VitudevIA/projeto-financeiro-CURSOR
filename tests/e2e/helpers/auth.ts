import { Page } from '@playwright/test'

/**
 * Helper para fazer login nos testes
 * Adapta timeouts baseado no navegador
 */
export async function loginUser(
  page: Page,
  email: string = process.env.TEST_USER_EMAIL || 'victorfernandesexata@gmail.com',
  password: string = process.env.TEST_USER_PASSWORD || '12345678',
  browserName?: string
) {
  // Detectar mobile através do user agent
  const userAgent = await page.evaluate(() => navigator.userAgent)
  const isMobileUserAgent = /Mobile|Android|iPhone|iPad/.test(userAgent)
  const name = browserName || 'chromium'
  const isMobile = name === 'webkit' || isMobileUserAgent
  const selectorTimeout = isMobile ? 60000 : 30000
  const navigationTimeout = isMobile ? 90000 : 30000
  
  // Ir para login
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  
  // Aguardar campos estarem disponíveis
  await page.waitForSelector('input[type="email"]', { 
    state: 'visible',
    timeout: selectorTimeout 
  })
  
  // Aguardar carregamento (com fallback para mobile)
  try {
    await page.waitForLoadState('networkidle', { timeout: isMobile ? 10000 : 5000 })
  } catch {
    await page.waitForLoadState('domcontentloaded')
  }
  
  // Preencher e submeter (com timeout implícito da configuração do projeto)
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  
  // Aguardar redirecionamento para dashboard
  await page.waitForURL('/dashboard', { timeout: navigationTimeout })
  
  // Aguardar dashboard carregar
  try {
    await page.waitForLoadState('networkidle', { timeout: isMobile ? 15000 : 10000 })
  } catch {
    await page.waitForLoadState('domcontentloaded')
  }
}

