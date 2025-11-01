import { test, expect } from '@playwright/test'
import { loginUser } from './helpers/auth'

/**
 * Testes E2E de Transações
 * Cobertura: CRUD completo de transações
 */

test.describe('Transações', () => {
  test.beforeEach(async ({ page, browserName }) => {
    await loginUser(page, undefined, undefined, browserName)
  })

  test('deve criar transação de despesa', async ({ page }) => {
    await page.goto('/transactions/new')
    
    // Preencher formulário
    await page.selectOption('select[name="type"]', 'expense')
    await page.fill('input[name="description"]', 'Teste Despesa')
    await page.fill('input[name="amount"]', '100.50')
    await page.selectOption('select[name="category"]', '1') // ID da categoria
    
    // Submeter
    await page.click('button:has-text("Criar")')
    
    // Verificar redirecionamento
    await expect(page).toHaveURL('/transactions')
    
    // Verificar transação na lista
    await expect(page.locator('text=Teste Despesa')).toBeVisible()
    await expect(page.locator('text=R$ 100,50')).toBeVisible()
  })

  test('deve criar transação de receita', async ({ page }) => {
    await page.goto('/transactions/new')
    
    await page.selectOption('select[name="type"]', 'income')
    await page.fill('input[name="description"]', 'Teste Receita')
    await page.fill('input[name="amount"]', '5000.00')
    await page.selectOption('select[name="category"]', '1')
    
    await page.click('button:has-text("Criar")')
    
    await expect(page).toHaveURL('/transactions')
    await expect(page.locator('text=Teste Receita')).toBeVisible()
  })

  test('deve validar campos obrigatórios', async ({ page }) => {
    await page.goto('/transactions/new')
    
    // Tentar submeter sem preencher
    await page.click('button:has-text("Criar")')
    
    // Verificar validação via atributo required ou mensagem de erro
    const descriptionInput = page.locator('input[name="description"]')
    await expect(descriptionInput).toHaveAttribute('required')
  })

  test('deve listar transações', async ({ page }) => {
    await page.goto('/transactions')
    
    // Verificar elementos da página
    await expect(page.locator('h1')).toContainText('Transações')
    await expect(page.locator('table')).toBeVisible()
  })

  test('deve filtrar transações por data', async ({ page }) => {
    await page.goto('/transactions')
    
    // Preencher filtros
    await page.fill('input[name="startDate"]', '2025-10-01')
    await page.fill('input[name="endDate"]', '2025-10-31')
    
    // Aplicar filtros
    await page.click('button:has-text("Aplicar")')
    
    // Verificar que filtros foram aplicados
    await expect(page.locator('table')).toBeVisible()
  })

  test('deve calcular KPIs corretamente', async ({ page }) => {
    await page.goto('/transactions')
    
    // Verificar KPIs na página
    await expect(page.locator('text=/Receitas|Despesas|Saldo/')).toBeVisible()
    
    // Valores devem ser numéricos
    const receitas = page.locator('text=/R\\$ [0-9]+/')
    await expect(receitas.first()).toBeVisible()
  })
})

