import { supabase } from './supabase'

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
  type: string
}

export class InsightsGenerator {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async generateInsights(): Promise<Insight[]> {
    const insights: Insight[] = []

    try {
      // Buscar transações dos últimos 3 meses
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*, category:categories(name)')
        .eq('user_id', this.userId)
        .gte('transaction_date', threeMonthsAgo.toISOString().split('T')[0])
        .order('transaction_date', { ascending: false })

      if (error || !transactions) {
        console.error('Erro ao buscar transações:', error)
        return []
      }

      // Gerar insights de comparação
      const comparisonInsights = await this.generateComparisonInsights(transactions)
      insights.push(...comparisonInsights)

      // Gerar insights de anomalias
      const anomalyInsights = await this.generateAnomalyInsights(transactions)
      insights.push(...anomalyInsights)

      // Gerar insights de tendências
      const trendInsights = await this.generateTrendInsights(transactions)
      insights.push(...trendInsights)

      // Gerar insights de previsões
      const predictionInsights = await this.generatePredictionInsights(transactions)
      insights.push(...predictionInsights)

      // Gerar insights de alertas de orçamento
      const budgetInsights = await this.generateBudgetInsights()
      insights.push(...budgetInsights)

      return insights
    } catch (error) {
      console.error('Erro ao gerar insights:', error)
      return []
    }
  }

