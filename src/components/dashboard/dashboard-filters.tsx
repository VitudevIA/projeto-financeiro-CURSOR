'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import { useCardsStore } from '@/lib/stores/cards-store'
import { 
  Filter, 
  X, 
  Calendar, 
  TrendingUp, 
  CreditCard, 
  Tag,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle2
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

const getComparePeriodDates = (baseStart: string, baseEnd: string): { start: string; end: string } => {
  const startDate = new Date(baseStart)
  const endDate = new Date(baseEnd)
  const diffTime = endDate.getTime() - startDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  const compareStart = new Date(startDate)
  compareStart.setFullYear(startDate.getFullYear() - 1)
  
  const compareEnd = new Date(compareStart)
  compareEnd.setDate(compareStart.getDate() + diffDays)
  
  return {
    start: compareStart.toISOString().split('T')[0],
    end: compareEnd.toISOString().split('T')[0],
  }
}

const PERIOD_PRESETS = [
  { value: 'current-month' as const, label: 'Este Mês', icon: '📅', color: 'bg-primary/10 text-primary border-primary/20' },
  { value: 'last-month' as const, label: 'Mês Anterior', icon: '📆', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'last-quarter' as const, label: 'Último Trimestre', icon: '📊', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'last-year' as const, label: 'Ano Anterior', icon: '📈', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'compare' as const, label: 'Comparar Períodos', icon: '⚖️', color: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'custom' as const, label: 'Personalizado', icon: '⚙️', color: 'bg-gray-50 text-gray-700 border-gray-200' },
]

export function DashboardFilters({ filters, onFiltersChange, className, transactionCount }: DashboardFiltersProps) {
  const { categories, fetchCategories } = useCategoriesStore()
  const { cards, fetchCards } = useCardsStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    fetchCategories()
    fetchCards()
  }, [fetchCategories, fetchCards])

  const handlePresetChange = (preset: PeriodPreset) => {
    if (preset === 'compare') {
      const dates = getPeriodDates('current-month')
      const compareDates = getComparePeriodDates(dates.start, dates.end)
      onFiltersChange({
        ...filters,
        periodPreset: preset,
        startDate: dates.start,
        endDate: dates.end,
        compareMode: true,
        compareStartDate: compareDates.start,
        compareEndDate: compareDates.end,
      })
    } else if (preset === 'custom') {
      onFiltersChange({
        ...filters,
        periodPreset: preset,
        compareMode: false,
      })
      setShowAdvanced(true)
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

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value,
      periodPreset: 'custom',
    })
  }

  const handleCompareDateChange = (field: 'compareStartDate' | 'compareEndDate', value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value,
      periodPreset: 'compare',
    })
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

  const removeFilter = (type: 'category' | 'card') => {
    if (type === 'category') {
      handleCategoryChange('all')
    } else {
      handleCardChange('all')
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
    setShowAdvanced(false)
  }

  const activeCategory = categories.find(c => c.id === filters.categoryId)
  const activeCard = cards.find(c => c.id === filters.cardId)
  const hasActiveFilters = filters.categoryId || filters.cardId || filters.periodPreset !== 'current-month'
  const activePreset = PERIOD_PRESETS.find(p => p.value === filters.periodPreset)

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filtros Ativos - Barra Superior Moderna */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
            <Filter className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Filtros</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 bg-primary text-primary-foreground">
                {[filters.categoryId, filters.cardId, filters.periodPreset !== 'current-month'].filter(Boolean).length}
              </Badge>
            )}
          </div>

          {/* Chips de Filtros Ativos */}
          <div className="flex items-center gap-2 flex-wrap">
            {activePreset && filters.periodPreset !== 'current-month' && (
              <Badge 
                variant="outline" 
                className="gap-1.5 px-3 py-1.5 bg-background hover:bg-muted transition-colors"
              >
                <span>{activePreset.icon}</span>
                <span className="text-xs font-medium">{activePreset.label}</span>
                <button
                  onClick={() => handlePresetChange('current-month')}
                  className="ml-1 hover:bg-destructive/10 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            
            {activeCategory && (
              <Badge 
                variant="outline" 
                className="gap-1.5 px-3 py-1.5 bg-accent/50 hover:bg-accent transition-colors"
              >
                <Tag className="h-3 w-3" />
                <span className="text-xs font-medium">{activeCategory.name}</span>
                <button
                  onClick={() => removeFilter('category')}
                  className="ml-1 hover:bg-destructive/10 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {activeCard && (
              <Badge 
                variant="outline" 
                className="gap-1.5 px-3 py-1.5 bg-accent/50 hover:bg-accent transition-colors"
              >
                <CreditCard className="h-3 w-3" />
                <span className="text-xs font-medium">{activeCard.name}</span>
                <button
                  onClick={() => removeFilter('card')}
                  className="ml-1 hover:bg-destructive/10 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {filters.compareMode && (
              <Badge 
                variant="outline" 
                className="gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 transition-colors"
              >
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs font-medium">Comparação Ativa</span>
                <button
                  onClick={() => handlePresetChange('current-month')}
                  className="ml-1 hover:bg-destructive/10 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center gap-2">
          {transactionCount !== undefined && (
            <div className="px-3 py-1.5 bg-muted/50 rounded-lg border">
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
                Expandir
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Painel de Filtros Expandido */}
      {isExpanded && (
        <Card className="border-border/50 shadow-lg bg-gradient-to-br from-background to-muted/20">
          <CardContent className="p-6 space-y-6">
            {/* Presets de Período - Grid Moderno */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Período</Label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {PERIOD_PRESETS.map((preset) => {
                  const isActive = filters.periodPreset === preset.value
                  return (
                    <button
                      key={preset.value}
                      onClick={() => handlePresetChange(preset.value)}
                      className={cn(
                        "relative p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 hover:shadow-md",
                        "flex flex-col items-center gap-2 text-center",
                        isActive
                          ? preset.color + " border-current shadow-sm"
                          : "bg-background border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      {isActive && (
                        <div className="absolute top-2 right-2">
                          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                      <span className="text-2xl">{preset.icon}</span>
                      <span className={cn(
                        "text-xs font-medium",
                        isActive ? "text-current" : "text-muted-foreground"
                      )}>
                        {preset.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Datas Personalizadas */}
            {(filters.periodPreset === 'custom' || showAdvanced) && (
              <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-dashed">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold">Intervalo Personalizado</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date" className="text-xs text-muted-foreground">
                      Data Inicial
                    </Label>
                    <div className="relative">
                      <Input
                        id="start-date"
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => handleDateChange('startDate', e.target.value)}
                        className="w-full pl-10"
                      />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date" className="text-xs text-muted-foreground">
                      Data Final
                    </Label>
                    <div className="relative">
                      <Input
                        id="end-date"
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => handleDateChange('endDate', e.target.value)}
                        className="w-full pl-10"
                      />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modo Comparação */}
            {filters.compareMode && filters.periodPreset === 'compare' && (
              <div className="space-y-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-700 dark:text-green-400" />
                  <Label className="text-sm font-semibold text-green-700 dark:text-green-400">
                    Período de Comparação
                  </Label>
                  <Badge variant="outline" className="ml-auto bg-green-100 text-green-700 border-green-300">
                    Ano Anterior
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="compare-start-date" className="text-xs text-muted-foreground">
                      Data Inicial
                    </Label>
                    <div className="relative">
                      <Input
                        id="compare-start-date"
                        type="date"
                        value={filters.compareStartDate || ''}
                        onChange={(e) => handleCompareDateChange('compareStartDate', e.target.value)}
                        className="w-full pl-10 bg-white dark:bg-background"
                      />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="compare-end-date" className="text-xs text-muted-foreground">
                      Data Final
                    </Label>
                    <div className="relative">
                      <Input
                        id="compare-end-date"
                        type="date"
                        value={filters.compareEndDate || ''}
                        onChange={(e) => handleCompareDateChange('compareEndDate', e.target.value)}
                        className="w-full pl-10 bg-white dark:bg-background"
                      />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filtros Adicionais - Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Categoria */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <Tag className="h-4 w-4 text-primary" />
                  Categoria
                </Label>
                <Select
                  value={filters.categoryId || 'all'}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="w-full h-11 bg-background hover:bg-muted/50 transition-colors">
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-muted" />
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
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Cartão
                </Label>
                <Select
                  value={filters.cardId || 'all'}
                  onValueChange={handleCardChange}
                >
                  <SelectTrigger className="w-full h-11 bg-background hover:bg-muted/50 transition-colors">
                    <SelectValue placeholder="Todos os cartões" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-muted" />
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
