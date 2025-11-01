'use client'

<<<<<<< HEAD
import { useState, useEffect, useRef } from 'react'
=======
import { useState, useEffect } from 'react'
>>>>>>> 0e8581193d55c61b702ceb359b50572dc05656c8
import { useRouter } from 'next/navigation'
import { useTransactionsStore } from '@/lib/stores/transactions-store'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import { useCardsStore } from '@/lib/stores/cards-store'
<<<<<<< HEAD
import { useLastPreferences } from '@/hooks/useLastPreferences'
=======
>>>>>>> 0e8581193d55c61b702ceb359b50572dc05656c8
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
<<<<<<< HEAD
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Zap, List, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
=======
import { toast } from 'sonner'
>>>>>>> 0e8581193d55c61b702ceb359b50572dc05656c8

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

<<<<<<< HEAD
type ValidationErrors = Partial<Record<keyof TransactionFormData, string>>

// Valores rápidos pré-definidos
const QUICK_AMOUNTS = [10, 50, 100, 200, 500, 1000]

export default function NewTransactionPage() {
  const router = useRouter()
  const { addTransaction, loading, transactions } = useTransactionsStore()
  const { categories, fetchCategories } = useCategoriesStore()
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
=======
export default function NewTransactionPage() {
  const router = useRouter()
  const { addTransaction, loading } = useTransactionsStore()
  const { categories, fetchCategories } = useCategoriesStore()
  const { cards, fetchCards } = useCardsStore()
>>>>>>> 0e8581193d55c61b702ceb359b50572dc05656c8
  const [formData, setFormData] = useState<TransactionFormData>({
    description: '',
    amount: 0,
    type: 'expense',
    categoryId: '',
    transactionDate: new Date().toISOString().split('T')[0],
    installments: 1,
    expenseNature: '',
<<<<<<< HEAD
    paymentMethod: 'cash',
=======
    paymentMethod: 'cash'
>>>>>>> 0e8581193d55c61b702ceb359b50572dc05656c8
  })

  const [cardId, setCardId] = useState<string>('')
  const [showOnlyActiveCards, setShowOnlyActiveCards] = useState<boolean>(true)
<<<<<<< HEAD
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [topCategories, setTopCategories] = useState<string[]>([])

  // Carregar dados ao montar
=======

  // carregar cartões e categorias ao montar o componente
>>>>>>> 0e8581193d55c61b702ceb359b50572dc05656c8
  useEffect(() => {
    fetchCards()
    fetchCategories()
  }, [fetchCards, fetchCategories])

<<<<<<< HEAD
  // Ref para rastrear se já fez auto-preenchimento
  const hasAutoFilledRef = useRef(false)

  // Auto-preenchimento inteligente (apenas uma vez quando componente monta)
  useEffect(() => {
    if (hasAutoFilledRef.current || !formData.type) return

    // Aguarda um pouco para garantir que preferências estão carregadas
    const timeoutId = setTimeout(() => {
      setFormData((prev) => {
        const updates: Partial<TransactionFormData> = {}
        
        // Sugere categoria apenas se não houver
        if (!prev.categoryId) {
          const suggestedCatId = suggestedCategory(prev.type)
          if (suggestedCatId) {
            updates.categoryId = suggestedCatId
          }
        }

        // Preenche método de pagamento apenas se ainda for o padrão
        if (prev.paymentMethod === 'cash' && lastPaymentMethod) {
          updates.paymentMethod = lastPaymentMethod
        }

        hasAutoFilledRef.current = true
        return { ...prev, ...updates }
      })
    }, 200)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Executa apenas uma vez ao montar

  // Preenche cartão quando método de pagamento muda para crédito/débito
  useEffect(() => {
    if ((formData.paymentMethod === 'credit' || formData.paymentMethod === 'debit') && lastCardId && !cardId) {
      setCardId(lastCardId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.paymentMethod]) // Apenas quando método muda

  // Calcula top categorias quando transações mudam
  useEffect(() => {
    if (transactions.length === 0 || !formData.type) {
      setTopCategories([])
      return
    }

    const typeCategories = transactions
      .filter((t) => t.type === formData.type)
      .map((t) => t.category_id)

    const frequency: Record<string, number> = {}
    typeCategories.forEach((catId) => {
      frequency[catId] = (frequency[catId] || 0) + 1
    })

    const sorted = Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([catId]) => catId)

    setTopCategories(sorted)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions.length, formData.type]) // Apenas quando número de transações ou tipo muda

  // Auto-preencher valor sugerido quando categoria muda (apenas se valor for 0)
  useEffect(() => {
    if (formData.categoryId && formData.amount === 0) {
      const avgAmount = suggestedAmount(formData.categoryId)
      if (avgAmount && avgAmount > 0) {
        setFormData((prev) => ({ ...prev, amount: avgAmount }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.categoryId]) // Apenas quando categoria muda

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
    handleInputChange('categoryId', categoryId)
    // Auto-preenche valor sugerido
    const avgAmount = suggestedAmount(categoryId)
    if (avgAmount && avgAmount > 0 && formData.amount === 0) {
      handleInputChange('amount', avgAmount)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validação completa
    const errors: ValidationErrors = {}
    errors.description = validateField('description', formData.description)
    errors.amount = validateField('amount', formData.amount)
    errors.categoryId = validateField('categoryId', formData.categoryId)
    errors.paymentMethod = validateField('paymentMethod', formData.paymentMethod)

    if ((formData.paymentMethod === 'credit' || formData.paymentMethod === 'debit') && !cardId) {
      errors.paymentMethod = 'Selecione um cartão para pagamentos de Crédito/Débito'
    }

    const hasErrors = Object.values(errors).some((error) => error !== null)
    if (hasErrors) {
      setValidationErrors(errors)
      toast.error('Por favor, corrija os erros antes de continuar')
=======
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.description || !formData.categoryId || formData.amount <= 0) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if ((formData.paymentMethod === 'credit' || formData.paymentMethod === 'debit') && !cardId) {
      toast.error('Selecione um cartão para pagamentos de Crédito/Débito')
>>>>>>> 0e8581193d55c61b702ceb359b50572dc05656c8
      return
    }

    try {
<<<<<<< HEAD
      // Salva preferências do usuário
      await savePreferences({
        categoryId: formData.categoryId,
        paymentMethod: formData.paymentMethod,
        cardId: cardId || undefined,
        type: formData.type,
      })

=======
>>>>>>> 0e8581193d55c61b702ceb359b50572dc05656c8
      const installmentCount = formData.installments || 1
      const errors: string[] = []

      if (installmentCount > 1) {
        // Criar transações parceladas
        const installmentAmount = formData.amount / installmentCount
        let createdCount = 0

        for (let i = 0; i < installmentCount; i++) {
          const installmentDate = new Date(formData.transactionDate)
          installmentDate.setMonth(installmentDate.getMonth() + i)

<<<<<<< HEAD
          const rawType = String(formData.type || '').trim().toLowerCase()
          const validatedType: 'income' | 'expense' =
            rawType === 'income' || rawType === 'expense' ? (rawType as 'income' | 'expense') : 'expense'

          const rawPaymentMethod = String(formData.paymentMethod || '').trim().toLowerCase()
          const validPaymentMethods = ['credit', 'debit', 'cash', 'pix', 'boleto']
          const validatedPaymentMethod = validPaymentMethods.includes(rawPaymentMethod)
            ? (rawPaymentMethod as 'credit' | 'debit' | 'cash' | 'pix' | 'boleto')
=======
          // Garante que o tipo seja sempre 'income' ou 'expense'
          // Remove espaços, converte para lowercase e valida rigorosamente
          const rawType = String(formData.type || '').trim().toLowerCase()
          const validatedType: 'income' | 'expense' = 
            (rawType === 'income' || rawType === 'expense') 
              ? rawType as 'income' | 'expense'
              : 'expense'

          // Garante que o payment_method seja válido
          const rawPaymentMethod = String(formData.paymentMethod || '').trim().toLowerCase()
          const validPaymentMethods = ['credit', 'debit', 'cash', 'pix', 'boleto']
          const validatedPaymentMethod = validPaymentMethods.includes(rawPaymentMethod)
            ? rawPaymentMethod as 'credit' | 'debit' | 'cash' | 'pix' | 'boleto'
>>>>>>> 0e8581193d55c61b702ceb359b50572dc05656c8
            : 'cash'

          const transactionData = {
            description: `${formData.description} (${i + 1}/${installmentCount})`,
            amount: installmentAmount,
<<<<<<< HEAD
            type: validatedType,
=======
            type: validatedType, // ✅ Tipo validado antes de enviar
>>>>>>> 0e8581193d55c61b702ceb359b50572dc05656c8
            category_id: formData.categoryId,
            transaction_date: installmentDate.toISOString().split('T')[0],
            expense_nature: formData.expenseNature || null,
            installment_number: i + 1,
            total_installments: installmentCount,
<<<<<<< HEAD
            payment_method: validatedPaymentMethod,
            card_id: validatedPaymentMethod === 'credit' || validatedPaymentMethod === 'debit' ? cardId : null,
=======
            payment_method: validatedPaymentMethod, // ✅ Payment method validado
            card_id: (validatedPaymentMethod === 'credit' || validatedPaymentMethod === 'debit') ? cardId : null
>>>>>>> 0e8581193d55c61b702ceb359b50572dc05656c8
          }

          try {
            await addTransaction(transactionData as any)
            createdCount++
          } catch (error) {
            const errorMsg = (error as Error).message || 'Erro desconhecido'
            console.error(`Erro ao criar parcela ${i + 1}:`, error)
            errors.push(`Parcela ${i + 1}: ${errorMsg}`)
            toast.error(`Erro ao criar parcela ${i + 1}: ${errorMsg}`)
          }
        }

        if (createdCount > 0) {
          toast.success(`${createdCount} de ${installmentCount} parcelas criadas com sucesso!`)
          if (errors.length > 0) {
            console.error('Erros ao criar parcelas:', errors)
          }
        } else {
          toast.error('Nenhuma parcela foi criada. Verifique os erros acima.')
          return
        }
      } else {
        // Criar transação única
<<<<<<< HEAD
        const rawType = String(formData.type || '').trim().toLowerCase()
        const validatedType: 'income' | 'expense' =
          rawType === 'income' || rawType === 'expense' ? (rawType as 'income' | 'expense') : 'expense'

        const rawPaymentMethod = String(formData.paymentMethod || '').trim().toLowerCase()
        const validPaymentMethods = ['credit', 'debit', 'cash', 'pix', 'boleto']
        const validatedPaymentMethod = validPaymentMethods.includes(rawPaymentMethod)
          ? (rawPaymentMethod as 'credit' | 'debit' | 'cash' | 'pix' | 'boleto')
=======
        // Garante que o tipo seja sempre 'income' ou 'expense'
        // Remove espaços, converte para lowercase e valida rigorosamente
        const rawType = String(formData.type || '').trim().toLowerCase()
        const validatedType: 'income' | 'expense' = 
          (rawType === 'income' || rawType === 'expense') 
            ? rawType as 'income' | 'expense'
            : 'expense'

        // Garante que o payment_method seja válido
        const rawPaymentMethod = String(formData.paymentMethod || '').trim().toLowerCase()
        const validPaymentMethods = ['credit', 'debit', 'cash', 'pix', 'boleto']
        const validatedPaymentMethod = validPaymentMethods.includes(rawPaymentMethod)
          ? rawPaymentMethod as 'credit' | 'debit' | 'cash' | 'pix' | 'boleto'
>>>>>>> 0e8581193d55c61b702ceb359b50572dc05656c8
          : 'cash'

        const transactionData = {
          description: formData.description,
          amount: formData.amount,
<<<<<<< HEAD
          type: validatedType,
=======
          type: validatedType, // ✅ Tipo validado antes de enviar
>>>>>>> 0e8581193d55c61b702ceb359b50572dc05656c8
          category_id: formData.categoryId,
          transaction_date: formData.transactionDate,
          expense_nature: formData.expenseNature || null,
          installment_number: null,
          total_installments: null,
<<<<<<< HEAD
          payment_method: validatedPaymentMethod,
          card_id: validatedPaymentMethod === 'credit' || validatedPaymentMethod === 'debit' ? cardId : null,
        }

        await addTransaction(transactionData as any)
        toast.success('Despesa criada com sucesso!')
      }

      await new Promise((resolve) => setTimeout(resolve, 500))
=======
          payment_method: validatedPaymentMethod, // ✅ Payment method validado
          card_id: (validatedPaymentMethod === 'credit' || validatedPaymentMethod === 'debit') ? cardId : null
        }

        await addTransaction(transactionData as any)
        toast.success('Transação criada com sucesso!')
      }
      
      // Pequeno delay para garantir que as transações foram salvas
      await new Promise(resolve => setTimeout(resolve, 500))
>>>>>>> 0e8581193d55c61b702ceb359b50572dc05656c8
      router.push('/transactions')
    } catch (error) {
      console.error('Erro ao criar transação:', error)
      const errorMsg = (error as Error).message || 'Erro desconhecido ao criar transação'
      toast.error(errorMsg)
    }
  }

<<<<<<< HEAD
  const filteredCategories = categories.filter((cat) => cat.type === formData.type || !cat.type)
=======
  const handleInputChange = (field: keyof TransactionFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Exibe todas as categorias (a tabela categories não possui coluna 'type')
  const filteredCategories = categories
>>>>>>> 0e8581193d55c61b702ceb359b50572dc05656c8

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
<<<<<<< HEAD
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Nova Despesa</CardTitle>
                <CardDescription>
                  {mode === 'quick'
                    ? 'Cadastro rápido - apenas o essencial'
                    : 'Cadastro completo - todas as opções'}
                </CardDescription>
                <p className="text-xs text-muted-foreground mt-1">
                  💡 Para cadastrar receitas, vá para a página <Link href="/incomes" className="text-primary underline">Receitas</Link>
                </p>
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
                    onValueChange={(value: 'income' | 'expense') => handleInputChange('type', value)}
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
=======
            <CardTitle>Nova Transação</CardTitle>
            <CardDescription>
              Adicione uma nova entrada ou saída ao seu controle financeiro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {/* Tipo */}
                <div className="space-y-2">
                  <label htmlFor="type" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Tipo *
                  </label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: 'income' | 'expense') => handleInputChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Método de pagamento */}
                <div className="space-y-2">
                  <label htmlFor="paymentMethod" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Método de Pagamento *
                  </label>
                  <Select 
                    value={formData.paymentMethod}
                    onValueChange={(value: 'credit' | 'debit' | 'cash' | 'pix' | 'boleto') => {
                      handleInputChange('paymentMethod', value)
                      // Resetar/validar cartão conforme método
                      if (value !== 'credit' && value !== 'debit') {
                        setCardId('')
                      } else {
                        // Recarrega os cartões quando muda para crédito/débito para garantir lista atualizada
                        fetchCards()
                        const methodType = value
                        const current = cards.find(c => c.id === cardId)
>>>>>>> 0e8581193d55c61b702ceb359b50572dc05656c8
                        if (current && current.type !== methodType) {
                          setCardId('')
                        }
                      }
                    }}
                  >
<<<<<<< HEAD
                    <SelectTrigger
                      className={cn(
                        validationErrors.paymentMethod && 'border-destructive focus-visible:ring-destructive/20'
                      )}
                    >
=======
                    <SelectTrigger>
>>>>>>> 0e8581193d55c61b702ceb359b50572dc05656c8
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
<<<<<<< HEAD
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

              {/* Grupo 4: Categoria com Quick Actions */}
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                <label htmlFor="category" className="text-sm font-medium flex items-center gap-2">
                  Categoria <span className="text-destructive">*</span>
                </label>
                {/* Top Categories Quick Buttons */}
                {topCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {topCategories.slice(0, 5).map((catId) => {
                      const cat = categories.find((c) => c.id === catId)
                      if (!cat) return null
                      return (
                        <Button
                          key={catId}
                          type="button"
                          variant={formData.categoryId === catId ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleQuickCategory(catId)}
                          className="text-xs"
                        >
                          {cat.name}
                        </Button>
                      )
                    })}
                  </div>
                )}
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => handleQuickCategory(value)}
                >
                  <SelectTrigger
                    className={cn(
                      validationErrors.categoryId && 'border-destructive focus-visible:ring-destructive/20'
                    )}
                  >
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
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
                  {loading ? 'Criando...' : 'Criar Despesa'}
=======
                </div>

                {/* Cartão - obrigatório para Crédito/Débito */}
                {(formData.paymentMethod === 'credit' || formData.paymentMethod === 'debit') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Cartão *
                    </label>
                    <div className="flex items-center gap-2 mb-1">
                      <Checkbox id="onlyActive" checked={showOnlyActiveCards} onCheckedChange={(v) => setShowOnlyActiveCards(Boolean(v))} />
                      <label htmlFor="onlyActive" className="text-xs text-muted-foreground">Mostrar apenas cartões ativos</label>
                    </div>
                    <Select value={cardId} onValueChange={(v) => setCardId(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cartão" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const filteredCards = cards.filter(card => {
                            // Filtra por cartões ativos se a opção estiver marcada
                            if (showOnlyActiveCards && !card.is_active) return false
                            
                            // Normaliza o tipo do cartão para comparação (remove acentos e converte para minúsculas)
                            const cardType = String(card.type || '').trim().toLowerCase()
                            
                            // Verifica se o tipo do cartão corresponde ao método de pagamento
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
                                Nenhum cartão {formData.paymentMethod === 'credit' ? 'de crédito' : 'de débito'} encontrado
                              </div>
                            )
                          }

                          return filteredCards.map(card => (
                            <SelectItem key={card.id} value={card.id}>
                              {card.name}{card.brand ? ` (${card.brand})` : ''}
                            </SelectItem>
                          ))
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Descrição */}
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Descrição *
                  </label>
                  <Input
                    id="description"
                    placeholder="Ex: Aluguel, Salário, Mercado..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    required
                  />
                </div>

                {/* Valor */}
                <div className="space-y-2">
                  <label htmlFor="amount" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Valor (R$) *
                  </label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={formData.amount || ''}
                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                {/* Parcelas */}
                <div className="space-y-2">
                  <label htmlFor="installments" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
                  <div className="space-y-2">
                    <label htmlFor="expenseNature" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
                      {filteredCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Data */}
                <div className="space-y-2">
                  <label htmlFor="transactionDate" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Data *
                  </label>
                  <Input
                    id="transactionDate"
                    type="date"
                    value={formData.transactionDate}
                    onChange={(e) => handleInputChange('transactionDate', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/transactions')}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                >
                  {loading ? 'Criando...' : 'Criar Transação'}
>>>>>>> 0e8581193d55c61b702ceb359b50572dc05656c8
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}