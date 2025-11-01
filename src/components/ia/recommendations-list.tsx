'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Lightbulb, TrendingUp, DollarSign, PiggyBank, CreditCard, Target } from 'lucide-react'
import { formatCurrency } from '@/utils/helpers'
import { cn } from '@/lib/utils'

interface Recommendation {
  id: string
  priority: 'high' | 'medium' | 'low'
  category: 'savings' | 'spending' | 'budget' | 'debt' | 'investment'
  title: string
  description: string
  impact: {
    potentialSavings?: number
    timeToImplement: 'immediate' | 'short' | 'medium' | 'long'
    effort: 'low' | 'medium' | 'high'
  }
  actionSteps: string[]
  estimatedBenefit?: string
}

export default function RecommendationsList() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRecommendations()
  }, [])

  const fetchRecommendations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/ia/recomendacoes?periodMonths=3&limit=10')
      
      if (!response.ok) {
        throw new Error('Erro ao buscar recomendações')
      }

      const data = await response.json()
      setRecommendations(data.recommendations || [])
      setError(null)
    } catch (err) {
      console.error('Erro ao buscar recomendações:', err)
      setError('Não foi possível carregar as recomendações.')
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
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recomendações Inteligentes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const categoryIcons = {
    savings: PiggyBank,
    spending: DollarSign,
    budget: Target,
    debt: CreditCard,
    investment: TrendingUp,
  }

  const priorityColors = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
  }

  const timeLabels = {
    immediate: 'Imediato',
    short: 'Curto prazo',
    medium: 'Médio prazo',
    long: 'Longo prazo',
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            Recomendações Inteligentes
          </CardTitle>
          <CardDescription>Nenhuma recomendação no momento</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Continue mantendo suas finanças organizadas!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-600" />
          Recomendações Inteligentes
        </CardTitle>
        <CardDescription>
          {recommendations.length} {recommendations.length === 1 ? 'recomendação' : 'recomendações'} personalizadas para você
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.map((rec) => {
            const CategoryIcon = categoryIcons[rec.category] || Lightbulb

            return (
              <div
                key={rec.id}
                className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <CategoryIcon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{rec.title}</h3>
                        <Badge
                          variant="outline"
                          className={cn('text-xs', priorityColors[rec.priority])}
                        >
                          {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {rec.description}
                      </p>
                    </div>
                  </div>
                  {rec.impact.potentialSavings && (
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(rec.impact.potentialSavings)}
                      </div>
                      <div className="text-xs text-muted-foreground">economia/mês</div>
                    </div>
                  )}
                </div>

                {rec.actionSteps.length > 0 && (
                  <div className="mt-3 pl-8">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Passos para implementar:
                    </p>
                    <ul className="space-y-1">
                      {rec.actionSteps.map((step, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {rec.estimatedBenefit && (
                  <div className="mt-3 p-2 bg-primary/5 rounded text-xs border border-primary/10">
                    <strong className="text-primary">💡 Benefício estimado:</strong>{' '}
                    {rec.estimatedBenefit}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    ⏱️ {timeLabels[rec.impact.timeToImplement]}
                  </span>
                  <span>
                    {rec.impact.effort === 'low' && '⚡ Esforço baixo'}
                    {rec.impact.effort === 'medium' && '🔧 Esforço médio'}
                    {rec.impact.effort === 'high' && '🔨 Esforço alto'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

