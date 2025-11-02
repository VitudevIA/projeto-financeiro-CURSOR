'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface ImprovedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  required?: boolean
}

/**
 * Input melhorado com acessibilidade WCAG AA
 */
export const ImprovedInput = React.forwardRef<HTMLInputElement, ImprovedInputProps>(
  ({ className, label, error, hint, required, id, ...props }, ref) => {
    const inputId = id || `input-${React.useId()}`
    const errorId = error ? `${inputId}-error` : undefined
    const hintId = hint ? `${inputId}-hint` : undefined

    return (
      <div className="space-y-2">
        <Label htmlFor={inputId} className={required ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
          {label}
        </Label>
        <Input
          id={inputId}
          ref={ref}
          className={cn(
            error && "border-red-500 focus-visible:ring-red-500",
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={cn(errorId, hintId)}
          aria-required={required}
          required={required}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-sm text-gray-500" role="note">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)

ImprovedInput.displayName = 'ImprovedInput'

