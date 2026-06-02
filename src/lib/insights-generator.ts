import { supabase } from './supabase'
import type { Budget } from '@/types/database.types'
import {
  addMonthsToMesReferencia,
  getCurrentMesReferencia,
  isValidMesReferencia,
} from '@/utils/mes-referencia'

export interface Insight {
  id?: string
  user_id: string
  type: 'comparison' | 'anomaly' | 'trend' | 'prediction' | 'alert'
  message: string
  severity: 'info' | 'warning' | 'critical'
  generated_at: string
  is_read: boolean
}

export interface TransactionData {
  id: string
  amount: number
  description: string
  category: string
  transaction_date: string
  mes_referencia: string
  type: string
}

type TransactionRow = {
  id: string
  amount: number
  description: string
  transaction_date: string
  mes_referencia: string
  type: string
  category?: { name: string } | null
}

type BudgetRow = Budget & {
  category: { name: string } | null
}

const HISTORY_MONTHS = 3

function ensureNumber(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function monthDateFromMesReferencia(mesReferencia: string): string {
  return `${mesReferencia}-01`
}

function getNextMonthDate(monthDate: string): string {
  const nextMesRef = addMonthsToMesReferencia(monthDate.slice(0, 7), 1)
  return `${nextMesRef}-01`
}

function isExpense(t: TransactionRow): boolean {
  return t.type === 'expense'
}

function resolveMesReferencia(t: TransactionRow): string | null {
  const mes = t.mes_referencia
  return mes && isValidMesReferencia(mes) ? mes : null
}

function groupExpensesByMesReferencia(
  transactions: TransactionRow[]
): Map<string, number> {
  const totals = new Map<string, number>()

  for (const t of transactions) {
    if (!isExpense(t)) continue
    const mes = resolveMesReferencia(t)
    if (!mes) continue
    totals.set(mes, (totals.get(mes) ?? 0) + ensureNumber(t.amount))
  }

  return totals
}

async function fetchSpentByCategory(
  mesReferencia: string,
  userId: string,
  categoryIds: string[]
): Promise<Map<string, number>> {
  const spentByCategory = new Map<string, number>()
  if (categoryIds.length === 0) return spentByCategory

  const { data, error } = await supabase
    .from('transactions')
    .select('category_id, amount')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('mes_referencia', mesReferencia)
    .in('category_id', categoryIds)

  if (error) throw error

  for (const row of data ?? []) {
    const categoryId = row.category_id as string
    spentByCategory.set(
      categoryId,
      (spentByCategory.get(categoryId) ?? 0) + ensureNumber(row.amount)
    )
  }

  return spentByCategory
}

export class InsightsGenerator {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async generateInsights(): Promise<Insight[]> {
    const insights: Insight[] = []

    try {
      const currentMesReferencia = getCurrentMesReferencia()
      const minMesReferencia = addMonthsToMesReferencia(
        currentMesReferencia,
        -HISTORY_MONTHS
      )

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*, category:categories(name)')
        .eq('user_id', this.userId)
        .gte('mes_referencia', minMesReferencia)
        .lte('mes_referencia', currentMesReferencia)
        .order('mes_referencia', { ascending: false })

      if (error || !transactions) {
        console.error('Erro ao buscar transações:', error)
        return []
      }

      const rows = transactions as TransactionRow[]

      const comparisonInsights = await this.generateComparisonInsights(rows)
      insights.push(...comparisonInsights)

      const anomalyInsights = await this.generateAnomalyInsights(rows)
      insights.push(...anomalyInsights)

      const trendInsights = await this.generateTrendInsights(rows)
      insights.push(...trendInsights)

      const predictionInsights = await this.generatePredictionInsights(rows)
      insights.push(...predictionInsights)

      const budgetInsights = await this.generateBudgetInsights()
      insights.push(...budgetInsights)

      return insights
    } catch (error) {
      console.error('Erro ao gerar insights:', error)
      return []
    }
  }

  private async generateComparisonInsights(
    transactions: TransactionRow[]
  ): Promise<Insight[]> {
    const insights: Insight[] = []
    const currentMesReferencia = getCurrentMesReferencia()
    const previousMesReferencia = addMonthsToMesReferencia(currentMesReferencia, -1)

    const monthlyTotals = groupExpensesByMesReferencia(transactions)
    const currentTotal = monthlyTotals.get(currentMesReferencia) ?? 0
    const lastTotal = monthlyTotals.get(previousMesReferencia) ?? 0

    if (lastTotal > 0) {
      const percentageChange = ((currentTotal - lastTotal) / lastTotal) * 100

      if (Math.abs(percentageChange) > 20) {
        const message =
          percentageChange > 0
            ? `Seus gastos aumentaram ${percentageChange.toFixed(1)}% comparado ao mês anterior (R$ ${currentTotal.toFixed(2)} vs R$ ${lastTotal.toFixed(2)})`
            : `Seus gastos diminuíram ${Math.abs(percentageChange).toFixed(1)}% comparado ao mês anterior (R$ ${currentTotal.toFixed(2)} vs R$ ${lastTotal.toFixed(2)})`

        insights.push({
          user_id: this.userId,
          type: 'comparison',
          message,
          severity: Math.abs(percentageChange) > 50 ? 'critical' : 'warning',
          generated_at: new Date().toISOString(),
          is_read: false,
        })
      }
    }

    return insights
  }

  private async generateAnomalyInsights(
    transactions: TransactionRow[]
  ): Promise<Insight[]> {
    const insights: Insight[] = []
    const expenses = transactions.filter(isExpense)

    if (expenses.length === 0) return insights

    const amounts = expenses.map((t) => ensureNumber(t.amount))
    const mean = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length
    const variance =
      amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) /
      amounts.length
    const standardDeviation = Math.sqrt(variance)

    const threshold = mean + 2 * standardDeviation
    const anomalies = expenses.filter((t) => ensureNumber(t.amount) > threshold)

    for (const anomaly of anomalies) {
      const categoryName = anomaly.category?.name ?? 'Sem categoria'
      const amount = ensureNumber(anomaly.amount)
      const message = `Gasto incomum detectado: R$ ${amount.toFixed(2)} em ${categoryName} (${anomaly.description})`

      insights.push({
        user_id: this.userId,
        type: 'anomaly',
        message,
        severity:
          amount > mean + 3 * standardDeviation ? 'critical' : 'warning',
        generated_at: new Date().toISOString(),
        is_read: false,
      })
    }

    return insights
  }

  private async generateTrendInsights(
    transactions: TransactionRow[]
  ): Promise<Insight[]> {
    const insights: Insight[] = []
    const categoryData: Record<string, Record<string, number>> = {}

    transactions.forEach((t) => {
      if (!isExpense(t)) return
      const mes = resolveMesReferencia(t)
      if (!mes) return

      const category = t.category?.name ?? 'Sem categoria'
      if (!categoryData[category]) {
        categoryData[category] = {}
      }
      categoryData[category][mes] =
        (categoryData[category][mes] ?? 0) + ensureNumber(t.amount)
    })

    for (const [category, monthlyData] of Object.entries(categoryData)) {
      const months = Object.keys(monthlyData).sort()

      if (months.length >= 2) {
        const recent = monthlyData[months[months.length - 1]]
        const previous = monthlyData[months[months.length - 2]]

        if (previous > 0) {
          const trend = ((recent - previous) / previous) * 100

          if (Math.abs(trend) > 15) {
            const message =
              trend > 0
                ? `Seus gastos com ${category} estão aumentando ${trend.toFixed(1)}% ao mês`
                : `Seus gastos com ${category} estão diminuindo ${Math.abs(trend).toFixed(1)}% ao mês`

            insights.push({
              user_id: this.userId,
              type: 'trend',
              message,
              severity: Math.abs(trend) > 30 ? 'warning' : 'info',
              generated_at: new Date().toISOString(),
              is_read: false,
            })
          }
        }
      }
    }

    return insights
  }

  private async generatePredictionInsights(
    transactions: TransactionRow[]
  ): Promise<Insight[]> {
    const insights: Insight[] = []
    const currentMesReferencia = getCurrentMesReferencia()
    const monthlyTotals = groupExpensesByMesReferencia(transactions)

    const historicalMesRefs = Array.from({ length: HISTORY_MONTHS }, (_, i) =>
      addMonthsToMesReferencia(currentMesReferencia, -(i + 1))
    )

    const historicalTotals = historicalMesRefs
      .map((mes) => monthlyTotals.get(mes) ?? 0)
      .filter((total) => total > 0)

    if (historicalTotals.length === 0) return insights

    const averageMonthly =
      historicalTotals.reduce((sum, total) => sum + total, 0) /
      historicalTotals.length

    const currentMonthSpent = monthlyTotals.get(currentMesReferencia) ?? 0

    const currentDate = new Date()
    const daysInMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    ).getDate()
    const daysPassed = currentDate.getDate()
    const daysRemaining = daysInMonth - daysPassed

    // Parcelas futuras já indexadas na competência entram no total conhecido;
    // extrapola apenas o ritmo diário para gastos ainda não registrados.
    const dailyRate = daysPassed > 0 ? currentMonthSpent / daysPassed : 0
    const extrapolatedFromDaily = currentMonthSpent + dailyRate * daysRemaining
    const projectedSpent = Math.max(currentMonthSpent, extrapolatedFromDaily)

    if (projectedSpent > averageMonthly * 1.2) {
      const message = `Baseado em seu histórico, você pode gastar R$ ${projectedSpent.toFixed(2)} este mês (${((projectedSpent / averageMonthly - 1) * 100).toFixed(1)}% acima da média)`

      insights.push({
        user_id: this.userId,
        type: 'prediction',
        message,
        severity: projectedSpent > averageMonthly * 1.5 ? 'warning' : 'info',
        generated_at: new Date().toISOString(),
        is_read: false,
      })
    }

    return insights
  }

  private async generateBudgetInsights(): Promise<Insight[]> {
    const insights: Insight[] = []

    try {
      const currentMesReferencia = getCurrentMesReferencia()
      const monthStart = monthDateFromMesReferencia(currentMesReferencia)

      const { data: budgets, error } = await supabase
        .from('budgets')
        .select(`
          *,
          category:categories(name)
        `)
        .eq('user_id', this.userId)
        .gte('month', monthStart)
        .lt('month', getNextMonthDate(monthStart))

      if (error || !budgets || budgets.length === 0) {
        return insights
      }

      const budgetsList = budgets as BudgetRow[]

      const categoryIds = [
        ...new Set(budgetsList.map((b) => b.category_id)),
      ]
      const spentByCategory = await fetchSpentByCategory(
        currentMesReferencia,
        this.userId,
        categoryIds
      )

      for (const budget of budgetsList) {
        const spent = spentByCategory.get(budget.category_id) ?? 0
        const limitAmount = ensureNumber(budget.limit_amount)
        if (limitAmount <= 0) continue

        const percentage = (spent / limitAmount) * 100
        const alertThreshold = ensureNumber(budget.alert_percentage)

        if (percentage >= alertThreshold) {
          const categoryName = budget.category?.name ?? 'Categoria'
          const message =
            percentage >= 100
              ? `Orçamento de ${categoryName} excedido! Você gastou R$ ${spent.toFixed(2)} de R$ ${limitAmount.toFixed(2)}`
              : `Orçamento de ${categoryName} próximo do limite: ${percentage.toFixed(1)}% usado (R$ ${spent.toFixed(2)} de R$ ${limitAmount.toFixed(2)})`

          insights.push({
            user_id: this.userId,
            type: 'alert',
            message,
            severity: percentage >= 100 ? 'critical' : 'warning',
            generated_at: new Date().toISOString(),
            is_read: false,
          })
        }
      }
    } catch (error) {
      console.error('Erro ao gerar insights de orçamento:', error)
    }

    return insights
  }

  async saveInsights(insights: Insight[]): Promise<void> {
    if (insights.length === 0) return

    try {
      const { error } = await supabase.from('insights').insert(insights)

      if (error) {
        console.error('Erro ao salvar insights:', error)
      }
    } catch (error) {
      console.error('Erro ao salvar insights:', error)
    }
  }
}
