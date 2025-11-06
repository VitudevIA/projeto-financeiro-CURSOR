'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MonthYearPickerProps {
  value: { month: number; year: number }
  onChange: (value: { month: number; year: number }) => void
  onCurrentMonth?: () => void
  className?: string
}

const MONTHS = [
  { value: 0, label: 'JAN' },
  { value: 1, label: 'FEV' },
  { value: 2, label: 'MAR' },
  { value: 3, label: 'ABR' },
  { value: 4, label: 'MAI' },
  { value: 5, label: 'JUN' },
  { value: 6, label: 'JUL' },
  { value: 7, label: 'AGO' },
  { value: 8, label: 'SET' },
  { value: 9, label: 'OUT' },
  { value: 10, label: 'NOV' },
  { value: 11, label: 'DEZ' },
]

const MONTHS_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export function MonthYearPicker({ value, onChange, onCurrentMonth, className }: MonthYearPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [displayYear, setDisplayYear] = useState(value.year)
  const [displayMonth, setDisplayMonth] = useState(value.month)

  useEffect(() => {
    setDisplayYear(value.year)
    setDisplayMonth(value.month)
  }, [value.year, value.month])

  const handleMonthSelect = (month: number) => {
    setDisplayMonth(month)
    onChange({ month, year: displayYear })
    setIsOpen(false)
  }

  const handleYearChange = (direction: 'prev' | 'next') => {
    setDisplayYear(prev => direction === 'prev' ? prev - 1 : prev + 1)
  }

  const handleCurrentMonth = () => {
    const now = new Date()
    onChange({ month: now.getMonth(), year: now.getFullYear() })
    if (onCurrentMonth) onCurrentMonth()
    setIsOpen(false)
  }

  const currentMonthName = MONTHS_FULL[value.month]?.toLowerCase() || ''
  const isCurrentMonth = value.month === new Date().getMonth() && value.year === new Date().getFullYear()

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 rounded-lg",
            "bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700",
            "border border-gray-200 dark:border-gray-700",
            "text-left font-normal text-sm text-gray-700 dark:text-gray-300",
            "transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20",
            className
          )}
        >
          <span>{currentMonthName}</span>
          <ChevronRight className="h-4 w-4 text-gray-400 rotate-90" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-0 shadow-xl" align="start">
        <div className="rounded-lg overflow-hidden">
          {/* Header Roxo - Exatamente como na referência */}
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 rounded-full"
              onClick={() => handleYearChange('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-bold text-lg">{displayYear}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 rounded-full"
              onClick={() => handleYearChange('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Grid de Meses - 3x4 como na referência */}
          <div className="bg-white dark:bg-gray-900 p-4">
            <div className="grid grid-cols-4 gap-2 w-[280px]">
              {MONTHS.map((month) => {
                const isSelected = month.value === displayMonth && displayYear === value.year
                const isCurrent = month.value === new Date().getMonth() && displayYear === new Date().getFullYear()
                
                return (
                  <button
                    key={month.value}
                    onClick={() => handleMonthSelect(month.value)}
                    className={cn(
                      "py-2.5 px-3 rounded-md text-sm font-medium transition-all",
                      "hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20",
                      isSelected && "bg-primary text-primary-foreground shadow-sm",
                      !isSelected && "text-gray-600 dark:text-gray-400",
                      isCurrent && !isSelected && "bg-primary/5 text-primary dark:bg-primary/10"
                    )}
                  >
                    {month.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Footer com Botões - Estilo referência */}
          <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setIsOpen(false)}
              className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
            >
              CANCELAR
            </button>
            <button
              onClick={handleCurrentMonth}
              className={cn(
                "text-primary hover:text-primary/80 text-sm font-medium transition-colors",
                isCurrentMonth && "font-semibold"
              )}
            >
              MÊS ATUAL
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

