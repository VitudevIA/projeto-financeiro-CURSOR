'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Category } from '@/types/database.types'

type CategoryOption = Category & { color?: string | null }

interface TransactionCategoryPickerProps {
  transactionId: string
  categoryId: string
  categoryName: string
  categoryColor?: string | null
  categories: CategoryOption[]
  onCategoryChange: (
    transactionId: string,
    categoryId: string,
    category: CategoryOption
  ) => Promise<void>
  disabled?: boolean
}

const DEFAULT_DOT_COLOR = '#94a3b8'

export function TransactionCategoryPicker({
  transactionId,
  categoryId,
  categoryName,
  categoryColor,
  categories,
  onCategoryChange,
  disabled = false,
}: TransactionCategoryPickerProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSelect = async (category: CategoryOption) => {
    if (category.id === categoryId) {
      setOpen(false)
      return
    }

    setSaving(true)
    try {
      await onCategoryChange(transactionId, category.id, category)
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={(next) => !saving && setOpen(next)}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-auto max-w-full px-1.5 py-0.5 font-normal hover:bg-muted/80',
            saving && 'pointer-events-none opacity-60'
          )}
          aria-label={`Alterar categoria: ${categoryName}`}
          disabled={disabled || saving}
        >
          <Badge
            variant="secondary"
            className={cn(
              'gap-1 pr-1 font-normal',
              saving && 'animate-pulse'
            )}
          >
            {saving ? (
              <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
            ) : (
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: categoryColor || DEFAULT_DOT_COLOR }}
                aria-hidden
              />
            )}
            <span className="max-w-[100px] truncate sm:max-w-[140px]">{categoryName}</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start" sideOffset={4}>
        <div
          className="max-h-[min(280px,50vh)] overflow-y-auto overscroll-contain"
          role="listbox"
          aria-label="Selecionar categoria"
        >
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              role="option"
              aria-selected={category.id === categoryId}
              className={cn(
                'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
                category.id === categoryId && 'bg-accent/60 font-medium'
              )}
              onClick={() => handleSelect(category)}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: category.color || DEFAULT_DOT_COLOR }}
                aria-hidden
              />
              <span className="truncate">{category.name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
