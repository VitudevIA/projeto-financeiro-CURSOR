'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Minus, BarChart3, Target, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { formatCurrency } from '@/utils/helpers'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

interface BenchmarkData {
  category_id: string
  category_name?: string
  userAmount: number
  marketAverage: number
  marketMedian: number
  percentile: number
  categoryScore: number // 0-100, onde 100 = excelente (gasta menos que média)
  comparison: 'much_below' | 'below' | 'average' | 'above' | 'much_above'
  savingsOpportunity?: number
}

interface BenchmarkSummary {
  overallScore: number
  categoryBenchmarks: BenchmarkData[]
  totalUserExpenses: number
  totalMarketAverage: number
  savingsOpportunity?: number
}

export default function BenchmarkCard({ periodMonths }: { periodMonths: number }) {
  const [data, setData] = useState<BenchmarkSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBenchmark()
  }, [periodMonths])

  const fetchBenchmark = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/ia/benchmark?periodMonths=${periodMonths}`)
      
      if (!response.ok) {
        throw new Error('Erro ao buscar benchmark')
      }

      const benchmarkData = await response.json()
      setData(benchmarkData)
      setError(null)
    } catch (err) {
      console.error('Erro ao buscar benchmark:', err)
      setError('Não foi possível carregar o benchmark.')
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
          <CardTitle>Benchmarking de Mercado</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error || 'Dados insuficientes para benchmarking'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const { overallScore, categoryBenchmarks, savingsOpportunity } = data

  const getComparisonColor = (comparison: BenchmarkData['comparison']) => {
    switch (comparison) {
      case 'much_below':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'below':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'average':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'above':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'much_above':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getComparisonLabel = (comparison: BenchmarkData['comparison']) => {
    switch (comparison) {
      case 'much_below':
        return 'Muito abaixo'
      case 'below':
        return 'Abaixo'
      case 'average':
        return 'Média'
      case 'above':
        return 'Acima'
      case 'much_above':
        return 'Muito acima'
      default:
        return 'Média'
    }
  }

  const getScoreColor = (score: number) => {
    if (score < 30) return 'text-green-600'
    if (score < 50) return 'text-blue-600'
    if (score < 70) return 'text-yellow-600'
    if (score < 90) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreLabel = (score: number) => {
    if (score < 30) return 'Muito econômico'
    if (score < 50) return 'Econômico'
    if (score < 70) return 'Na média'
    if (score < 90) return 'Acima da média'
    return 'Muito acima'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Benchmarking de Mercado
        </CardTitle>
        <CardDescription>
          Compare seus gastos com padrões do mercado brasileiro
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resumo Geral (Opcional - pode ser removido ou minimizado) */}
        {savingsOpportunity && savingsOpportunity > 0 && (
          <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-800">
              <Target className="h-5 w-5" />
              <div>
                <div className="font-semibold">Oportunidade de Economia Total</div>
                <div className="text-2xl font-bold">{formatCurrency(savingsOpportunity)}</div>
                <div className="text-xs text-muted-foreground">potencial de economia mensal</div>
              </div>
            </div>
          </div>
        )}

        {/* Categorias com Score Individual */}
        {categoryBenchmarks.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Score por Categoria</h3>
              <p className="text-xs text-muted-foreground">
                Comparado com a média brasileira
              </p>
            </div>
            
            {categoryBenchmarks.slice(0, 10).map((benchmark) => {
              const deviation = benchmark.userAmount - benchmark.marketAverage
              const deviationPercent = benchmark.marketAverage > 0 
                ? (deviation / benchmark.marketAverage) * 100 
                : 0

              // Determina cor e ícone baseado no score da categoria
              const getCategoryScoreConfig = (score: number) => {
                if (score >= 80) {
                  return {
                    color: 'text-green-600',
                    bgColor: 'bg-green-50',
                    borderColor: 'border-green-200',
                    icon: CheckCircle2,
                    label: 'Excelente',
                    description: 'Gasta bem abaixo da média',
                  }
                } else if (score >= 60) {
                  return {
                    color: 'text-blue-600',
                    bgColor: 'bg-blue-50',
                    borderColor: 'border-blue-200',
                    icon: CheckCircle2,
                    label: 'Bom',
                    description: 'Gasta abaixo da média',
                  }
                } else if (score >= 40) {
                  return {
                    color: 'text-yellow-600',
                    bgColor: 'bg-yellow-50',
                    borderColor: 'border-yellow-200',
                    icon: AlertTriangle,
                    label: 'Regular',
                    description: 'Na média do mercado',
                  }
                } else if (score >= 20) {
                  return {
                    color: 'text-orange-600',
                    bgColor: 'bg-orange-50',
                    borderColor: 'border-orange-200',
                    icon: AlertTriangle,
                    label: 'Atenção',
                    description: 'Gasta acima da média',
                  }
                } else {
                  return {
                    color: 'text-red-600',
                    bgColor: 'bg-red-50',
                    borderColor: 'border-red-200',
                    icon: XCircle,
                    label: 'Crítico',
                    description: 'Gasta muito acima da média',
                  }
                }
              }

              const scoreConfig = getCategoryScoreConfig(benchmark.categoryScore)
              const ScoreIcon = scoreConfig.icon

              return (
                <div
                  key={benchmark.category_id}
                  className={cn(
                    'p-5 rounded-lg border-2 transition-all hover:shadow-md',
                    scoreConfig.borderColor,
                    scoreConfig.bgColor
                  )}
                >
                  {/* Header com Nome e Score */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <ScoreIcon className={cn('h-5 w-5', scoreConfig.color)} />
                        <span className="text-lg font-bold">
                          {benchmark.category_name || 'Categoria'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn('text-xs font-semibold', scoreConfig.borderColor, scoreConfig.color)}
                        >
                          {scoreConfig.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {scoreConfig.description}
                        </span>
                      </div>
                    </div>
                    
                    {/* Score da Categoria */}
                    <div className="text-right">
                      <div className={cn('text-3xl font-bold', scoreConfig.color)}>
                        {benchmark.categoryScore}
                      </div>
                      <div className="text-xs text-muted-foreground">/ 100</div>
                    </div>
                  </div>

                  {/* Barra de Progresso do Score */}
                  <div className="mb-4">
                    <Progress 
                      value={benchmark.categoryScore} 
                      className="h-3"
                    />
                  </div>

                  {/* Valores Comparativos */}
                  <div className="grid grid-cols-2 gap-4 mb-3 p-3 bg-white/50 rounded-lg">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Seus gastos mensais</div>
                      <div className="text-lg font-bold">{formatCurrency(benchmark.userAmount)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Média brasileira</div>
                      <div className="text-lg font-bold text-muted-foreground">
                        {formatCurrency(benchmark.marketAverage)}
                      </div>
                    </div>
                  </div>

                  {/* Diferença e Oportunidade */}
                  {deviation !== 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {deviation > 0 ? (
                          <>
                            <TrendingUp className="h-4 w-4 text-orange-600" />
                            <span className="text-orange-600 font-medium">
                              {formatCurrency(Math.abs(deviation))} acima ({deviationPercent > 0 ? '+' : ''}{deviationPercent.toFixed(0)}%)
                            </span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-4 w-4 text-green-600" />
                            <span className="text-green-600 font-medium">
                              {formatCurrency(Math.abs(deviation))} abaixo ({deviationPercent.toFixed(0)}%)
                            </span>
                          </>
                        )}
                      </div>
                      
                      {benchmark.savingsOpportunity && benchmark.savingsOpportunity > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded text-green-800">
                          <Target className="h-3 w-3" />
                          <span className="text-xs font-semibold">
                            Economia: {formatCurrency(benchmark.savingsOpportunity)}/mês
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {deviation <= 0 && (
                    <div className="mt-2 text-xs text-green-700 font-medium">
                      ✓ Você está gastando menos que a média brasileira nesta categoria
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Não há dados suficientes para comparação
          </p>
        )}
      </CardContent>
    </Card>
  )
}

