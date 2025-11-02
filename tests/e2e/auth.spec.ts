import { test, expect } from '@playwright/test'

/**
 * Testes E2E de Autenticação
 * Cobertura: Login, Logout, Signup, Recuperação de Senha
 */

test.describe('Autenticação', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'Test123!@#',
    name: 'Test User'
  }

  test.beforeEach(async ({ page, browserName }) => {
    // Timeout adaptativo para diferentes navegadores
    const userAgent = await page.evaluate(() => navigator.userAgent).catch(() => '')
    const isMobileUserAgent = /Mobile|Android|iPhone|iPad/.test(userAgent)
    const isMobile = browserName === 'webkit' || isMobileUserAgent
    const selectorTimeout = isMobile ? 60000 : 30000
    
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    
    // Aguardar elemento estar disponível
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
  })

  test('deve fazer login com credenciais válidas', async ({ page, browserName }) => {
    // Preencher formulário
    await page.locator('input[type="email"]').fill(testUser.email)
    await page.locator('input[type="password"]').fill(testUser.password)
    
    // Submeter
    await page.locator('button[type="submit"]').click()
    
    // Verificar redirecionamento (com timeout maior para login)
    const userAgent = await page.evaluate(() => navigator.userAgent).catch(() => '')
    const isMobileUserAgent = /Mobile|Android|iPhone|iPad/.test(userAgent)
    const isMobile = browserName === 'webkit' || isMobileUserAgent
    await expect(page).toHaveURL('/dashboard', { timeout: isMobile ? 60000 : 30000 })
    
    // Verificar elementos do dashboard
    await expect(page.locator('h1, h2')).toContainText(/dashboard/i, { timeout: isMobile ? 30000 : 15000 })
  })

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.locator('input[type="email"]').fill('invalid@email.com')
    await page.locator('input[type="password"]').fill('wrongpassword')
    await page.locator('button[type="submit"]').click()
    
    // Verificar mensagem de erro (pode estar em toast ou na página)
    await expect(
      page.locator('text=/email ou senha|credenciais|inválid/i')
    ).toBeVisible({ timeout: 5000 })
  })

  test('deve fazer logout corretamente', async ({ page }) => {
    // Login primeiro
    await page.locator('input[type="email"]').fill(testUser.email)
    await page.locator('input[type="password"]').fill(testUser.password)
    await page.locator('button[type="submit"]').click()
    
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 })
    
    // Logout - procurar botão de sair (pode estar em menu dropdown)
    const logoutButton = page.locator('button:has-text("Sair"), button:has-text("Logout"), [aria-label*="sair" i]').first()
    await logoutButton.click({ timeout: 5000 })
    
    // Verificar redirecionamento
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
    
    // Tentar acessar dashboard (deve redirecionar)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  })

  test('deve proteger rotas autenticadas', async ({ page }) => {
    // Tentar acessar dashboard sem login
    await page.goto('/dashboard')
    
    // Deve redirecionar para login
    await expect(page).toHaveURL(/\/login/)
    
    // Tentar acessar transações
    await page.goto('/transactions')
    await expect(page).toHaveURL(/\/login/)
  })

  test('deve validar campos obrigatórios no login', async ({ page }) => {
    // Tentar submeter sem preencher
    await page.locator('button[type="submit"]').click()
    
    // Verificar validação HTML5 via atributo
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    
    // Verificar que os campos têm atributo required
    await expect(emailInput).toHaveAttribute('required', '')
    await expect(passwordInput).toHaveAttribute('required', '')
    
    // Verificar que os campos têm aria-required
    await expect(emailInput).toHaveAttribute('aria-required', 'true')
    await expect(passwordInput).toHaveAttribute('aria-required', 'true')
  })
})

