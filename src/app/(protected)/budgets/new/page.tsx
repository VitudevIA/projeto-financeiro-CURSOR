'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useBudgetsStore } from '@/lib/stores/budgets-store'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Target } from 'lucide-react'
import {
  formatMesReferenciaLabel,
  getCurrentMesReferencia,
  getMesReferenciaOptions,
  isValidMesReferencia,
} from '@/utils/mes-referencia'

interface BudgetFormData {
  categoryId: string
  mesReferencia: string
  limitAmount: number
  alertPercentage: string
}

function NewBudgetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { upsertBudget, loading, budgets, fetchBudgets } = useBudgetsStore()
  const { categories, fetchCategories } = useCategoriesStore()

  const monthFromQuery = searchParams.get('month')
  const initialMesReferencia =
    monthFromQuery && isValidMesReferencia(monthFromQuery)
      ? monthFromQuery
      : getCurrentMesReferencia()

  const [formData, setFormData] = useState<BudgetFormData>({
    categoryId: '',
    mesReferencia: initialMesReferencia,
    limitAmount: 0,
    alertPercentage: '',
  })

  const expenseCategories = categories.filter(
    (cat) => cat.type === 'expense' || !cat.type
  )

  const monthOptions = getMesReferenciaOptions()

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchBudgets(formData.mesReferencia)
  }, [fetchBudgets, formData.mesReferencia])

  const existingForSelection = budgets.find((b) => b.category_id === formData.categoryId)

  const handleCategoryChange = (categoryId: string) => {
    const existing = budgets.find((b) => b.category_id === categoryId)
    setFormData((prev) => ({
      ...prev,
      categoryId,
      limitAmount: existing?.limit_amount ?? 0,
      alertPercentage:
        existing?.alert_percentage != null ? String(existing.alert_percentage) : '',
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.categoryId) {
      toast.error('Selecione uma categoria')
      return
    }

    if (!formData.limitAmount || formData.limitAmount <= 0) {
      toast.error('Informe um valor de meta maior que zero')
      return
    }

    const alertPercentage = formData.alertPercentage.trim()
      ? parseFloat(formData.alertPercentage)
      : null

    if (alertPercentage != null && (alertPercentage < 0 || alertPercentage > 100)) {
      toast.error('Alerta deve estar entre 0 e 100%')
      return
    }

    try {
      await upsertBudget({
        category_id: formData.categoryId,
        mesReferencia: formData.mesReferencia,
        limit_amount: formData.limitAmount,
        alert_percentage: alertPercentage,
      })

      toast.success(
        existingForSelection
          ? 'Meta atualizada para este mês!'
          : 'Meta definida com sucesso!'
      )
      router.push('/budgets')
    } catch (error) {
      toast.error((error as Error).message || 'Erro ao salvar meta')
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-xl mx-auto">
        <Card className="border-border/50 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Definir Meta Mensal</CardTitle>
                <CardDescription>
                  Benchmark de gastos por categoria — competência{' '}
                  {formatMesReferenciaLabel(formData.mesReferencia)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="mesReferencia">Mês de referência *</Label>
                <Select
                  value={formData.mesReferencia}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, mesReferencia: value, categoryId: '' }))
                  }
                >
                  <SelectTrigger id="mesReferencia">
                    <SelectValue placeholder="Selecione a competência" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Persistido como {formData.mesReferencia}-01 no banco
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select value={formData.categoryId} onValueChange={handleCategoryChange}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecione a categoria de despesa" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((category) => {
                      const hasBudget = budgets.some((b) => b.category_id === category.id)
                      return (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                          {hasBudget ? ' (meta existente — será atualizada)' : ''}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {existingForSelection && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                    Já existe meta para esta categoria em{' '}
                    {formatMesReferenciaLabel(formData.mesReferencia)}. Ao salvar, o valor será
                    atualizado (upsert).
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="limitAmount">Valor do teto / benchmark (R$) *</Label>
                <Input
                  id="limitAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={formData.limitAmount || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      limitAmount: parseFloat(e.target.value) || 0,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alertPercentage">Alerta visual (% do teto)</Label>
                <Input
                  id="alertPercentage"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Ex: 80 (opcional)"
                  value={formData.alertPercentage}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, alertPercentage: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Quando o gasto real atingir este percentual, o card exibirá aviso
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push('/budgets')}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading
                    ? 'Salvando...'
                    : existingForSelection
                      ? 'Atualizar Meta'
                      : 'Salvar Meta'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function NewBudgetPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-6 text-center text-muted-foreground">
          Carregando formulário...
        </div>
      }
    >
      <NewBudgetForm />
    </Suspense>
  )
}
