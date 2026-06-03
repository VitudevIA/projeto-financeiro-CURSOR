'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/utils/helpers'
import { formatMesReferenciaShort, isValidMesReferencia } from '@/utils/mes-referencia'

interface TimeSeriesChartProps {
  data: Array<{
    date: string
    amount: number
    label?: string
  }>
  height?: number
  /** 'competencia' plota mes_referencia (YYYY-MM); 'date' plota datas diárias */
  axisMode?: 'date' | 'competencia'
}

export default function TimeSeriesChart({
  data,
  height = 300,
  axisMode = 'competencia',
}: TimeSeriesChartProps) {
  const formatTooltipValue = (value: number) => formatCurrency(value)

  const chartData = data.map((point) => {
    const isCompetencia =
      axisMode === 'competencia' || isValidMesReferencia(point.date)
    const label =
      point.label ??
      (isCompetencia ? formatMesReferenciaShort(point.date) : undefined)

    return {
      ...point,
      displayLabel: label ?? point.date,
    }
  })

  const formatXAxisLabel = (tickItem: string) => {
    const point = chartData.find((p) => p.date === tickItem || p.displayLabel === tickItem)
    if (point?.displayLabel) return point.displayLabel
    if (isValidMesReferencia(tickItem)) return formatMesReferenciaShort(tickItem)
    const date = new Date(tickItem)
    if (Number.isNaN(date.getTime())) return tickItem
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  const formatTooltipLabel = (label: string) => {
    const point = chartData.find((p) => p.date === label || p.displayLabel === label)
    if (point && isValidMesReferencia(point.date)) {
      return `Competência: ${point.displayLabel}`
    }
    if (isValidMesReferencia(label)) {
      return `Competência: ${formatMesReferenciaShort(label)}`
    }
    const date = new Date(label)
    if (Number.isNaN(date.getTime())) return label
    return `Data: ${date.toLocaleDateString('pt-BR')}`
  }

  if (chartData.length === 0) {
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey="date"
          tickFormatter={formatXAxisLabel}
          className="text-xs"
        />
        <YAxis
          tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
          className="text-xs"
        />
        <Tooltip
          formatter={(value: number) => [formatTooltipValue(value), 'Gasto']}
          labelFormatter={formatTooltipLabel}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
