'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { formatCurrency } from '@/utils/helpers'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface ForecastPeriod {
  month: string
  predictedExpenses: number
  predictedIncome: number
  confidence: 'high' | 'medium' | 'low'
  confidenceInterval: {
    min: number
    max: number
  }
}

interface ForecastData {
  forecast: ForecastPeriod[]
  metadata: {
    historicalPeriods: number
    forecastPeriods: number
    avgMonthlyExpenses: number
    avgMonthlyIncome: number
    trend: 'increasing' | 'decreasing' | 'stable'
  }
}

export default function ForecastChart() {
  const [data, setData] = useState<ForecastData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchForecast()
  }, [])

  const fetchForecast = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/ia/previsao?months=6&historyMonths=6')
      
      if (!response.ok) {
        throw new Error('Erro ao buscar previsões')
      }

      const forecastData = await response.json()
      setData(forecastData)
      setError(null)
    } catch (err) {
      console.error('Erro ao buscar previsões:', err)
      setError('Não foi possível carregar as previsões.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Previsão de Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error || 'Dados insuficientes para gerar previsões'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const { forecast, metadata } = data

  if (forecast.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Previsão de Despesas</CardTitle>
          <CardDescription>Dados insuficientes</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {data.message || 'Precisa de pelo menos 3 meses de histórico para gerar previsões'}
          </p>
        </CardContent>
      </Card>
    )
  }

  // Formata dados para o gráfico
  const chartData = forecast.map((f) => ({
    month: new Date(f.month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
    monthRaw: f.month,
    predictedExpenses: f.predictedExpenses,
    predictedIncome: f.predictedIncome,
    minExpenses: f.confidenceInterval.min,
    maxExpenses: f.confidenceInterval.max,
    confidence: f.confidence,
  }))

  const TrendIcon = metadata.trend === 'increasing' ? TrendingUp : 
                     metadata.trend === 'decreasing' ? TrendingDown : Minus

  const trendColor = metadata.trend === 'increasing' ? 'text-red-600' : 
                     metadata.trend === 'decreasing' ? 'text-green-600' : 
                     'text-muted-foreground'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Previsão de Despesas</CardTitle>
            <CardDescription>
              Projeções para os próximos {forecast.length} {forecast.length === 1 ? 'mês' : 'meses'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendIcon className={`h-4 w-4 ${trendColor}`} />
            <span className={trendColor}>
              {metadata.trend === 'increasing' && 'Tendência de aumento'}
              {metadata.trend === 'decreasing' && 'Tendência de redução'}
              {metadata.trend === 'stable' && 'Tendência estável'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="month" 
              className="text-xs"
            />
            <YAxis 
              className="text-xs"
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              labelStyle={{ color: '#000' }}
            />
            <Area
              type="monotone"
              dataKey="maxExpenses"
              stroke="#ef4444"
              fill="none"
              strokeDasharray="5 5"
              strokeOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="minExpenses"
              stroke="#ef4444"
              fill="none"
              strokeDasharray="5 5"
              strokeOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="predictedExpenses"
              stroke="#ef4444"
              fill="url(#colorExpenses)"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="predictedIncome"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500"></div>
            <span className="text-muted-foreground">Despesas previstas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-green-500 border-dashed border-t-2"></div>
            <span className="text-muted-foreground">Receitas previstas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 border-red-500 border-dashed border-t"></div>
            <span className="text-muted-foreground">Intervalo de confiança</span>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <div className="text-sm text-muted-foreground">Média mensal de despesas</div>
            <div className="text-xl font-bold">{formatCurrency(metadata.avgMonthlyExpenses)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Média mensal de receitas</div>
            <div className="text-xl font-bold text-green-600">{formatCurrency(metadata.avgMonthlyIncome)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Saldo previsto médio</div>
            <div className={`text-xl font-bold ${
              (metadata.avgMonthlyIncome - metadata.avgMonthlyExpenses) >= 0 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {formatCurrency(metadata.avgMonthlyIncome - metadata.avgMonthlyExpenses)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

