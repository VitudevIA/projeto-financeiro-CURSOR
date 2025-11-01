'use client'

import { useEffect, useState } from 'react'
import { useBudgetsStore } from '@/lib/stores/budgets-store'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Edit } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function BudgetsPage() {
  const { budgets, loading, error, fetchBudgets, deleteBudget } = useBudgetsStore()
  const { categories, fetchCategories } = useCategoriesStore() // ← Adicione fetchCategories aqui
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    fetchBudgets(selectedMonth + '-01')
    fetchCategories()
  }, [fetchBudgets, fetchCategories, selectedMonth])

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este orçamento?')) return

    try {
      await deleteBudget(id)
      toast.success('Orçamento excluído com sucesso!')
    } catch (error) {
      toast.error('Erro ao excluir orçamento')
    }
  }

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId)
    return category?.name || 'Categoria não encontrada'
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatMonth = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long'
    })
  }

  // Gera opções de meses (últimos 12 meses)
  const getMonthOptions = () => {
    const options = []
    const today = new Date()
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('pt-BR', { 
        year: 'numeric', 
        month: 'long' 
      })
      options.push({ value, label })
    }
    
    return options
  }

  const monthOptions = getMonthOptions()

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center">
          <div className="text-lg">Carregando orçamentos...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center">
          <div className="text-red-500">Erro: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Orçamentos</h1>
          <p className="text-muted-foreground">
            Gerencie seus limites de gastos por categoria
          </p>
        </div>
        <Link href="/budgets/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Novo Orçamento
          </Button>
        </Link>
      </div>

      <div className="grid gap-6">
        {/* Filtro por Mês */}
        <Card>
          <CardHeader>
            <CardTitle>Filtrar por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-64">
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
          </CardContent>
        </Card>

        {/* Lista de Orçamentos */}
        <Card>
          <CardHeader>
            <CardTitle>Orçamentos do Mês</CardTitle>
            <CardDescription>
              {formatMonth(selectedMonth + '-01')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {budgets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Nenhum orçamento encontrado para este mês
                </p>
                <Link href="/budgets/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Orçamento
                  </Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Mês</TableHead>
                    <TableHead>Valor Limite</TableHead>
                    <TableHead>Alerta</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgets.map((budget) => (
                    <TableRow key={budget.id}>
                      <TableCell className="font-medium">
                        {getCategoryName(budget.category_id)}
                      </TableCell>
                      <TableCell>
                        {formatMonth(budget.month)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(budget.limit_amount)}
                      </TableCell>
                      <TableCell>
                        {budget.alert_percentage ? (
                          <Badge variant="secondary">
                            {budget.alert_percentage}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <Link href={`/budgets/edit/${budget.id}`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteBudget(budget.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}