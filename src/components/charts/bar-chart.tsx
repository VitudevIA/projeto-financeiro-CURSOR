'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/utils/helpers'

interface BarChartProps {
  data: Array<{
    name: string
    value: number
    color?: string
  }>
  height?: number
}

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
]

export default function BarChartComponent({ data, height = 300 }: BarChartProps) {
  const formatTooltipValue = (value: number) => formatCurrency(value)
  const formatYAxisValue = (value: number) => `R$ ${value.toLocaleString('pt-BR')}`

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="name" 
          className="text-xs"
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          tickFormatter={formatYAxisValue}
          className="text-xs"
        />
        <Tooltip 
          formatter={(value: number) => [formatTooltipValue(value), 'Valor']}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Bar 
          dataKey="value" 
          fill="#3B82F6"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
