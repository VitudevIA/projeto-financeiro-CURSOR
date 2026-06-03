'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCurrency } from '@/utils/helpers'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardFilters } from './dashboard-filters'
import {
  buildCompetenciaExpenseSeriesFromDaily,
  formatMesReferenciaShort,
  mesReferenciaRangeFromDates,
  type CompetenciaTimeSeriesPoint,
} from '@/utils/mes-referencia'

interface PeriodKPIs {
  totalSpent: number
  total_incomes?: number
  total_expenses?: number
  dailyAverage: number
  monthlyProjection: number
  availableBalance: number
  daysOfReserve: number
}

interface TimeSeriesPoint {
  date: string
  amount: number
  label?: string
}

interface ComparisonChartProps {
  comparisonData: {
    currentPeriod: {
      kpis: PeriodKPIs
      timeSeriesData: TimeSeriesPoint[]
      categoryData: unknown[]
    }
    comparePeriod: {
      kpis: PeriodKPIs
      timeSeriesData: TimeSeriesPoint[]
      categoryData: unknown[]
    }
  }
  filters?: DashboardFilters
}

interface ComparisonMetricProps {
  currentValue: number
  compareValue: number
  label: string
  format?: 'currency' | 'number' | 'percentage'
  invertTrend?: boolean
  className?: string
}

function ComparisonMetric({
  currentValue,
  compareValue,
  label,
  format = 'currency',
  invertTrend = false,
  className,
}: ComparisonMetricProps) {
  const difference = currentValue - compareValue
  const percentageChange =
    compareValue !== 0 ? (difference / Math.abs(compareValue)) * 100 : 0

  const isIncrease = difference > 0
  const isDecrease = difference < 0
  const isNeutral = difference === 0

  const isPositiveTrend = invertTrend ? isDecrease : isIncrease
  const isNegativeTrend = invertTrend ? isIncrease : isDecrease

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
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <div className="text-sm text-muted-foreground mb-2">{label}</div>
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex-1">
          <div className="text-2xl font-bold">{formatValue(currentValue)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            vs {formatValue(compareValue)} (período anterior)
          </div>
        </div>
        <div
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-md text-sm font-semibold',
            isPositiveTrend && 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
            isNegativeTrend && 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
            isNeutral && 'bg-muted text-muted-foreground'
          )}
        >
          {isIncrease && <TrendingUp className="h-4 w-4" />}
          {isDecrease && <TrendingDown className="h-4 w-4" />}
          {isNeutral && <Minus className="h-4 w-4" />}
          <span>
            {isIncrease ? '+' : ''}
            {formatValue(difference)} ({isIncrease ? '+' : ''}
            {percentageChange.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  )
}

function formatPeriodByCompetencia(startDate: string, endDate: string): string {
  const { min, max } = mesReferenciaRangeFromDates(startDate, endDate)
  if (min === max) return formatMesReferenciaShort(min)
  return `${formatMesReferenciaShort(min)} – ${formatMesReferenciaShort(max)}`
}

function mergeComparisonSeries(
  currentSeries: CompetenciaTimeSeriesPoint[],
  compareSeries: CompetenciaTimeSeriesPoint[],
  currentLabel: string,
  compareLabel: string
) {
  const slots = Math.max(currentSeries.length, compareSeries.length, 1)

  return Array.from({ length: slots }, (_, index) => {
    const current = currentSeries[index]
    const compare = compareSeries[index]

    return {
      slot: `#${index + 1}`,
      mesLabel: current?.label ?? compare?.label ?? `#${index + 1}`,
      currentAmount: current?.amount ?? 0,
      compareAmount: compare?.amount ?? 0,
      currentMes: current?.date,
      compareMes: compare?.date,
      currentLabel,
      compareLabel,
    }
  })
}

