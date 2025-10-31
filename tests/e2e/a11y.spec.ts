import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

/**
 * Testes de Acessibilidade (WCAG AA)
 */

test.describe('Acessibilidade', () => {
  test.beforeEach(async ({ page, browserName }) => {
    // Timeout maior para navegadores móveis e WebKit
    // Detectar mobile através do user agent
    const userAgent = await page.evaluate(() => navigator.userAgent).catch(() => '')
    const isMobileUserAgent = /Mobile|Android|iPhone|iPad/.test(userAgent)
    const isMobile = browserName === 'webkit' || isMobileUserAgent
    const selectorTimeout = isMobile ? 60000 : 30000
    
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    
    // Aguardar elemento estar disponível com timeout adaptativo
    await page.waitForSelector('input[type="email"]', { 
      state: 'visible', 
      timeout: selectorTimeout 
    })
    
    // Aguardar carregamento completo (mas não bloquear em networkidle que pode ser lento em mobile)
    try {
      await page.waitForLoadState('networkidle', { timeout: isMobile ? 10000 : 5000 })
    } catch {
      // Se networkidle demorar muito, apenas esperar domcontentloaded
      await page.waitForLoadState('domcontentloaded')
    }
    
    await injectAxe(page)
  })

  test('deve atender padrões WCAG AA na página de login', async ({ page }) => {
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true }
    })
  })

  test('deve navegar por teclado na página de login', async ({ page }) => {
    // Aguardar página carregar completamente
    await page.waitForLoadState('networkidle')
    
    // Tab navigation - pode começar em link de signup, então pressionamos Tab até chegar ao email
    // Primeiro, focar manualmente no input de email se necessário
    await page.locator('input[type="email"]').focus()
    await expect(page.locator('input[type="email"]')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.locator('input[type="password"]')).toBeFocused()
    
    // Há um link "Esqueceu sua senha?" entre o password e o botão
    await page.keyboard.press('Tab')
    // Verificar se o link ou o botão estão focados (depende da ordem de tabindex)
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    // Pode ser link (A) ou button, ambos são aceitáveis
    expect(['A', 'BUTTON']).toContain(focusedElement)
    
    // Se for o link, pressionar Tab novamente para chegar ao botão
    if (focusedElement === 'A') {
      await page.keyboard.press('Tab')
    }
    await expect(page.locator('button[type="submit"]')).toBeFocused()
  })

  test('deve ter ARIA labels adequados', async ({ page }) => {
    // Aguardar página carregar completamente
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('input[type="email"]', { state: 'visible' })
    
    // Verificar labels
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toHaveAttribute('aria-label', /.+/)
    
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()
    await expect(passwordInput).toHaveAttribute('aria-label', /.+/)
  })

  test('deve ter contraste adequado', async ({ page }) => {
    // Verificar contraste de cores
    await checkA11y(page)
    // O axe-playwright já verifica contraste automaticamente
  })
})

