'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTransactionsStore } from '@/lib/stores/transactions-store'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import { useCardsStore } from '@/lib/stores/cards-store'
import { useLastPreferences } from '@/hooks/useLastPreferences'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Zap, List, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Transaction } from '@/types/database.types'

interface TransactionFormData {
  description: string
  amount: number
  type: 'income' | 'expense'
  categoryId: string
  transactionDate: string
  installments: number
  expenseNature?: string
  paymentMethod: 'credit' | 'debit' | 'cash' | 'pix' | 'boleto'
}

type ValidationErrors = Partial<Record<keyof TransactionFormData, string>>

// Valores rápidos pré-definidos
const QUICK_AMOUNTS = [10, 50, 100, 200, 500, 1000]

export default function EditTransactionPage() {
  const router = useRouter()
  const params = useParams()
  const transactionId = params.id as string
  
  const { updateTransaction, loading } = useTransactionsStore()
  const { categories, fetchCategories, loading: categoriesLoading } = useCategoriesStore()
  const { cards, fetchCards } = useCardsStore()
  const {
    lastCategoryId,
    lastPaymentMethod,
    lastCardId,
    suggestedCategory,
    suggestedAmount,
    savePreferences,
  } = useLastPreferences()

  const [mode, setMode] = useState<'quick' | 'full'>('quick')
  const [loadingTransaction, setLoadingTransaction] = useState(true)
  const [formData, setFormData] = useState<TransactionFormData>({
    description: '',
    amount: 0,
    type: 'expense',
    categoryId: '',
    transactionDate: new Date().toISOString().split('T')[0],
    installments: 1,
    expenseNature: '',
    paymentMethod: 'cash',
  })

  const [cardId, setCardId] = useState<string>('')
  const [showOnlyActiveCards, setShowOnlyActiveCards] = useState<boolean>(true)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [topCategories, setTopCategories] = useState<string[]>([])

  // Carregar categorias e cartões primeiro (antes de buscar a transação)
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('[Edit Transaction] 🔄 Carregando categorias e cartões...')
        await Promise.all([
          fetchCategories(),
          fetchCards()
        ])
        // Aguarda um pouco para garantir que o store foi atualizado
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Verifica se as categorias foram carregadas (força re-render)
        const state = useCategoriesStore.getState()
        console.log('[Edit Transaction] ✅ Categorias carregadas:', state.categories.length)
        if (state.categories.length > 0) {
          console.log('[Edit Transaction] 📋 Lista de categorias:', state.categories.map(c => ({ id: c.id, name: c.name, type: c.type })))
        } else {
          console.warn('[Edit Transaction] ⚠️ Nenhuma categoria encontrada!')
        }
      } catch (error) {
        console.error('[Edit Transaction] ❌ Erro ao carregar dados:', error)
      }
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Executa apenas uma vez ao montar

  // Buscar transação pelo ID (após categorias serem carregadas)
  useEffect(() => {
    const loadTransaction = async () => {
      if (!transactionId) {
        toast.error('ID da transação não fornecido')
        router.push('/transactions')
        return
      }

      // Aguarda um pouco para garantir que categorias foram carregadas
      await new Promise(resolve => setTimeout(resolve, 200))

      try {
        setLoadingTransaction(true)
        const supabase = createClient()
        
        console.log('[Edit Transaction] 🔍 Buscando transação:', transactionId)
        const { data: transaction, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', transactionId)
          .single()

        if (error) {
          console.error('[Edit Transaction] ❌ Erro ao buscar transação:', error)
          toast.error('Transação não encontrada')
          router.push('/transactions')
          return
        }

        if (!transaction) {
          console.error('[Edit Transaction] ❌ Transação não encontrada')
          toast.error('Transação não encontrada')
          router.push('/transactions')
          return
        }

        console.log('[Edit Transaction] ✅ Transação encontrada:', {
          id: transaction.id,
          description: transaction.description,
          category_id: transaction.category_id,
          type: transaction.type
        })

        // Preenche o formulário com os dados da transação
        setFormData({
          description: transaction.description || '',
          amount: parseFloat(String(transaction.amount)) || 0,
          type: (transaction.type === 'income' || transaction.type === 'expense') ? transaction.type : 'expense',
          categoryId: transaction.category_id || '',
          transactionDate: transaction.transaction_date || new Date().toISOString().split('T')[0],
          installments: transaction.total_installments || 1,
          expenseNature: transaction.expense_nature || '',
          paymentMethod: (['credit', 'debit', 'cash', 'pix', 'boleto'].includes(transaction.payment_method || ''))
            ? transaction.payment_method as 'credit' | 'debit' | 'cash' | 'pix' | 'boleto'
            : 'cash',
        })

        // Preenche o cartão se houver
        if (transaction.card_id) {
          setCardId(transaction.card_id)
        }

        // Determina o modo (full se tem parcelas ou natureza)
        if (transaction.total_installments && transaction.total_installments > 1) {
          setMode('full')
        }

        setLoadingTransaction(false)
      } catch (error) {
        console.error('[Edit Transaction] ❌ Erro ao carregar transação:', error)
        toast.error('Erro ao carregar transação')
        router.push('/transactions')
      }
    }

    loadTransaction()
  }, [transactionId, router])

  // Validação em tempo real
  const validateField = (field: keyof TransactionFormData, value: any): string | null => {
    switch (field) {
      case 'description':
        if (!value || value.trim().length === 0) {
          return 'Descrição é obrigatória'
        }
        if (value.length > 200) {
          return 'Descrição muito longa (máx. 200 caracteres)'
        }
        return null
      case 'amount':
        if (!value || value <= 0) {
          return 'Valor deve ser maior que zero'
        }
        if (value > 9999999) {
          return 'Valor muito alto'
        }
        return null
      case 'categoryId':
        if (!value) {
          return 'Categoria é obrigatória'
        }
        return null
      case 'paymentMethod':
        if (!value) {
          return 'Método de pagamento é obrigatório'
        }
        return null
      case 'installments':
        if (value < 1 || value > 24) {
          return 'Parcelas deve estar entre 1 e 24'
        }
        return null
      default:
        return null
    }
  }

  const handleInputChange = (field: keyof TransactionFormData, value: string | number) => {
    const error = validateField(field, value)
    setValidationErrors((prev) => ({
      ...prev,
      [field]: error || undefined,
    }))

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleQuickAmount = (amount: number) => {
    handleInputChange('amount', amount)
  }

  const handleQuickCategory = (categoryId: string) => {
    console.log('[Edit Transaction] 🎯 Categoria selecionada:', categoryId)
    const selectedCategory = categories.find(c => c.id === categoryId)
    if (selectedCategory) {
      console.log('[Edit Transaction] ✅ Categoria encontrada:', {
        id: selectedCategory.id,
        name: selectedCategory.name,
        type: selectedCategory.type
      })
    } else {
      console.warn('[Edit Transaction] ⚠️ Categoria não encontrada na lista:', categoryId)
    }
    handleInputChange('categoryId', categoryId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('[Edit Transaction] 🔍 Iniciando validação:', {
      description: formData.description,
      amount: formData.amount,
      categoryId: formData.categoryId,
      paymentMethod: formData.paymentMethod,
      cardId: cardId,
      type: formData.type
    })

    // Validação completa
    const errors: ValidationErrors = {}
    errors.description = validateField('description', formData.description) || undefined
    errors.amount = validateField('amount', formData.amount) || undefined
    errors.categoryId = validateField('categoryId', formData.categoryId) || undefined
    errors.paymentMethod = validateField('paymentMethod', formData.paymentMethod) || undefined

    // Validação adicional: verifica se a categoria existe e é válida para o tipo
    if (formData.categoryId) {
      const categoryExists = categories.find(c => c.id === formData.categoryId)
      if (!categoryExists) {
        console.error('[Edit Transaction] ❌ Categoria não encontrada:', formData.categoryId)
        errors.categoryId = 'Categoria selecionada não é válida'
      } else if (categoryExists.type && categoryExists.type !== formData.type) {
        console.error('[Edit Transaction] ❌ Categoria não corresponde ao tipo:', {
          categoryType: categoryExists.type,
          formDataType: formData.type
        })
        errors.categoryId = `Categoria "${categoryExists.name}" é do tipo ${categoryExists.type === 'income' ? 'Receita' : 'Despesa'}, mas a transação é do tipo ${formData.type === 'income' ? 'Receita' : 'Despesa'}`
      }
    }

    if ((formData.paymentMethod === 'credit' || formData.paymentMethod === 'debit') && !cardId) {
      errors.paymentMethod = 'Selecione um cartão para pagamentos de Crédito/Débito'
    }

    console.log('[Edit Transaction] 📊 Erros de validação:', errors)

    const hasErrors = Object.values(errors).some((error) => error !== null && error !== undefined)
    if (hasErrors) {
      console.error('[Edit Transaction] ❌ Validação falhou:', errors)
      setValidationErrors(errors)
      toast.error('Por favor, corrija os erros antes de continuar')
      return
    }

    try {
      // Salva preferências do usuário
      await savePreferences({
        categoryId: formData.categoryId,
        paymentMethod: formData.paymentMethod,
        cardId: cardId || undefined,
        type: formData.type,
      })

      const rawType = String(formData.type || '').trim().toLowerCase()
      const validatedType: 'income' | 'expense' =
        rawType === 'income' || rawType === 'expense' ? (rawType as 'income' | 'expense') : 'expense'

      const rawPaymentMethod = String(formData.paymentMethod || '').trim().toLowerCase()
      const validPaymentMethods = ['credit', 'debit', 'cash', 'pix', 'boleto']
      const validatedPaymentMethod = validPaymentMethods.includes(rawPaymentMethod)
        ? (rawPaymentMethod as 'credit' | 'debit' | 'cash' | 'pix' | 'boleto')
        : 'cash'

      // Prepara os dados para atualização
      // Usa 'any' para permitir campos adicionais do banco que não estão na interface Transaction
      const updateData: any = {
        description: formData.description,
        amount: formData.amount,
        type: validatedType,
        category_id: formData.categoryId,
        transaction_date: formData.transactionDate,
        payment_method: validatedPaymentMethod,
        card_id: validatedPaymentMethod === 'credit' || validatedPaymentMethod === 'debit' ? cardId : null,
        expense_nature: formData.expenseNature || null,
        installment_number: formData.installments > 1 ? 1 : null,
        total_installments: formData.installments > 1 ? formData.installments : null,
      }

      await updateTransaction(transactionId, updateData)
      toast.success('Transação atualizada com sucesso!')

      await new Promise((resolve) => setTimeout(resolve, 500))
      router.push('/transactions')
    } catch (error) {
      console.error('Erro ao atualizar transação:', error)
      const errorMsg = (error as Error).message || 'Erro desconhecido ao atualizar transação'
      toast.error(errorMsg)
    }
  }

  // Filtra categorias: mostra todas as categorias do tipo correto ou sem tipo definido
  // IMPORTANTE: Sempre inclui a categoria atual (se existir) mesmo que não passe no filtro
  const filteredCategories = categories.length > 0
    ? categories.filter((cat) => {
        // Sempre inclui a categoria atual (se estiver selecionada)
        if (formData.categoryId && cat.id === formData.categoryId) {
          return true
        }
        // Se categoria tem tipo, deve corresponder ao tipo da transação
        // Se categoria não tem tipo, mostra em ambos
        return !cat.type || cat.type === formData.type
      })
    : []
  
  // Se após filtrar não há categorias, mostra todas (caso raro)
  // Mas garante que a categoria atual sempre esteja presente
  let categoriesToShow = filteredCategories.length > 0 ? filteredCategories : categories
  
  // Garante que a categoria atual esteja na lista (se existir)
  if (formData.categoryId && !categoriesToShow.find(c => c.id === formData.categoryId)) {
    const currentCategory = categories.find(c => c.id === formData.categoryId)
    if (currentCategory) {
      categoriesToShow = [currentCategory, ...categoriesToShow]
    }
  }
  
  // Debug: Log das categorias
  useEffect(() => {
    if (categories.length > 0) {
      console.log('[Edit Transaction] 🔍 Debug categorias:', {
        totalCategories: categories.length,
        filteredCategories: filteredCategories.length,
        categoriesToShow: categoriesToShow.length,
        formDataType: formData.type,
        categoryIds: categories.map(c => ({ id: c.id, name: c.name, type: c.type })),
        formDataCategoryId: formData.categoryId,
        currentCategory: categories.find(c => c.id === formData.categoryId)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length, filteredCategories.length, formData.type, formData.categoryId])

  // Exibe loading enquanto busca a transação
  if (loadingTransaction) {
    return (
      <div className="container mx-auto py-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Carregando transação...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Editar Despesa</CardTitle>
                <CardDescription>
                  {mode === 'quick'
                    ? 'Edição rápida - apenas o essencial'
                    : 'Edição completa - todas as opções'}
                </CardDescription>
              </div>
              <Tabs value={mode} onValueChange={(v) => setMode(v as 'quick' | 'full')}>
                <TabsList>
                  <TabsTrigger value="quick" className="gap-2">
                    <Zap className="h-4 w-4" />
                    Rápido
                  </TabsTrigger>
                  <TabsTrigger value="full" className="gap-2">
                    <List className="h-4 w-4" />
                    Completo
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Grupo 1: Tipo e Método de Pagamento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg border">
                <div className="space-y-2">
                  <label htmlFor="type" className="text-sm font-medium flex items-center gap-2">
                    Tipo <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'income' | 'expense') => {
                      console.log('[Edit Transaction] 🔄 Tipo alterado:', value)
                      handleInputChange('type', value)
                      // Se o tipo mudou e a categoria atual não é compatível, limpa a categoria
                      if (formData.categoryId) {
                        const currentCategory = categories.find(c => c.id === formData.categoryId)
                        if (currentCategory && currentCategory.type && currentCategory.type !== value) {
                          console.warn('[Edit Transaction] ⚠️ Categoria atual não é compatível com novo tipo, limpando...')
                          handleInputChange('categoryId', '')
                        }
                      }
                    }}
                  >
                    <SelectTrigger
                      className={cn(
                        validationErrors.type && 'border-destructive focus-visible:ring-destructive/20'
                      )}
                    >
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.type && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.type}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="paymentMethod" className="text-sm font-medium flex items-center gap-2">
                    Método de Pagamento <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value: 'credit' | 'debit' | 'cash' | 'pix' | 'boleto') => {
                      handleInputChange('paymentMethod', value)
                      if (value !== 'credit' && value !== 'debit') {
                        setCardId('')
                      } else {
                        fetchCards()
                        const methodType = value
                        const current = cards.find((c) => c.id === cardId)
                        if (current && current.type !== methodType) {
                          setCardId('')
                        }
                      }
                    }}
                  >
                    <SelectTrigger
                      className={cn(
                        validationErrors.paymentMethod && 'border-destructive focus-visible:ring-destructive/20'
                      )}
                    >
                      <SelectValue placeholder="Selecione o método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Crédito</SelectItem>
                      <SelectItem value="debit">Débito</SelectItem>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.paymentMethod && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.paymentMethod}
                    </p>
                  )}
                </div>
              </div>

              {/* Cartão - condicional */}
              {(formData.paymentMethod === 'credit' || formData.paymentMethod === 'debit') && (
                <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                  <label className="text-sm font-medium flex items-center gap-2">
                    Cartão <span className="text-destructive">*</span>
                  </label>
                  <div className="flex items-center gap-2 mb-1">
                    <Checkbox
                      id="onlyActive"
                      checked={showOnlyActiveCards}
                      onCheckedChange={(v) => setShowOnlyActiveCards(Boolean(v))}
                    />
                    <label htmlFor="onlyActive" className="text-xs text-muted-foreground">
                      Mostrar apenas cartões ativos
                    </label>
                  </div>
                  <Select value={cardId} onValueChange={(v) => setCardId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cartão" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const filteredCards = cards.filter((card) => {
                          if (showOnlyActiveCards && !card.is_active) return false
                          const cardType = String(card.type || '').trim().toLowerCase()
                          if (formData.paymentMethod === 'credit') {
                            return ['credit', 'crédito', 'credito'].includes(cardType)
                          } else if (formData.paymentMethod === 'debit') {
                            return ['debit', 'débito', 'debito'].includes(cardType)
                          }
                          return false
                        })

                        if (filteredCards.length === 0) {
                          return (
                            <div className="px-2 py-1.5 text-sm text-gray-500">
                              Nenhum cartão {formData.paymentMethod === 'credit' ? 'de crédito' : 'de débito'}{' '}
                              encontrado
                            </div>
                          )
                        }

                        return filteredCards.map((card) => (
                          <SelectItem key={card.id} value={card.id}>
                            {card.name}
                            {card.brand ? ` (${card.brand})` : ''}
                          </SelectItem>
                        ))
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Grupo 2: Descrição */}
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                <label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
                  Descrição <span className="text-destructive">*</span>
                </label>
                <Input
                  id="description"
                  placeholder="Ex: Aluguel, Salário, Mercado..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className={cn(
                    validationErrors.description && 'border-destructive focus-visible:ring-destructive/20'
                  )}
                />
                {validationErrors.description && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.description}
                  </p>
                )}
                {formData.description && !validationErrors.description && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Descrição válida
                  </p>
                )}
              </div>

              {/* Grupo 3: Valor com Quick Actions */}
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                <label htmlFor="amount" className="text-sm font-medium flex items-center gap-2">
                  Valor (R$) <span className="text-destructive">*</span>
                </label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={formData.amount || ''}
                  onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                  className={cn(
                    validationErrors.amount && 'border-destructive focus-visible:ring-destructive/20'
                  )}
                />
                {validationErrors.amount && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.amount}
                  </p>
                )}
                {/* Quick Amount Buttons */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {QUICK_AMOUNTS.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant={formData.amount === amount ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleQuickAmount(amount)}
                      className="text-xs"
                    >
                      R$ {amount.toFixed(2)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Grupo 4: Categoria */}
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                <label htmlFor="category" className="text-sm font-medium flex items-center gap-2">
                  Categoria <span className="text-destructive">*</span>
                </label>
                <Select
                  value={formData.categoryId && formData.categoryId.trim() !== '' ? formData.categoryId : undefined}
                  onValueChange={(value) => {
                    console.log('[Edit Transaction] 📝 Selecionando categoria no Select:', value)
                    handleQuickCategory(value)
                  }}
                  disabled={categoriesLoading || categoriesToShow.length === 0}
                >
                  <SelectTrigger
                    className={cn(
                      validationErrors.categoryId && 'border-destructive focus-visible:ring-destructive/20'
                    )}
                  >
                      <SelectValue placeholder={categoriesLoading ? "Carregando categorias..." : "Selecione uma categoria"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesLoading ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Carregando categorias...
                      </div>
                    ) : categoriesToShow.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Nenhuma categoria disponível
                      </div>
                    ) : (
                      categoriesToShow.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {validationErrors.categoryId && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.categoryId}
                  </p>
                )}
              </div>

              {/* Campos apenas no modo completo */}
              {mode === 'full' && (
                <>
                  {/* Parcelas */}
                  <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                    <label htmlFor="installments" className="text-sm font-medium">
                      Parcelas
                    </label>
                    <Input
                      id="installments"
                      type="number"
                      min="1"
                      max="24"
                      placeholder="1"
                      value={formData.installments}
                      onChange={(e) => handleInputChange('installments', parseInt(e.target.value) || 1)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Número de parcelas (1 para transação única)
                    </p>
                  </div>

                  {/* Natureza da Despesa */}
                  {formData.type === 'expense' && (
                    <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                      <label htmlFor="expenseNature" className="text-sm font-medium">
                        Natureza da Despesa
                      </label>
                      <Input
                        id="expenseNature"
                        placeholder="Ex: Essencial, Supérfluo..."
                        value={formData.expenseNature}
                        onChange={(e) => handleInputChange('expenseNature', e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Data */}
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                <label htmlFor="transactionDate" className="text-sm font-medium flex items-center gap-2">
                  Data <span className="text-destructive">*</span>
                </label>
                <Input
                  id="transactionDate"
                  type="date"
                  value={formData.transactionDate}
                  onChange={(e) => handleInputChange('transactionDate', e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => router.push('/transactions')} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Atualizando...' : 'Atualizar Despesa'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

