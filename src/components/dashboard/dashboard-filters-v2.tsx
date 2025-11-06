'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import { useCardsStore } from '@/lib/stores/cards-store'
import { MonthYearPicker } from './month-year-picker'
import { 
  Filter, 
  X, 
  Calendar, 
  TrendingUp, 
  CreditCard, 
  Tag,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type PeriodPreset = 'current-month' | 'last-month' | 'last-quarter' | 'last-year' | 'custom' | 'compare'

export interface DashboardFilters {
  startDate: string
  endDate: string
  categoryId: string | null
  cardId: string | null
  periodPreset: PeriodPreset
  compareMode: boolean
  compareStartDate?: string
  compareEndDate?: string
}

interface DashboardFiltersProps {
  filters: DashboardFilters
  onFiltersChange: (filters: DashboardFilters) => void
  className?: string
  transactionCount?: number
}

const getPeriodDates = (preset: PeriodPreset): { start: string; end: string } => {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  switch (preset) {
    case 'current-month': {
      const start = new Date(currentYear, currentMonth, 1)
      const end = new Date(currentYear, currentMonth + 1, 0)
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      }
    }
    case 'last-month': {
      const start = new Date(currentYear, currentMonth - 1, 1)
      const end = new Date(currentYear, currentMonth, 0)
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      }
    }
    case 'last-quarter': {
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3 - 3
      const start = new Date(currentYear, quarterStartMonth < 0 ? quarterStartMonth + 12 : quarterStartMonth, 1)
      if (quarterStartMonth < 0) start.setFullYear(currentYear - 1)
      const end = new Date(currentYear, Math.floor(currentMonth / 3) * 3, 0)
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      }
    }
    case 'last-year': {
      const start = new Date(currentYear - 1, 0, 1)
      const end = new Date(currentYear - 1, 11, 31)
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      }
    }
    default:
      return {
        start: new Date(currentYear, currentMonth, 1).toISOString().split('T')[0],
        end: new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0],
      }
  }
}