  private async generateComparisonInsights(transactions: any[]): Promise<Insight[]> {
    const insights: Insight[] = []
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    // Comparar gastos do mês atual vs mês anterior
    const currentMonthTransactions = transactions.filter(t => {
      const date = new Date(t.transaction_date)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
    
    const lastMonthTransactions = transactions.filter(t => {
      const date = new Date(t.transaction_date)
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear
    })

    const currentTotal = currentMonthTransactions.reduce((sum: number, t) => sum + t.amount, 0)
    const lastTotal = lastMonthTransactions.reduce((sum: number, t) => sum + t.amount, 0)

    if (lastTotal > 0) {
      const percentageChange = ((currentTotal - lastTotal) / lastTotal) * 100
      
      if (Math.abs(percentageChange) > 20) {
        const message = percentageChange > 0 
          ? `Seus gastos aumentaram ${percentageChange.toFixed(1)}% comparado ao mês anterior (R$ ${currentTotal.toFixed(2)} vs R$ ${lastTotal.toFixed(2)})`
          : `Seus gastos diminuíram ${Math.abs(percentageChange).toFixed(1)}% comparado ao mês anterior (R$ ${currentTotal.toFixed(2)} vs R$ ${lastTotal.toFixed(2)})`
        
        insights.push({
          user_id: this.userId,
          type: 'comparison',
          message,
          severity: Math.abs(percentageChange) > 50 ? 'critical' : 'warning',
          generated_at: new Date().toISOString(),
          is_read: false
        })
      }
    }

    return insights
  }

  private async generateAnomalyInsights(transactions: any[]): Promise<Insight[]> {
    const insights: Insight[] = []
    
    // Calcular média e desvio padrão dos gastos
    const amounts = transactions.map(t => t.amount)
    const mean = amounts.reduce((sum: number, amount) => sum + amount, 0) / amounts.length
    const variance = amounts.reduce((sum: number, amount) => sum + Math.pow(amount - mean, 2), 0) / amounts.length
    const standardDeviation = Math.sqrt(variance)
    
    // Detectar transações que são 2x maiores que a média + 1 desvio padrão
    const threshold = mean + (2 * standardDeviation)
    
    const anomalies = transactions.filter(t => t.amount > threshold)
    
    for (const anomaly of anomalies) {
      const message = `Gasto incomum detectado: R$ ${anomaly.amount.toFixed(2)} em ${anomaly.category.name} (${anomaly.description})`
      
      insights.push({
        user_id: this.userId,
        type: 'anomaly',
        message,
        severity: anomaly.amount > (mean + 3 * standardDeviation) ? 'critical' : 'warning',
        generated_at: new Date().toISOString(),
        is_read: false
      })
    }

    return insights
  }

  private async generateTrendInsights(transactions: any[]): Promise<Insight[]> {
    const insights: Insight[] = []
    
    // Agrupar transações por categoria e mês
    const categoryData: { [key: string]: { [key: string]: number } } = {}
    
    transactions.forEach(t => {
      const category = t.category.name
      const month = new Date(t.transaction_date).toISOString().slice(0, 7)
      
      if (!categoryData[category]) {
        categoryData[category] = {}
      }
      
      categoryData[category][month] = (categoryData[category][month] || 0) + t.amount
    })

    // Analisar tendências por categoria
    for (const [category, monthlyData] of Object.entries(categoryData)) {
      const months = Object.keys(monthlyData).sort()
      
      if (months.length >= 2) {
        const recent = monthlyData[months[months.length - 1]]
        const previous = monthlyData[months[months.length - 2]]
        
        if (previous > 0) {
          const trend = ((recent - previous) / previous) * 100
          
          if (Math.abs(trend) > 15) {
            const message = trend > 0
              ? `Seus gastos com ${category} estão aumentando ${trend.toFixed(1)}% ao mês`
              : `Seus gastos com ${category} estão diminuindo ${Math.abs(trend).toFixed(1)}% ao mês`
            
            insights.push({
              user_id: this.userId,
              type: 'trend',
              message,
              severity: Math.abs(trend) > 30 ? 'warning' : 'info',
              generated_at: new Date().toISOString(),
              is_read: false
            })
          }
        }
      }
    }

    return insights
  }

  private async generatePredictionInsights(transactions: any[]): Promise<Insight[]> {
    const insights: Insight[] = []
    
    // Calcular média de gastos dos últimos 3 meses
    const currentDate = new Date()
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    
    const recentTransactions = transactions.filter(t => 
      new Date(t.transaction_date) >= threeMonthsAgo
    )
    
    const totalSpent = recentTransactions.reduce((sum: number, t) => sum + t.amount, 0)
    const averageMonthly = totalSpent / 3
    
    // Previsão para o mês atual
    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const currentMonthTransactions = transactions.filter(t => 
      new Date(t.transaction_date) >= currentMonthStart
    )
    
    const currentMonthSpent = currentMonthTransactions.reduce((sum: number, t) => sum + t.amount, 0)
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
    const daysPassed = currentDate.getDate()
    const daysRemaining = daysInMonth - daysPassed
    
    const projectedSpent = currentMonthSpent + (averageMonthly * (daysRemaining / daysInMonth))
    
    if (projectedSpent > averageMonthly * 1.2) {
      const message = `Baseado em seu histórico, você pode gastar R$ ${projectedSpent.toFixed(2)} este mês (${((projectedSpent / averageMonthly - 1) * 100).toFixed(1)}% acima da média)`
      
      insights.push({
        user_id: this.userId,
        type: 'prediction',
        message,
        severity: projectedSpent > averageMonthly * 1.5 ? 'warning' : 'info',
        generated_at: new Date().toISOString(),
        is_read: false
      })
    }

    return insights
  }

  private async generateBudgetInsights(): Promise<Insight[]> {
    const insights: Insight[] = []
    
    try {
      // Buscar orçamentos ativos
      const { data: budgets, error } = await supabase
        .from('budgets')
        .select(`
          *,
          category:categories(name)
        `)
        .eq('user_id', this.userId)
        .eq('month', new Date().toISOString().slice(0, 7) + '-01')

      if (error || !budgets) {
        return insights
      }

      for (const budget of budgets) {
        // Buscar gastos da categoria no mês atual
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
        
        const { data: categoryTransactions, error: transError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', this.userId)
          .eq('category_id', budget.category_id)
          .gte('transaction_date', monthStart.toISOString().split('T')[0])
          .lte('transaction_date', monthEnd.toISOString().split('T')[0])

        if (transError || !categoryTransactions) {
          continue
        }

        const spent = categoryTransactions.reduce((sum: number, t: any) => sum + t.amount, 0)
        const percentage = (spent / budget.limit_amount) * 100

        if (percentage >= budget.alert_percentage) {
          const message = percentage >= 100
            ? `Orçamento de ${budget.category.name} excedido! Você gastou R$ ${spent.toFixed(2)} de R$ ${budget.limit_amount.toFixed(2)}`
            : `Orçamento de ${budget.category.name} próximo do limite: ${percentage.toFixed(1)}% usado (R$ ${spent.toFixed(2)} de R$ ${budget.limit_amount.toFixed(2)})`
          
          insights.push({
            user_id: this.userId,
            type: 'alert',
            message,
            severity: percentage >= 100 ? 'critical' : 'warning',
            generated_at: new Date().toISOString(),
            is_read: false
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
      const { error } = await supabase
        .from('insights')
        .insert(insights)

      if (error) {
        console.error('Erro ao salvar insights:', error)
      }
    } catch (error) {
      console.error('Erro ao salvar insights:', error)
    }
  }
}