'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HealthScoreCardProps {
  data: {
    score: number
    breakdown: {
      controleGastos: number
      poupancaReservas: number
      previsibilidade: number
      dividas: number
      diversificacao: number
    }
    trend: 'up' | 'down' | 'stable'
    category: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  } | null
  loading: boolean
  periodMonths?: number
}

export default function HealthScoreCard({ data, loading, periodMonths = 3 }: HealthScoreCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Score de Saúde Financeira</CardTitle>
          <CardDescription>Carregando dados...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const { score, breakdown, trend, category } = data

  const categoryConfig = {
    excellent: {
      label: 'Excelente',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: CheckCircle2,
    },
    good: {
      label: 'Bom',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      icon: CheckCircle2,
    },
    fair: {
      label: 'Regular',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      icon: AlertTriangle,
    },
    poor: {
      label: 'Ruim',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      icon: AlertTriangle,
    },
    critical: {
      label: 'Crítico',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: XCircle,
    },
  }

  const config = categoryConfig[category]
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'

  return (
    <Card className={cn('overflow-hidden', config.borderColor, 'border-2')}>
      <CardHeader className={cn('pb-3', config.bgColor)}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <config.icon className={cn('h-5 w-5', config.color)} />
              Score de Saúde Financeira
            </CardTitle>
            <CardDescription className="mt-1">
              Análise completa da sua situação financeira
            </CardDescription>
          </div>
          <div className="text-right">
            <div className={cn('text-4xl font-bold', config.color)}>{score}</div>
            <div className="text-sm text-muted-foreground">/ 100</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Trend Indicator */}
        <div className="flex items-center gap-2 mb-6">
          <TrendIcon className={cn('h-4 w-4', trendColor)} />
          <span className={cn('text-sm font-medium', trendColor)}>
            {trend === 'up' && 'Tendência positiva'}
            {trend === 'down' && 'Tendência negativa'}
            {trend === 'stable' && 'Tendência estável'}
          </span>
          <span className="text-sm text-muted-foreground">
            • {config.label}
          </span>
        </div>

        {/* Breakdown */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Controle de Gastos</span>
              <span className="text-muted-foreground">
                {breakdown.controleGastos.toFixed(1)} / 30 pontos
              </span>
            </div>
            <Progress value={(breakdown.controleGastos / 30) * 100} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Poupança e Reservas</span>
              <span className="text-muted-foreground">
                {breakdown.poupancaReservas.toFixed(1)} / 25 pontos
              </span>
            </div>
            <Progress value={(breakdown.poupancaReservas / 25) * 100} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Previsibilidade</span>
              <span className="text-muted-foreground">
                {breakdown.previsibilidade.toFixed(1)} / 20 pontos
              </span>
            </div>
            <Progress value={(breakdown.previsibilidade / 20) * 100} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Dívidas</span>
              <span className="text-muted-foreground">
                {breakdown.dividas.toFixed(1)} / 15 pontos
              </span>
            </div>
            <Progress value={(breakdown.dividas / 15) * 100} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Diversificação</span>
              <span className="text-muted-foreground">
                {breakdown.diversificacao.toFixed(1)} / 10 pontos
              </span>
            </div>
            <Progress value={(breakdown.diversificacao / 10) * 100} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

