'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { requiresDoubleConfirmation } from '@/lib/utils/env'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  requireDoubleConfirm?: boolean
}

/**
 * Dialog de confirmação com suporte a confirmação dupla em produção
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  requireDoubleConfirm,
}: ConfirmDialogProps) {
  const [step, setStep] = useState(1)
  const [doubleConfirmText, setDoubleConfirmText] = useState('')

  const needsDoubleConfirm = requireDoubleConfirm ?? requiresDoubleConfirmation()
  const doubleConfirmExpected = 'CONFIRMAR EXCLUSÃO'

  const handleConfirm = () => {
    if (needsDoubleConfirm && step === 1) {
      setStep(2)
      return
    }

    if (needsDoubleConfirm && step === 2) {
      if (doubleConfirmText !== doubleConfirmExpected) {
        return
      }
    }

    onConfirm()
    setStep(1)
    setDoubleConfirmText('')
    onOpenChange(false)
  }

  const handleCancel = () => {
    setStep(1)
    setDoubleConfirmText('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {needsDoubleConfirm && step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-red-600 font-medium">
              Esta é uma ação destrutiva. Para confirmar, digite:
            </p>
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <p className="font-mono font-bold text-red-700 mb-2">
                {doubleConfirmExpected}
              </p>
              <input
                type="text"
                value={doubleConfirmText}
                onChange={(e) => setDoubleConfirmText(e.target.value.toUpperCase())}
                className="w-full p-2 border rounded"
                placeholder="Digite aqui para confirmar"
                autoFocus
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            disabled={needsDoubleConfirm && step === 2 && doubleConfirmText !== doubleConfirmExpected}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

