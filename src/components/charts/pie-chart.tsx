'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import type { PieLabelRenderProps } from 'recharts'
import { formatCurrency } from '@/utils/helpers'
import { cn } from '@/lib/utils'

interface PieChartDataItem {
  name: string
  value: number
  color?: string
  categoryId?: string
}

interface PieChartProps {
  data: PieChartDataItem[]
  height?: number
  activeCategoryId?: string | null
  onCategoryClick?: (categoryId: string | null, categoryName: string) => void
}

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
]

export default function PieChartComponent({
  data,
  height = 300,
  activeCategoryId = null,
  onCategoryClick,
}: PieChartProps) {
  const formatTooltipValue = (value: number) => formatCurrency(value)

  const handleSliceClick = (entry: PieChartDataItem) => {
    if (!onCategoryClick || !entry.categoryId) return
    const nextId = activeCategoryId === entry.categoryId ? null : entry.categoryId
    onCategoryClick(nextId, entry.name)
  }

  const renderCustomizedLabel = (props: PieLabelRenderProps) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props
    const pct = typeof percent === 'number' ? percent : 0

    if (
      pct < 0.05 ||
      typeof cx !== 'number' ||
      typeof cy !== 'number' ||
      typeof midAngle !== 'number' ||
      typeof innerRadius !== 'number' ||
      typeof outerRadius !== 'number'
    ) {
      return null
    }

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
        {`${(pct * 100).toFixed(0)}%`}
      </text>
    )
  }

  if (data.length === 0) {
    return null
  }

  const chartData = data as Array<PieChartDataItem & Record<string, string | number>>

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          style={onCategoryClick ? { cursor: 'pointer' } : undefined}
          onClick={(_, index) => {
            const entry = data[index]
            if (entry) handleSliceClick(entry)
          }}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${entry.categoryId ?? entry.name}-${index}`}
              fill={entry.color || COLORS[index % COLORS.length]}
              stroke={activeCategoryId === entry.categoryId ? '#1e293b' : undefined}
              strokeWidth={activeCategoryId === entry.categoryId ? 3 : 0}
              style={onCategoryClick ? { cursor: 'pointer' } : undefined}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [formatTooltipValue(value), 'Valor']}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          content={() => (
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2">
              {data.map((entry, index) => (
                <button
                  key={`legend-${entry.categoryId ?? entry.name}-${index}`}
                  type="button"
                  disabled={!onCategoryClick || !entry.categoryId}
                  onClick={() => handleSliceClick(entry)}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-sm transition-opacity',
                    onCategoryClick && entry.categoryId
                      ? 'cursor-pointer hover:opacity-80'
                      : 'cursor-default',
                    activeCategoryId === entry.categoryId && 'font-semibold underline'
                  )}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color || COLORS[index % COLORS.length] }}
                  />
                  <span>{entry.name}</span>
                </button>
              ))}
            </div>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
