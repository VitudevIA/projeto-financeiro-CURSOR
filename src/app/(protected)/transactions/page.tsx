'use client'

import { useEffect, useState } from 'react'
import { useTransactionsStore } from '@/lib/stores/transactions-store'
import { useCardsStore } from '@/lib/stores/cards-store'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Edit, Download } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ImportTransactionsModal } from '@/components/forms/import-transactions-modal'
import { Checkbox } from '@/components/ui/checkbox'
import type { Transaction } from '@/types/database.types'

export default function TransactionsPage() {
  const { transactions, loading, error, fetchTransactions, deleteTransaction, deleteTransactions } = useTransactionsStore()
  const { categories } = useCategoriesStore()
  const { cards, fetchCards } = useCardsStore()
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    categoryId: 'all',
    cardId: 'all',
    paymentMethod: 'all' as 'all' | 'credit' | 'debit' | 'cash' | 'pix' | 'boleto',
    search: ''
  })

  const { fetchCategories } = useCategoriesStore()

  useEffect(() => {
    fetchCards()
    fetchCategories() // Carrega categorias ao montar o componente
  }, [fetchCards, fetchCategories])

  useEffect(() => {
    fetchTransactions(filters)
  }, [])

  // Limpa seleção quando as transações mudarem (apenas IDs que não existem mais)
  useEffect(() => {
    const existingIds = new Set(transactions.map(t => t.id))
    const newSelectedIds = new Set(
      Array.from(selectedIds).filter(id => existingIds.has(id))
    )
    if (newSelectedIds.size !== selectedIds.size) {
      setSelectedIds(newSelectedIds)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions])

  const applyFilters = () => {
    fetchTransactions(filters)
  }

  const handleDelete = async (id: string, description: string) => {
    if (!confirm(`Tem certeza que deseja excluir a transação "${description}"?`)) return

    try {
      await deleteTransaction(id)
      toast.success('Transação excluída com sucesso!')
    } catch (error) {
      toast.error('Erro ao excluir transação')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(transactions.map(t => t.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return

    const count = selectedIds.size
    const message = count === 1
      ? `Tem certeza que deseja excluir ${count} transação?`
      : `Tem certeza que deseja excluir ${count} transações?`

    if (!confirm(message)) return

    setIsDeleting(true)
    try {
      await deleteTransactions(Array.from(selectedIds))
      setSelectedIds(new Set())
      toast.success(`${count} transação${count > 1 ? 'ões' : ''} excluída${count > 1 ? 's' : ''} com sucesso!`)
    } catch (error) {
      toast.error('Erro ao excluir transações')
    } finally {
      setIsDeleting(false)
    }
  }

  const isAllSelected = transactions.length > 0 && selectedIds.size === transactions.length
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < transactions.length

  const getCategoryName = (transaction: Transaction & { category?: any }) => {
    // Prioridade 1: Categoria do JOIN (vem direto do Supabase)
    if (transaction.category?.name) {
      return transaction.category.name
    }
    
    // Prioridade 2: Buscar no store de categorias (fallback)
    if (transaction.category_id) {
      const category = categories.find(cat => cat.id === transaction.category_id)
      if (category?.name) {
        return category.name
      }
      
      // Se não encontrou no store, pode ser que a categoria tenha sido deletada
      // ou o store não foi carregado ainda
      console.warn(`[Transactions Page] ⚠️ Categoria não encontrada no store para category_id: ${transaction.category_id}`)
    } else {
      // Se category_id é null, a transação não tem categoria associada
      console.warn(`[Transactions Page] ⚠️ Transação ${transaction.id} não tem category_id`)
    }
    
    // Fallback final
    return 'Categoria não encontrada'
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  // Calcular totais
  const totals = transactions.reduce((acc, transaction) => {
    if (transaction.type === 'income') {
      acc.income += transaction.amount
    } else {
      acc.expense += transaction.amount
    }
    return acc
  }, { income: 0, expense: 0 })

  const balance = totals.income - totals.expense

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center">
          <div className="text-lg">Carregando transações...</div>
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
          <h1 className="text-3xl font-bold">Despesas</h1>
          <p className="text-muted-foreground">Gerencie suas despesas e saídas financeiras</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <Download className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Link href="/transactions/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Despesa
            </Button>
          </Link>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6 grid grid-cols-1 md:grid-cols-6 gap-4">
        <div>
          <label className="text-sm">Data Início</label>
          <Input type="date" value={filters.startDate} onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm">Data Fim</label>
          <Input type="date" value={filters.endDate} onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm">Categoria</label>
          <Select value={filters.categoryId} onValueChange={(v) => setFilters(f => ({ ...f, categoryId: v }))}>
            <SelectTrigger><SelectValue placeholder="Todas as categorias" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm">Cartão</label>
          <Select value={filters.cardId} onValueChange={(v) => setFilters(f => ({ ...f, cardId: v }))}>
            <SelectTrigger><SelectValue placeholder="Todos os cartões" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cartões</SelectItem>
              {cards.map(card => (
                <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm">Tipo</label>
          <Select value={filters.paymentMethod} onValueChange={(v: any) => setFilters(f => ({ ...f, paymentMethod: v }))}>
            <SelectTrigger><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="credit">Crédito</SelectItem>
              <SelectItem value="debit">Débito</SelectItem>
              <SelectItem value="cash">Dinheiro</SelectItem>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="boleto">Boleto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm">Buscar</label>
          <Input placeholder="Descrição..." value={filters.search} onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))} />
        </div>
        <div className="md:col-span-6 flex justify-end"><Button onClick={applyFilters}>Aplicar Filtros</Button></div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
            <Badge variant="default" className="bg-green-500">+</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.income)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <Badge variant="default" className="bg-red-500">-</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totals.expense)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <Badge variant={balance >= 0 ? "default" : "destructive"}>
              {balance >= 0 ? 'Positivo' : 'Negativo'}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Transações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transações Recentes</CardTitle>
              <CardDescription>
                Últimas transações do mês atual
              </CardDescription>
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selecionada{selectedIds.size > 1 ? 's' : ''}
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting ? 'Excluindo...' : `Excluir ${selectedIds.size}`}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Nenhuma transação encontrada
              </p>
              <Link href="/transactions/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Despesa
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      indeterminate={isIndeterminate}
                      aria-label="Selecionar todas as transações"
                    />
                  </TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow 
                    key={transaction.id}
                    className={selectedIds.has(transaction.id) ? 'bg-muted/50' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(transaction.id)}
                        onCheckedChange={(checked) => handleSelectOne(transaction.id, checked as boolean)}
                        aria-label={`Selecionar ${transaction.description}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {transaction.description}
                    </TableCell>
                    <TableCell>
                      {getCategoryName(transaction)}
                    </TableCell>
                    <TableCell>
                      {formatDate(transaction.transaction_date)}
                    </TableCell>
                    <TableCell>
                      <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'}>
                        {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          disabled={isDeleting}
                        >
                          <Link href={`/transactions/edit/${transaction.id}`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(transaction.id, transaction.description)}
                          disabled={isDeleting || selectedIds.has(transaction.id)}
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
      {/* Modal de Importação */}
      <ImportTransactionsModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImportSuccess={() => {
          fetchTransactions(filters)
        }}
      />
    </div>
  )
}