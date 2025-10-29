'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTransactionsStore } from '@/lib/stores/transactions-store'
import { useCardsStore } from '@/lib/stores/cards-store'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import { formatCurrency, formatDate } from '@/utils/helpers'
import { exportToCSV, exportToJSON, generateFilename, type ExportTransaction } from '@/utils/export-utils'
import { exportToPDF, type PDFReportData } from '@/utils/pdf-export'
import TransactionLimitChecker from '@/components/transaction-limit-checker'
import { Plus, Search, Filter, Edit, Trash2, Upload, Download, FileText } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function TransactionsPage() {
  const { transactions, loading, fetchTransactions, deleteTransaction } = useTransactionsStore()
  const { cards, fetchCards } = useCardsStore()
  const { categories, fetchCategories } = useCategoriesStore()
  
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    categoryId: '',
    cardId: '',
    type: '',
    search: '',
  })

  useEffect(() => {
    fetchTransactions()
    fetchCards()
    fetchCategories()
  }, [fetchTransactions, fetchCards, fetchCategories])

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const applyFilters = () => {
    fetchTransactions(filters)
  }

  const handleDelete = async (id: string, description: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a transação "${description}"?`)) {
      const { error } = await deleteTransaction(id)
      if (error) {
        toast.error(error)
      } else {
        toast.success('Transação excluída com sucesso!')
      }
    }
  }

  const handleExportCSV = () => {
    try {
      const exportData: ExportTransaction[] = transactions.map(transaction => {
        const tAny = transaction as any
        return {
          id: tAny.id || tAny.transaction_id || tAny._id,
          date: tAny.transaction_date || tAny.date || tAny.created_at,
          description: tAny.description || tAny.desc || tAny.name,
          amount: tAny.amount || tAny.value || 0,
          type: tAny.type || tAny.transaction_type,
          category: tAny.category?.name || tAny.category_name,
          card: tAny.card?.name || tAny.card_name,
          notes: tAny.notes || undefined
        }
      })

      const filename = generateFilename('transacoes', 'csv')
      exportToCSV(exportData, filename)
      toast.success('Arquivo CSV exportado com sucesso!')
    } catch (error) {
      toast.error('Erro ao exportar arquivo CSV')
    }
  }

  const handleExportJSON = () => {
    try {
      const exportData: ExportTransaction[] = transactions.map(transaction => {
        const tAny = transaction as any
        return {
          id: tAny.id || tAny.transaction_id || tAny._id,
          date: tAny.transaction_date || tAny.date || tAny.created_at,
          description: tAny.description || tAny.desc || tAny.name,
          amount: tAny.amount || tAny.value || 0,
          type: tAny.type || tAny.transaction_type,
          category: tAny.category?.name || tAny.category_name,
          card: tAny.card?.name || tAny.card_name,
          notes: tAny.notes || undefined
        }
      })

      const filename = generateFilename('transacoes', 'json')
      exportToJSON(exportData, filename)
      toast.success('Arquivo JSON exportado com sucesso!')
    } catch (error) {
      toast.error('Erro ao exportar arquivo JSON')
    }
  }

  const handleExportPDF = async () => {
    try {
      // Calcular dados para o relatório PDF
      const totalSpent = transactions.reduce((sum, t) => {
        const tAny = t as any
        return sum + (tAny.amount || tAny.value || 0)
      }, 0)
      
      const averageDaily = totalSpent / 30 // Simplificado
      const monthlyProjection = totalSpent * 1.1 // Simplificado
      
      // Agrupar por categoria
      const categoryMap = new Map<string, number>()
      transactions.forEach(t => {
        const tAny = t as any
        const categoryName = tAny.category?.name || tAny.category_name
        const amount = tAny.amount || tAny.value || 0
        const current = categoryMap.get(categoryName) || 0
        categoryMap.set(categoryName, current + amount)
      })
      
      const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name,
        value,
        percentage: (value / totalSpent) * 100
      })).sort((a, b) => b.value - a.value)

      const pdfData: PDFReportData = {
        period: `Período selecionado`,
        totalSpent,
        averageDaily,
        monthlyProjection,
        budgetUsage: 0, // Seria calculado com dados de orçamento
        availableBalance: 0, // Seria calculado com dados de saldo
        daysOfReserve: 0, // Seria calculado
        transactions: transactions.map(t => {
          const tAny = t as any
          return {
            date: formatDate(tAny.transaction_date || tAny.date || tAny.created_at),
            description: tAny.description || tAny.desc || tAny.name,
            amount: tAny.amount || tAny.value || 0,
            category: tAny.category?.name || tAny.category_name,
            type: tAny.type || tAny.transaction_type
          }
        }),
        categoryData
      } as any

      await exportToPDF(pdfData)
      toast.success('Relatório PDF exportado com sucesso!')
    } catch (error) {
      toast.error('Erro ao exportar relatório PDF')
    }
  }

  // ✅ CORREÇÃO: Filtrar categorias para garantir que tenham id válido
  const validCategories = categories.filter(category => 
    category.id && category.id.trim() !== ''
  )

  // ✅ CORREÇÃO: Filtrar cartões para garantir que tenham id válido
  const validCards = cards.filter(card => 
    card.id && card.id.trim() !== ''
  )

  return (
    <div className="space-y-6">
      {/* Transaction Limit Checker - COMENTADO TEMPORARIAMENTE */}
      {/* <TransactionLimitChecker /> */}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transações</h1>
          <p className="text-gray-600">Gerencie suas transações financeiras</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleExportCSV} disabled={transactions.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={handleExportJSON} disabled={transactions.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            JSON
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={transactions.length === 0}>
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Link href="/transactions/import">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Importar Excel
            </Button>
          </Link>
          <Link href="/transactions/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Transação
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Início
              </label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Fim
              </label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <Select value={filters.categoryId} onValueChange={(value) => handleFilterChange('categoryId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as categorias</SelectItem>
                  {validCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cartão
              </label>
              <Select value={filters.cardId} onValueChange={(value) => handleFilterChange('cardId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os cartões</SelectItem>
                  {validCards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os tipos</SelectItem>
                  <SelectItem value="credit">Crédito</SelectItem>
                  <SelectItem value="debit">Débito</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <Input
                placeholder="Descrição..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={applyFilters}>
              <Filter className="mr-2 h-4 w-4" />
              Aplicar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Transações</CardTitle>
          <CardDescription>
            Suas transações financeiras organizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Nenhuma transação encontrada. 
              <Link href="/transactions/new" className="text-blue-600 hover:text-blue-500 ml-1">
                Adicione sua primeira transação
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction, index) => {
                const tAny = transaction as any
                const transactionId = tAny.id || tAny.transaction_id || tAny._id || `transaction-${index}`
                const description = tAny.description || tAny.desc || tAny.name
                const transactionDate = tAny.transaction_date || tAny.date || tAny.created_at
                const amount = tAny.amount || tAny.value || 0
                const type = tAny.type || tAny.transaction_type
                const categoryName = tAny.category?.name || tAny.category_name
                const categoryIcon = tAny.category?.icon || '💰'
                const cardName = tAny.card?.name || tAny.card_name
                
                return (
                  <div key={transactionId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <span className="text-2xl">{categoryIcon}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{description}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{categoryName}</span>
                            {cardName && (
                              <span>• {cardName}</span>
                            )}
                            <span>• {formatDate(transactionDate)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-medium text-gray-900">
                          {formatCurrency(amount)}
                        </div>
                        <div className="text-sm text-gray-500 capitalize">
                          {type}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDelete(transactionId, description)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}