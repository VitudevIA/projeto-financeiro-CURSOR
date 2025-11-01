import { useEffect, useCallback, useMemo } from 'react'
import { useUserPreferencesStore } from '@/lib/stores/user-preferences-store'
import { useTransactionsStore } from '@/lib/stores/transactions-store'
import type { Transaction } from '@/types/database.types'

export interface UseLastPreferencesReturn {
  lastCategoryId: string | null
  lastPaymentMethod: 'credit' | 'debit' | 'cash' | 'pix' | 'boleto' | null
  lastCardId: string | null
  suggestedCategory: (type: 'income' | 'expense') => string | null
  suggestedAmount: (categoryId: string) => number | null
  savePreferences: (data: {
    categoryId?: string
    paymentMethod?: 'credit' | 'debit' | 'cash' | 'pix' | 'boleto'
    cardId?: string
    type?: 'income' | 'expense'
  }) => Promise<void>
}

/**
 * Hook para gerenciar preferências do usuário baseadas nas últimas transações
 * Auto-preenche campos do formulário com as escolhas mais frequentes
 */
export function useLastPreferences(): UseLastPreferencesReturn {
  const {
    preferences,
    loadPreferences,
    savePreference,
    updateMostUsedCategory,
    calculateAverageAmount,
  } = useUserPreferencesStore()

  const { transactions } = useTransactionsStore()

  // Carrega preferências ao montar
  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  // Analisa transações para atualizar categorias mais usadas (com debounce para evitar loops)
  useEffect(() => {
    if (transactions.length === 0) return

    // Usa setTimeout para evitar atualizações síncronas que causam loops
    const timeoutId = setTimeout(() => {
      const incomeCategories = transactions
        .filter((t) => t.type === 'income')
        .map((t) => t.category_id)
      const expenseCategories = transactions
        .filter((t) => t.type === 'expense')
        .map((t) => t.category_id)

      if (incomeCategories.length > 0) {
        const mostUsedIncome = getMostFrequent(incomeCategories)
        const currentIncome = preferences.mostUsedCategoryByType.income
        if (mostUsedIncome && mostUsedIncome !== currentIncome) {
          updateMostUsedCategory('income', mostUsedIncome).catch(console.error)
        }
      }

      if (expenseCategories.length > 0) {
        const mostUsedExpense = getMostFrequent(expenseCategories)
        const currentExpense = preferences.mostUsedCategoryByType.expense
        if (mostUsedExpense && mostUsedExpense !== currentExpense) {
          updateMostUsedCategory('expense', mostUsedExpense).catch(console.error)
        }
      }
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [transactions.length]) // Apenas quando o número de transações muda

  // Memoiza funções para evitar recriações
  const suggestedCategory = useCallback(
    (type: 'income' | 'expense'): string | null => {
      return preferences.mostUsedCategoryByType[type]
    },
    [preferences.mostUsedCategoryByType]
  )

  const suggestedAmount = useCallback(
    (categoryId: string): number | null => {
      const average = preferences.averageAmountByCategory[categoryId]
      return average && average > 0 ? Math.round(average * 100) / 100 : null
    },
    [preferences.averageAmountByCategory]
  )

  const savePreferences = async (data: {
    categoryId?: string
    paymentMethod?: 'credit' | 'debit' | 'cash' | 'pix' | 'boleto'
    cardId?: string
    type?: 'income' | 'expense'
  }) => {
    if (data.categoryId) {
      await savePreference('lastCategoryId', data.categoryId)
      
      // Atualiza categoria mais usada para o tipo
      if (data.type) {
        await updateMostUsedCategory(data.type, data.categoryId)
      }

      // Calcula média de valores para essa categoria
      await calculateAverageAmount(data.categoryId)
    }

    if (data.paymentMethod) {
      await savePreference('lastPaymentMethod', data.paymentMethod)
    }

    if (data.cardId) {
      await savePreference('lastCardId', data.cardId)
    }
  }

  return {
    lastCategoryId: preferences.lastCategoryId,
    lastPaymentMethod: preferences.lastPaymentMethod,
    lastCardId: preferences.lastCardId,
    suggestedCategory,
    suggestedAmount,
    savePreferences,
  }
}

/**
 * Retorna o elemento mais frequente em um array
 */
function getMostFrequent<T>(arr: T[]): T | null {
  if (arr.length === 0) return null

  const frequency: Record<string, number> = {}
  arr.forEach((item) => {
    const key = String(item)
    frequency[key] = (frequency[key] || 0) + 1
  })

  let maxFreq = 0
  let mostFrequent: T | null = null

  Object.entries(frequency).forEach(([key, freq]) => {
    if (freq > maxFreq) {
      maxFreq = freq
      mostFrequent = key as T
    }
  })

  return mostFrequent
}
