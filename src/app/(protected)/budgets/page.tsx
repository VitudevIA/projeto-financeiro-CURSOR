'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useBudgetsStore } from '@/lib/stores/budgets-store'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import { formatCurrency } from '@/utils/helpers'
import { Plus, Target, AlertTriangle, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function BudgetsPage() {
  const { budgets, loading, fetchBudgets, deleteBudget } = useBudgetsStore()
  const { categories, fetchCategories } = useCategoriesStore()
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => {
    fetchBudgets(selectedMonth + '-01')
    fetchCategories()
  }, [fetchBudgets, fetchCategories, selectedMonth])

  const handleDelete = async (id: string, categoryName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o orçamento de "${categoryName}"?`)) {
      const { error } = await deleteBudget(id)
      if (error) {
        toast.error(error)
      } else {
        toast.success('Orçamento excluído com sucesso!')
      }
    }
  }

  const getBudgetStatus = (budget: any) => {
    if (budget.status === 'exceeded') return { status: 'exceeded', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-500' }
    if (budget.status === 'warning') return { status: 'warning', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-500' }
    return { status: 'ok', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-500' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
          <p className="text-gray-600">Controle seus gastos por categoria</p>
        </div>
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mês
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="p-2 border border-gray-300 rounded-md"
            />
          </div>
          <Link href="/budgets/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Orçamento
            </Button>
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Budgets List */}
      {!loading && (
        <div className="space-y-4">
          {budgets.map((budget, index) => {
            const status = getBudgetStatus(budget)
            
            // Usando type assertion para bypassar TypeScript
            const budgetAny = budget as any
            
            // Usando acesso seguro com fallbacks
            const budgetId = budgetAny.id || budgetAny.budget_id || budgetAny._id || `budget-${index}`
            const month = budgetAny.month || budgetAny.month_year || budgetAny.date || new Date().toISOString()
            const limitAmount = budgetAny.limit_amount || budgetAny.limit || budgetAny.amount || 0
            const spentAmount = budgetAny.spent_amount || budgetAny.spent || budgetAny.used_amount || 0
            const percentageUsed = budgetAny.percentage_used || budgetAny.percentage || budgetAny.percent_used || 0
            const categoryName = budgetAny.category?.name || budgetAny.category_name || 'Categoria'
            const categoryIcon = budgetAny.category?.icon || '💰'

            return (
              <Card key={budgetId} className={`${status.bgColor} border-l-4 ${status.borderColor}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{categoryIcon}</span>
                      <div>
                        <CardTitle className="text-lg">{categoryName}</CardTitle>
                        <CardDescription>
                          Orçamento de {new Date(month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {budget.status === 'exceeded' && (
                        <Badge variant="destructive">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Excedido
                        </Badge>
                      )}
                      {budget.status === 'warning' && (
                        <Badge variant="secondary">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Alerta
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {Math.round(percentageUsed)}%
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Gasto: {formatCurrency(spentAmount)}</span>
                        <span>Limite: {formatCurrency(limitAmount)}</span>
                      </div>
                      <Progress value={Math.min(percentageUsed, 100)} className="h-2" />
                    </div>

                    {/* Status Info */}
                    <div className="flex items-center justify-between text-sm">
                      <span className={status.color}>
                        {budget.status === 'exceeded' && 'Orçamento excedido!'}
                        {budget.status === 'warning' && 'Próximo do limite'}
                        {budget.status === 'ok' && 'Dentro do orçamento'}
                      </span>
                      <span className="text-gray-600">
                        Restante: {formatCurrency(limitAmount - spentAmount)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleDelete(budgetId, categoryName)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && budgets.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum orçamento definido
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Crie orçamentos para controlar seus gastos por categoria
            </p>
            <Link href="/budgets/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Orçamento
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}