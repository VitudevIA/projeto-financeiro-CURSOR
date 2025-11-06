'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCurrency } from '@/utils/helpers'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardFilters } from './dashboard-filters'

interface ComparisonMetricProps {
  currentValue: number
  compareValue: number
  label: string
  format?: 'currency' | 'number' | 'percentage'
  className?: string
}

function ComparisonMetric({ currentValue, compareValue, label, format = 'currency', className }: ComparisonMetricProps) {
  const difference = currentValue - compareValue
  const percentageChange = compareValue !== 0 
    ? ((difference / Math.abs(compareValue)) * 100)
    : 0
  
  const isPositive = difference > 0
  const isNegative = difference < 0
  const isNeutral = difference === 0

  const formatValue = (value: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(value)
      case 'percentage':
        return `${value.toFixed(1)}%`
      default:
        return value.toFixed(2)
    }
  }

  return (
    <div className={cn("p-4 rounded-lg border bg-card", className)}>
      <div className="text-sm text-muted-foreground mb-2">{label}</div>
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex-1">
          <div className="text-2xl font-bold">{formatValue(currentValue)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            vs {formatValue(compareValue)} (período anterior)
          </div>
        </div>
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-md text-sm font-semibold",
          isPositive && "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
          isNegative && "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
          isNeutral && "bg-muted text-muted-foreground"
        )}>
          {isPositive && <TrendingUp className="h-4 w-4" />}
          {isNegative && <TrendingDown className="h-4 w-4" />}
          {isNeutral && <Minus className="h-4 w-4" />}
          <span>
            {isPositive ? '+' : ''}{formatValue(difference)} ({isPositive ? '+' : ''}{percentageChange.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  )
}

interface ComparisonChartProps {
  comparisonData: {
    currentPeriod: {
      kpis: {
        totalSpent: number
        dailyAverage: number
        monthlyProjection: number
        availableBalance: number
        daysOfReserve: number
      }
    }
    comparePeriod: {
      kpis: {
        totalSpent: number
        dailyAverage: number
        monthlyProjection: number
        availableBalance: number
        daysOfReserve: number
      }
    }
  }
  filters?: DashboardFilters
}

export function ComparisonChart({ comparisonData, filters }: ComparisonChartProps) {
  const { currentPeriod, comparePeriod } = comparisonData

  const formatPeriod = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return `${start.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  return (
    <Card className="border-border/50 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Comparação de Períodos</CardTitle>
            <CardDescription className="mt-1">
              {filters?.startDate && filters?.endDate && (
                <>
                  Período atual: {formatPeriod(filters.startDate, filters.endDate)}
                  {filters.compareStartDate && filters.compareEndDate && (
                    <> vs {formatPeriod(filters.compareStartDate, filters.compareEndDate)}</>
                  )}
                </>
              )}
            </CardDescription>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ComparisonMetric
            currentValue={currentPeriod.kpis.totalSpent}
            compareValue={comparePeriod.kpis.totalSpent}
            label="Total Gasto"
            format="currency"
          />
          <ComparisonMetric
            currentValue={currentPeriod.kpis.dailyAverage}
            compareValue={comparePeriod.kpis.dailyAverage}
            label="Média Diária"
            format="currency"
          />
          <ComparisonMetric
            currentValue={currentPeriod.kpis.monthlyProjection}
            compareValue={comparePeriod.kpis.monthlyProjection}
            label="Projeção Mensal"
            format="currency"
          />
          <ComparisonMetric
            currentValue={currentPeriod.kpis.availableBalance}
            compareValue={comparePeriod.kpis.availableBalance}
            label="Saldo Disponível"
            format="currency"
          />
          <ComparisonMetric
            currentValue={currentPeriod.kpis.daysOfReserve}
            compareValue={comparePeriod.kpis.daysOfReserve}
            label="Dias de Reserva"
            format="number"
          />
        </div>
      </CardContent>
    </Card>
  )
}

