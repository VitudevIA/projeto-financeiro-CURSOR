'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/utils/helpers'

interface TimeSeriesChartProps {
  data: Array<{
    date: string
    amount: number
    label?: string
  }>
  height?: number
}

export default function TimeSeriesChart({ data, height = 300 }: TimeSeriesChartProps) {
  const formatTooltipValue = (value: number) => formatCurrency(value)
  const formatXAxisLabel = (tickItem: string) => {
    const date = new Date(tickItem)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
          labelFormatter={(label) => `Data: ${new Date(label).toLocaleDateString('pt-BR')}`}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
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
