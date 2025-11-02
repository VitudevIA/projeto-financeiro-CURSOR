import { test, expect } from '@playwright/test'
import { loginUser } from './helpers/auth'

/**
 * Testes E2E do Dashboard
 * Validação de KPIs, gráficos e dados
 */

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page, browserName }) => {
    await loginUser(page, undefined, undefined, browserName)
  })

  test('deve carregar dashboard com KPIs', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Verificar títulos
    await expect(page.locator('h1')).toContainText('Dashboard')
    
    // Verificar KPIs (6 cards)
    const kpiCards = page.locator('[class*="card"]')
    await expect(kpiCards.first()).toBeVisible()
    
    // Verificar valores não são vazios
    const values = page.locator('text=/R\\$|%|dias/')
    await expect(values.first()).toBeVisible()
  })

  test('deve exibir gráficos quando há dados', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Verificar seção de gráficos
    await expect(page.locator('text=/Evolução dos Gastos|Distribuição por Categoria/')).toBeVisible()
  })

  test('deve atualizar KPIs após criar transação', async ({ page }) => {
    // Criar transação
    await page.goto('/transactions/new')
    await page.selectOption('select[name="type"]', 'expense')
    await page.fill('input[name="description"]', 'Teste KPI')
    await page.fill('input[name="amount"]', '200')
    await page.selectOption('select[name="category"]', '1')
    await page.click('button:has-text("Criar")')
    
    await page.waitForURL('/transactions')
    
    // Voltar ao dashboard
    await page.goto('/dashboard')
    
    // Verificar que KPIs foram atualizados (não são mais R$ 0,00)
    await expect(page.locator('text=/R\\$ [1-9]/')).toBeVisible({ timeout: 10000 })
  })

  test('deve exibir top 5 transações', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Verificar seção de top transações
    await expect(page.locator('text=/Top 5 Transações|Maiores gastos/')).toBeVisible()
  })
})

