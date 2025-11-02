'use client'

import { useEffect, useState } from 'react'
import { useRecurringIncomesStore } from '@/lib/stores/recurring-incomes-store'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import { useCardsStore } from '@/lib/stores/cards-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit, Trash2, Zap, Calendar, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { RecurringIncomeModal } from '@/components/forms/recurring-income-modal'
import type { RecurringIncome, RecurringIncomeInsert } from '@/types/database.types'

export default function IncomesPage() {
  const {
    recurringIncomes,
    loading,
    fetchRecurringIncomes,
    deleteRecurringIncome,
    provisionIncomes,
  } = useRecurringIncomesStore()
  const { categories, fetchCategories } = useCategoriesStore()
  const { cards, fetchCards } = useCardsStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<RecurringIncome | null>(null)
  const [provisioningId, setProvisioningId] = useState<string | null>(null)

  useEffect(() => {
    fetchRecurringIncomes()
    fetchCategories()
    fetchCards()
  }, [fetchRecurringIncomes, fetchCategories, fetchCards])

  const handleDelete = async (id: string, description: string) => {
    if (!confirm(`Tem certeza que deseja excluir a receita recorrente "${description}"?`)) {
      return
    }

    const { error } = await deleteRecurringIncome(id)
    if (error) {
      toast.error(error)
    } else {
      toast.success('Receita recorrente excluída com sucesso!')
    }
  }

  const handleProvision = async (recurringIncomeId?: string) => {
    setProvisioningId(recurringIncomeId || 'all')
    
    const { error, count } = await provisionIncomes({
      recurringIncomeId,
      months: 12,
    })

    setProvisioningId(null)

    if (error) {
      toast.error(error)
    } else {
      toast.success(`${count || 0} transações provisionadas para os próximos 12 meses!`)
    }
  }

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId)
    return category?.name || 'Categoria não encontrada'
  }

  const getCardName = (cardId: string | null) => {
    if (!cardId) return 'N/A'
    const card = cards.find((c) => c.id === cardId)
    return card?.name || 'Cartão não encontrado'
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const getNextOccurrences = (income: RecurringIncome, count: number = 6) => {
    const occurrences: Date[] = []
    const now = new Date()
    let month = new Date(now.getFullYear(), now.getMonth(), 1)

    for (let i = 0; i < count; i++) {
      const occurrence = new Date(
        month.getFullYear(),
        month.getMonth(),
        Math.min(income.day_of_month, new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate())
      )

      if (income.end_date) {
        const endDate = new Date(income.end_date)
        if (occurrence > endDate) break
      }

      occurrences.push(occurrence)
      month.setMonth(month.getMonth() + 1)
    }

    return occurrences
  }

  const activeIncomes = recurringIncomes.filter((income) => income.is_active)
  const inactiveIncomes = recurringIncomes.filter((income) => !income.is_active)

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Receitas</h1>
          <p className="text-muted-foreground">Gerencie suas receitas fixas e variáveis</p>
        </div>
        <Button onClick={() => {
          setEditingIncome(null)
          setModalOpen(true)
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Receita Recorrente
        </Button>
      </div>

      <Tabs defaultValue="fixed" className="space-y-6">
        <TabsList>
          <TabsTrigger value="fixed">Receitas Fixas</TabsTrigger>
          <TabsTrigger value="variable">Receitas Variáveis</TabsTrigger>
        </TabsList>

        <TabsContent value="fixed" className="space-y-6">
          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Ativas</CardTitle>
                <Zap className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{activeIncomes.length}</div>
                <p className="text-xs text-muted-foreground">Receitas recorrentes ativas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Mensal Total</CardTitle>
                <Calendar className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    activeIncomes.reduce((sum, income) => sum + Number(income.amount || 0), 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Soma de todas as receitas fixas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Desativadas</CardTitle>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inactiveIncomes.length}</div>
                <p className="text-xs text-muted-foreground">Receitas recorrentes desativadas</p>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Receitas Fixas */}
          <Card>
            <CardHeader>
              <CardTitle>Receitas Recorrentes</CardTitle>
              <CardDescription>
                Configure receitas que se repetem mensalmente e provisione automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary/20 border-t-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Carregando receitas...</p>
                </div>
              ) : activeIncomes.length === 0 && inactiveIncomes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Nenhuma receita recorrente cadastrada</p>
                  <Button onClick={() => {
                    setEditingIncome(null)
                    setModalOpen(true)
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeira Receita Recorrente
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Receitas Ativas */}
                  {activeIncomes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 text-green-600">Ativas</h3>
                      <div className="space-y-3">
                        {activeIncomes.map((income) => {
                          const nextOccurrences = getNextOccurrences(income, 6)
                          return (
                            <Card key={income.id} className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold">{income.description}</h4>
                                    <Badge variant="default" className="bg-green-500">
                                      {formatCurrency(Number(income.amount))}
                                    </Badge>
                                    <Badge variant="outline">
                                      Dia {income.day_of_month}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {getCategoryName(income.category_id)} • {income.payment_method}
                                    {income.card_id && ` • ${getCardName(income.card_id)}`}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {nextOccurrences.map((date, idx) => (
                                      <Badge
                                        key={idx}
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleProvision(income.id)}
                                    disabled={provisioningId === income.id}
                                  >
                                    <Zap className="w-4 h-4 mr-1" />
                                    {provisioningId === income.id ? 'Provisionando...' : 'Provisionar 12 meses'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingIncome(income)
                                      setModalOpen(true)
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(income.id, income.description)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Receitas Desativadas */}
                  {inactiveIncomes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Desativadas</h3>
                      <div className="space-y-3">
                        {inactiveIncomes.map((income) => (
                          <Card key={income.id} className="p-4 opacity-60">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold">{income.description}</h4>
                                  <Badge variant="outline">
                                    {formatCurrency(Number(income.amount))}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {getCategoryName(income.category_id)}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingIncome(income)
                                    setModalOpen(true)
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(income.id, income.description)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botão de Provisionamento Global */}
              {activeIncomes.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <Button
                    variant="default"
                    onClick={() => handleProvision()}
                    disabled={provisioningId === 'all'}
                    className="w-full"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    {provisioningId === 'all'
                      ? 'Provisionando todas as receitas...'
                      : `Provisionar Todas as Receitas (${activeIncomes.length}) para 12 Meses`}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variable">
          <Card>
            <CardHeader>
              <CardTitle>Receitas Variáveis</CardTitle>
              <CardDescription>
                Receitas que não são fixas e precisam ser cadastradas manualmente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  As receitas variáveis são cadastradas como transações normais
                </p>
                <Link href="/transactions/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Cadastrar Receita Variável
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Criação/Edição */}
      {modalOpen && (
        <RecurringIncomeModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          income={editingIncome}
          onSuccess={() => {
            setModalOpen(false)
            setEditingIncome(null)
            fetchRecurringIncomes()
          }}
        />
      )}
    </div>
  )
}
