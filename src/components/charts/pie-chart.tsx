'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { formatCurrency } from '@/utils/helpers'

interface PieChartProps {
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

export default function PieChartComponent({ data, height = 300 }: PieChartProps) {
  const formatTooltipValue = (value: number) => formatCurrency(value)
  
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null // Don't show labels for slices less than 5%
    
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color || COLORS[index % COLORS.length]} 
            />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number) => [formatTooltipValue(value), 'Valor']}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          formatter={(value) => <span className="text-sm">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
