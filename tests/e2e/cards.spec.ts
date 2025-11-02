import { test, expect } from '@playwright/test'
import { loginUser } from './helpers/auth'

/**
 * Testes E2E de Cartões
 */

test.describe('Cartões', () => {
  test.beforeEach(async ({ page, browserName }) => {
    await loginUser(page, undefined, undefined, browserName)
  })

  test('deve criar cartão de crédito', async ({ page }) => {
    await page.goto('/cards/new')
    
    await page.fill('input[name="name"]', 'Teste Cartão')
    await page.selectOption('select[name="type"]', 'credit')
    await page.fill('input[name="brand"]', 'Mastercard')
    await page.fill('input[name="last_digits"]', '1234')
    await page.fill('input[name="limit"]', '5000')
    
    await page.click('button:has-text("Salvar")')
    
    await expect(page).toHaveURL('/cards')
    await expect(page.locator('text=Teste Cartão')).toBeVisible()
  })

  test('deve validar limite para cartão de crédito', async ({ page }) => {
    await page.goto('/cards/new')
    
    await page.fill('input[name="name"]', 'Teste')
    await page.selectOption('select[name="type"]', 'credit')
    
    // Tentar salvar sem limite
    await page.click('button:has-text("Salvar")')
    
    // Deve mostrar erro
    await expect(page.locator('text=/limite/i')).toBeVisible({ timeout: 5000 })
  })

  test('deve listar cartões', async ({ page }) => {
    await page.goto('/cards')
    
    await expect(page.locator('h1')).toContainText('Cartões')
  })
})

