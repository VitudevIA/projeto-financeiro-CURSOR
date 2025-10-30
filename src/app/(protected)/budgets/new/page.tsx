'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBudgetsStore } from '@/lib/stores/budgets-store'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface BudgetFormData {
  categoryId: string
  month: string
  limitAmount: number
  alertPercentage: number | null
}

export default function NewBudgetPage() {
  const router = useRouter()
  const { addBudget, loading } = useBudgetsStore()
  const { categories } = useCategoriesStore()
  const [formData, setFormData] = useState<BudgetFormData>({
    categoryId: '',
    month: '',
    limitAmount: 0,
    alertPercentage: null
  })

  // Filtra apenas categorias de despesas para orçamentos
  const expenseCategories = categories.filter(cat => cat.type === 'expense')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.categoryId || !formData.month || formData.limitAmount <= 0) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    try {
      const budgetData = {
        category_id: formData.categoryId,
        month: formData.month,
        limit_amount: formData.limitAmount,
        alert_percentage: formData.alertPercentage,
      }

      await addBudget(budgetData)
      
      toast.success('Orçamento criado com sucesso!')
      router.push('/budgets')
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const handleInputChange = (field: keyof BudgetFormData, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Gera opções de meses (próximos 12 meses)
  const getMonthOptions = () => {
    const options = []
    const today = new Date()
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1)
      const value = date.toISOString().split('T')[0]
      const label = date.toLocaleDateString('pt-BR', { 
        year: 'numeric', 
        month: 'long' 
      })
      options.push({ value, label })
    }
    
    return options
  }

  const monthOptions = getMonthOptions()

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Criar Novo Orçamento</CardTitle>
            <CardDescription>
              Defina um limite de gastos para uma categoria específica no mês
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {/* Categoria */}
                <div className="space-y-2">
                  <label htmlFor="category" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Categoria *
                  </label>
                  <Select 
                    value={formData.categoryId} 
                    onValueChange={(value) => handleInputChange('categoryId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Mês */}
                <div className="space-y-2">
                  <label htmlFor="month" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Mês *
                  </label>
                  <Select 
                    value={formData.month} 
                    onValueChange={(value) => handleInputChange('month', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Valor Limite */}
                <div className="space-y-2">
                  <label htmlFor="limitAmount" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Valor Limite (R$) *
                  </label>
                  <Input
                    id="limitAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={formData.limitAmount || ''}
                    onChange={(e) => handleInputChange('limitAmount', parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                {/* Percentual de Alerta */}
                <div className="space-y-2">
                  <label htmlFor="alertPercentage" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Percentual de Alerta (%)
                  </label>
                  <Input
                    id="alertPercentage"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="80"
                    value={formData.alertPercentage || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleInputChange('alertPercentage', value ? parseInt(value) : null)
                    }}
                  />
                  <p className="text-sm text-muted-foreground">
                    Receba um alerta quando atingir esta porcentagem do limite (opcional)
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/budgets')}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                >
                  {loading ? 'Criando...' : 'Criar Orçamento'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}