export function ComparisonChart({ comparisonData, filters }: ComparisonChartProps) {
  const { currentPeriod, comparePeriod } = comparisonData

  const currentExpenses = currentPeriod.kpis.total_expenses ?? currentPeriod.kpis.totalSpent
  const compareExpenses = comparePeriod.kpis.total_expenses ?? comparePeriod.kpis.totalSpent
  const currentIncomes = currentPeriod.kpis.total_incomes ?? 0
  const compareIncomes = comparePeriod.kpis.total_incomes ?? 0
  const currentBalance = currentIncomes - currentExpenses
  const compareBalance = compareIncomes - compareExpenses

  const currentPeriodLabel =
    filters?.startDate && filters?.endDate
      ? formatPeriodByCompetencia(filters.startDate, filters.endDate)
      : 'Período atual'

  const comparePeriodLabel =
    filters?.compareStartDate && filters?.compareEndDate
      ? formatPeriodByCompetencia(filters.compareStartDate, filters.compareEndDate)
      : 'Período anterior'

  const currentCompetenciaSeries = useMemo(
    () => buildCompetenciaExpenseSeriesFromDaily(currentPeriod.timeSeriesData),
    [currentPeriod.timeSeriesData]
  )

  const compareCompetenciaSeries = useMemo(
    () => buildCompetenciaExpenseSeriesFromDaily(comparePeriod.timeSeriesData),
    [comparePeriod.timeSeriesData]
  )

  const barChartData = useMemo(
    () =>
      mergeComparisonSeries(
        currentCompetenciaSeries,
        compareCompetenciaSeries,
        currentPeriodLabel,
        comparePeriodLabel
      ),
    [currentCompetenciaSeries, compareCompetenciaSeries, currentPeriodLabel, comparePeriodLabel]
  )

  const hasChartData =
    currentCompetenciaSeries.some((p) => p.amount > 0) ||
    compareCompetenciaSeries.some((p) => p.amount > 0)

  return (
    <Card className="border-border/50 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Comparação de Períodos</CardTitle>
            <CardDescription className="mt-1">
              {filters?.startDate && filters?.endDate && (
                <>
                  {currentPeriodLabel} vs {comparePeriodLabel} — por competência (
                  <span className="font-mono text-xs">mes_referencia</span>)
                </>
              )}
            </CardDescription>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasChartData ? (
          <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
            <p className="text-sm font-medium text-muted-foreground mb-4">
              Gastos por competência (ordenados cronologicamente)
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="mesLabel" className="text-xs" />
                <YAxis
                  tickFormatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`}
                  className="text-xs"
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    const label =
                      name === 'currentAmount' ? currentPeriodLabel : comparePeriodLabel
                    return [formatCurrency(value), label]
                  }}
                  labelFormatter={(_, payload) => {
                    const item = payload?.[0]?.payload as (typeof barChartData)[number] | undefined
                    if (!item) return ''
                    const current = item.currentMes
                      ? formatMesReferenciaShort(item.currentMes)
                      : '—'
                    const compare = item.compareMes
                      ? formatMesReferenciaShort(item.compareMes)
                      : '—'
                    return `Atual: ${current} | Anterior: ${compare}`
                  }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Legend
                  formatter={(value) =>
                    value === 'currentAmount' ? currentPeriodLabel : comparePeriodLabel
                  }
                />
                <Bar
                  dataKey="compareAmount"
                  name="compareAmount"
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="currentAmount"
                  name="currentAmount"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/50 p-8 text-center text-muted-foreground text-sm">
            Sem dados de competência para comparar entre os períodos selecionados.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ComparisonMetric
            currentValue={currentExpenses}
            compareValue={compareExpenses}
            label="Total Gasto"
            format="currency"
            invertTrend
          />
          <ComparisonMetric
            currentValue={currentIncomes}
            compareValue={compareIncomes}
            label="Receitas"
            format="currency"
          />
          <ComparisonMetric
            currentValue={currentBalance}
            compareValue={compareBalance}
            label="Saldo Disponível"
            format="currency"
          />
          <ComparisonMetric
            currentValue={currentPeriod.kpis.dailyAverage}
            compareValue={comparePeriod.kpis.dailyAverage}
            label="Média Diária"
            format="currency"
            invertTrend
          />
          <ComparisonMetric
            currentValue={currentPeriod.kpis.monthlyProjection}
            compareValue={comparePeriod.kpis.monthlyProjection}
            label="Projeção Mensal"
            format="currency"
            invertTrend
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
