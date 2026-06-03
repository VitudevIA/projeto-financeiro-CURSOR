'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useBudgetsStore } from '@/lib/stores/budgets-store'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Trash2,
  Settings2,
  Target,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/utils/helpers'
import type { BudgetWithCategory } from '@/types/database.types'
import {
  formatMesReferenciaLabel,
  getCurrentMesReferencia,
  getMesReferenciaOptions,
} from '@/utils/mes-referencia'

const CATEGORY_ICONS = [Target, TrendingUp, AlertTriangle]

function getProgressBarClass(percentage: number): string {
  if (percentage > 100) return '[&>[data-slot=progress-indicator]]:bg-destructive'
  if (percentage >= 70) return '[&>[data-slot=progress-indicator]]:bg-yellow-500'
  return '[&>[data-slot=progress-indicator]]:bg-green-500'
}

function getStatusLabel(percentage: number): { text: string; className: string } {
  if (percentage > 100) {
    return { text: 'Estourado', className: 'bg-red-100 text-red-800 border-red-200' }
  }
  if (percentage >= 70) {
    return { text: 'Atenção', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
  }
  return { text: 'Saudável', className: 'bg-green-100 text-green-800 border-green-200' }
}

function getCategoryDisplayName(budget: BudgetWithCategory, fallback: string): string {
  return budget.categories?.name ?? fallback
}

export default function BudgetsPage() {
  const { budgets, loading, error, fetchBudgets, deleteBudget, updateBudget } = useBudgetsStore()
  const { categories, fetchCategories } = useCategoriesStore()
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMesReferencia)
  const [editingBudget, setEditingBudget] = useState<BudgetWithCategory | null>(null)
  const [editLimit, setEditLimit] = useState('')
  const [editAlert, setEditAlert] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const monthOptions = getMesReferenciaOptions()

  useEffect(() => {
    fetchBudgets(selectedMonth)
    fetchCategories()
  }, [fetchBudgets, fetchCategories, selectedMonth])

  const getCategoryName = (categoryId: string) => {
    return categories.find((cat) => cat.id === categoryId)?.name ?? 'Categoria'
  }

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return

    try {
      await deleteBudget(id)
      toast.success('Meta excluída com sucesso!')
    } catch {
      toast.error('Erro ao excluir meta')
    }
  }

  const openEditDialog = (budget: BudgetWithCategory) => {
    setEditingBudget(budget)
    setEditLimit(String(budget.limit_amount))
    setEditAlert(budget.alert_percentage != null ? String(budget.alert_percentage) : '')
  }

  const handleSaveEdit = async () => {
    if (!editingBudget) return

    const limit = parseFloat(editLimit)
    if (!limit || limit <= 0) {
      toast.error('Informe um valor de meta válido')
      return
    }

    const alertPercentage = editAlert.trim() ? parseFloat(editAlert) : null
    if (alertPercentage != null && (alertPercentage < 0 || alertPercentage > 100)) {
      toast.error('Alerta deve estar entre 0 e 100%')
      return
    }

    setSavingEdit(true)
    try {
      await updateBudget(editingBudget.id, {
        limit_amount: limit,
        alert_percentage: alertPercentage,
      })
      await fetchBudgets(selectedMonth)
      toast.success('Meta atualizada!')
      setEditingBudget(null)
    } catch {
      toast.error('Erro ao atualizar meta')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Metas & Benchmarks</h1>
          <p className="text-muted-foreground mt-1">
            Tetos mensais por categoria — independentes das transações, por competência
          </p>
        </div>
        <Link href={`/budgets/new?month=${selectedMonth}`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nova Meta
          </Button>
        </Link>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Competência</CardTitle>
          <CardDescription>
            Selecione o mês de referência para visualizar os benchmarks históricos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder="Mês de referência" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-2">
            Período ativo:{' '}
            <span className="font-medium text-foreground">
              {formatMesReferenciaLabel(selectedMonth)}
            </span>
          </p>
        </CardContent>
      </Card>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 space-y-4">
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-8 bg-muted rounded w-1/2" />
                <div className="h-2 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && error && (
        <Card className="border-destructive/30">
          <CardContent className="py-8 text-center text-destructive">{error}</CardContent>
        </Card>
      )}

      {!loading && !error && budgets.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground mb-4">
              Nenhuma meta definida para {formatMesReferenciaLabel(selectedMonth)}
            </p>
            <Link href={`/budgets/new?month=${selectedMonth}`}>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Definir primeira meta
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!loading && !error && budgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {budgets.map((budget, index) => {
            const usage = budget.usage_percentage ?? 0
            const spent = budget.spent_amount ?? 0
            const limit = budget.limit_amount
            const status = getStatusLabel(usage)
            const categoryName = getCategoryDisplayName(
              budget,
              getCategoryName(budget.category_id)
            )
            const Icon = CATEGORY_ICONS[index % CATEGORY_ICONS.length]

            return (
              <Card
                key={budget.id}
                className="relative overflow-hidden transition-shadow hover:shadow-md border-border/60"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{categoryName}</CardTitle>
                        <CardDescription className="text-xs">
                          Benchmark · {formatMesReferenciaLabel(selectedMonth)}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('shrink-0 text-xs', status.className)}>
                      {status.text}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Meta (teto)</p>
                      <p className="font-semibold text-lg">{formatCurrency(limit)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs mb-0.5">Gasto real</p>
                      <p
                        className={cn(
                          'font-semibold text-lg',
                          usage > 100 ? 'text-destructive' : 'text-foreground'
                        )}
                      >
                        {formatCurrency(spent)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{usage.toFixed(0)}% utilizado</span>
                      <span>
                        {spent > limit
                          ? `${formatCurrency(spent - limit)} acima`
                          : `${formatCurrency(Math.max(limit - spent, 0))} restante`}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(usage, 100)}
                      className={cn('h-2.5', getProgressBarClass(usage))}
                    />
                  </div>

                  {budget.alert_percentage != null && usage >= budget.alert_percentage && (
                    <p className="text-xs text-yellow-700 bg-yellow-50 rounded-md px-2 py-1.5 border border-yellow-200">
                      Alerta configurado em {budget.alert_percentage}% — limite próximo ou atingido
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => openEditDialog(budget)}
                    >
                      <Settings2 className="h-4 w-4 mr-1.5" />
                      Editar Meta
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteBudget(budget.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!editingBudget} onOpenChange={(open) => !open && setEditingBudget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Meta</DialogTitle>
            <DialogDescription>
              {editingBudget &&
                `${getCategoryDisplayName(editingBudget, getCategoryName(editingBudget.category_id))} · ${formatMesReferenciaLabel(selectedMonth)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-limit">Valor da meta (R$)</Label>
              <Input
                id="edit-limit"
                type="number"
                step="0.01"
                min="0"
                value={editLimit}
                onChange={(e) => setEditLimit(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-alert">Alerta em (% do teto)</Label>
              <Input
                id="edit-alert"
                type="number"
                min="0"
                max="100"
                placeholder="Ex: 80 (opcional)"
                value={editAlert}
                onChange={(e) => setEditAlert(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBudget(null)} disabled={savingEdit}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? 'Salvando...' : 'Salvar Meta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
