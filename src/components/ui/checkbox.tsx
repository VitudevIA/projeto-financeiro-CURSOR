"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon, MinusIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface CheckboxProps extends React.ComponentProps<typeof CheckboxPrimitive.Root> {
  indeterminate?: boolean
}

function Checkbox({
  className,
  indeterminate,
  ...props
}: CheckboxProps) {
  const checkboxRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (checkboxRef.current && indeterminate !== undefined) {
      // @ts-ignore - propriedade indeterminate nativa do checkbox HTML
      checkboxRef.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  return (
    <CheckboxPrimitive.Root
      ref={checkboxRef}
      data-slot="checkbox"
      className={cn(
        "peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        indeterminate && "data-[state=unchecked]:bg-primary data-[state=unchecked]:border-primary",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        {indeterminate ? (
          <MinusIcon className="size-3.5" />
        ) : (
          <CheckIcon className="size-3.5" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
