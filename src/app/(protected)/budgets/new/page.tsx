'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBudgetsStore } from '@/lib/stores/budgets-store'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewBudgetPage() {
  const [formData, setFormData] = useState({
    categoryId: '',
    month: new Date().toISOString().slice(0, 7) + '-01',
    limitAmount: '',
    alertPercentage: '80',
  })
  const [loading, setLoading] = useState(false)
  
  const { addBudget } = useBudgetsStore()
  const { categories, fetchCategories } = useCategoriesStore()
  const router = useRouter()

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const budgetData = {
      category_id: formData.categoryId,
      month: formData.month,
      limit_amount: parseFloat(formData.limitAmount),
      alert_percentage: parseInt(formData.alertPercentage),
    }

    const { error } = await addBudget(budgetData)
    
    if (error) {
      toast.error(error)
    } else {
      toast.success('Orçamento criado com sucesso!')
      router.push('/budgets')
    }
    
    setLoading(false)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/budgets">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Orçamento</h1>
          <p className="text-gray-600">Defina um limite de gastos para uma categoria</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Orçamento</CardTitle>
          <CardDescription>
            Configure o limite mensal e alertas para uma categoria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria *
                </label>
                <Select value={formData.categoryId} onValueChange={(value) => handleInputChange('categoryId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">
                  Mês *
                </label>
                <Input
                  id="month"
                  type="month"
                  value={formData.month.slice(0, 7)}
                  onChange={(e) => handleInputChange('month', e.target.value + '-01')}
                  required
                />
              </div>

              <div>
                <label htmlFor="limitAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  Limite Mensal (R$) *
                </label>
                <Input
                  id="limitAmount"
                  type="number"
                  step="0.01"
                  value={formData.limitAmount}
                  onChange={(e) => handleInputChange('limitAmount', e.target.value)}
                  placeholder="1000.00"
                  required
                />
              </div>

              <div>
                <label htmlFor="alertPercentage" className="block text-sm font-medium text-gray-700 mb-1">
                  Alerta em (%)
                </label>
                <Input
                  id="alertPercentage"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.alertPercentage}
                  onChange={(e) => handleInputChange('alertPercentage', e.target.value)}
                  placeholder="80"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Receberá alerta quando atingir esta porcentagem do limite
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Link href="/budgets">
                <Button variant="outline" type="button">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Orçamento'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