export function DashboardFilters({ filters, onFiltersChange, className, transactionCount }: DashboardFiltersProps) {
  const { categories, fetchCategories } = useCategoriesStore()
  const { cards, fetchCards } = useCardsStore()
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    fetchCategories()
    fetchCards()
  }, [fetchCategories, fetchCards])

  // Extrair mês e ano das datas
  const currentMonth = useMemo(() => {
    const date = new Date(filters.startDate)
    return { month: date.getMonth(), year: date.getFullYear() }
  }, [filters.startDate])

  const handleMonthYearChange = (value: { month: number; year: number }) => {
    const start = new Date(value.year, value.month, 1)
    const end = new Date(value.year, value.month + 1, 0)
    onFiltersChange({
      ...filters,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      periodPreset: 'custom',
    })
  }

  const handlePresetChange = (preset: PeriodPreset) => {
    if (preset === 'compare') {
      const dates = getPeriodDates('current-month')
      const compareStart = new Date(dates.start)
      compareStart.setFullYear(compareStart.getFullYear() - 1)
      const compareEnd = new Date(dates.end)
      compareEnd.setFullYear(compareEnd.getFullYear() - 1)
      
      onFiltersChange({
        ...filters,
        periodPreset: preset,
        startDate: dates.start,
        endDate: dates.end,
        compareMode: true,
        compareStartDate: compareStart.toISOString().split('T')[0],
        compareEndDate: compareEnd.toISOString().split('T')[0],
      })
    } else {
      const dates = getPeriodDates(preset)
      onFiltersChange({
        ...filters,
        periodPreset: preset,
        startDate: dates.start,
        endDate: dates.end,
        compareMode: false,
      })
    }
  }

  const handleCategoryChange = (categoryId: string) => {
    onFiltersChange({
      ...filters,
      categoryId: categoryId === 'all' ? null : categoryId,
    })
  }

  const handleCardChange = (cardId: string) => {
    onFiltersChange({
      ...filters,
      cardId: cardId === 'all' ? null : cardId,
    })
  }

  const removeFilter = (type: 'category' | 'card' | 'preset') => {
    if (type === 'category') {
      handleCategoryChange('all')
    } else if (type === 'card') {
      handleCardChange('all')
    } else {
      handlePresetChange('current-month')
    }
  }

  const resetFilters = () => {
    const dates = getPeriodDates('current-month')
    onFiltersChange({
      startDate: dates.start,
      endDate: dates.end,
      categoryId: null,
      cardId: null,
      periodPreset: 'current-month',
      compareMode: false,
    })
  }

  const activeCategory = categories.find(c => c.id === filters.categoryId)
  const activeCard = cards.find(c => c.id === filters.cardId)
  const hasActiveFilters = filters.categoryId || filters.cardId || filters.periodPreset !== 'current-month'

  return (
    <div className={cn("space-y-3", className)}>
      {/* Barra Superior - Compacta e Profissional */}
      <div className="flex items-center justify-between gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-900/50 dark:to-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
        {/* Seletor de Mês/Ano - Estilo Referência */}
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Período:</span>
          </div>
          <MonthYearPicker
            value={currentMonth}
            onChange={handleMonthYearChange}
            onCurrentMonth={() => handlePresetChange('current-month')}
            className="max-w-[180px]"
          />
          
          {/* Quick Actions */}
          <div className="hidden md:flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePresetChange('last-month')}
              className={cn(
                "h-8 px-2 text-xs",
                filters.periodPreset === 'last-month' && "bg-primary/10 text-primary"
              )}
            >
              Mês Anterior
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePresetChange('last-quarter')}
              className={cn(
                "h-8 px-2 text-xs",
                filters.periodPreset === 'last-quarter' && "bg-primary/10 text-primary"
              )}
            >
              Trimestre
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePresetChange('compare')}
              className={cn(
                "h-8 px-2 text-xs",
                filters.compareMode && "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
              )}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Comparar
            </Button>
          </div>
        </div>

        {/* Filtros Ativos como Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeCategory && (
            <Badge 
              variant="outline" 
              className="gap-1.5 px-2.5 py-1 bg-accent/50 hover:bg-accent"
            >
              <Tag className="h-3 w-3" />
              <span className="text-xs font-medium">{activeCategory.name}</span>
              <button
                onClick={() => removeFilter('category')}
                className="ml-0.5 hover:bg-destructive/10 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {activeCard && (
            <Badge 
              variant="outline" 
              className="gap-1.5 px-2.5 py-1 bg-accent/50 hover:bg-accent"
            >
              <CreditCard className="h-3 w-3" />
              <span className="text-xs font-medium">{activeCard.name}</span>
              <button
                onClick={() => removeFilter('card')}
                className="ml-0.5 hover:bg-destructive/10 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.compareMode && (
            <Badge 
              variant="outline" 
              className="gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400"
            >
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs font-medium">Comparação</span>
              <button
                onClick={() => removeFilter('preset')}
                className="ml-0.5 hover:bg-destructive/10 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>

        {/* Ações e Contador */}
        <div className="flex items-center gap-2">
          {transactionCount !== undefined && (
            <div className="px-2.5 py-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <span className="text-xs font-medium text-muted-foreground">
                <span className="font-semibold text-foreground">{transactionCount}</span> resultado{transactionCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 gap-1.5 text-xs hover:bg-destructive/10 hover:text-destructive"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 gap-1.5 text-xs"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Ocultar
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Mais Filtros
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Painel Expandido - Filtros Adicionais */}
      {isExpanded && (
        <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Categoria */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Tag className="h-4 w-4 text-primary" />
                Categoria
              </label>
              <Select
                value={filters.categoryId || 'all'}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="w-full h-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-300" />
                      <span>Todas as categorias</span>
                    </div>
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cartão */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CreditCard className="h-4 w-4 text-primary" />
                Cartão
              </label>
              <Select
                value={filters.cardId || 'all'}
                onValueChange={handleCardChange}
              >
                <SelectTrigger className="w-full h-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <SelectValue placeholder="Todos os cartões" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-300" />
                      <span>Todos os cartões</span>
                    </div>
                  </SelectItem>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{card.name}</span>
                        {card.last_digits && (
                          <span className="text-xs text-muted-foreground">({card.last_digits})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

