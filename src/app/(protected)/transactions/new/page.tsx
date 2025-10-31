'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTransactionsStore } from '@/lib/stores/transactions-store'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import { useCardsStore } from '@/lib/stores/cards-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

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

export default function NewTransactionPage() {
  const router = useRouter()
  const { addTransaction, loading } = useTransactionsStore()
  const { categories, fetchCategories } = useCategoriesStore()
  const { cards, fetchCards } = useCardsStore()
  const [formData, setFormData] = useState<TransactionFormData>({
    description: '',
    amount: 0,
    type: 'expense',
    categoryId: '',
    transactionDate: new Date().toISOString().split('T')[0],
    installments: 1,
    expenseNature: '',
    paymentMethod: 'cash'
  })

  const [cardId, setCardId] = useState<string>('')
  const [showOnlyActiveCards, setShowOnlyActiveCards] = useState<boolean>(true)

  // carregar cartões e categorias ao montar o componente
  useEffect(() => {
    fetchCards()
    fetchCategories()
  }, [fetchCards, fetchCategories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.description || !formData.categoryId || formData.amount <= 0) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if ((formData.paymentMethod === 'credit' || formData.paymentMethod === 'debit') && !cardId) {
      toast.error('Selecione um cartão para pagamentos de Crédito/Débito')
      return
    }

    try {
      const installmentCount = formData.installments || 1
      const errors: string[] = []

      if (installmentCount > 1) {
        // Criar transações parceladas
        const installmentAmount = formData.amount / installmentCount
        let createdCount = 0

        for (let i = 0; i < installmentCount; i++) {
          const installmentDate = new Date(formData.transactionDate)
          installmentDate.setMonth(installmentDate.getMonth() + i)

          // Garante que o tipo seja sempre 'income' ou 'expense'
          const validatedType: 'income' | 'expense' = 
            (formData.type === 'income' || formData.type === 'expense') 
              ? formData.type 
              : 'expense'

          // Garante que o payment_method seja válido
          const validPaymentMethods = ['credit', 'debit', 'cash', 'pix', 'boleto']
          const validatedPaymentMethod = validPaymentMethods.includes(formData.paymentMethod)
            ? formData.paymentMethod
            : 'cash'

          const transactionData = {
            description: `${formData.description} (${i + 1}/${installmentCount})`,
            amount: installmentAmount,
            type: validatedType, // ✅ Tipo validado antes de enviar
            category_id: formData.categoryId,
            transaction_date: installmentDate.toISOString().split('T')[0],
            expense_nature: formData.expenseNature || null,
            installment_number: i + 1,
            total_installments: installmentCount,
            payment_method: validatedPaymentMethod, // ✅ Payment method validado
            card_id: (validatedPaymentMethod === 'credit' || validatedPaymentMethod === 'debit') ? cardId : null
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
        // Garante que o tipo seja sempre 'income' ou 'expense'
        const validatedType: 'income' | 'expense' = 
          (formData.type === 'income' || formData.type === 'expense') 
            ? formData.type 
            : 'expense'

        // Garante que o payment_method seja válido
        const validPaymentMethods = ['credit', 'debit', 'cash', 'pix', 'boleto']
        const validatedPaymentMethod = validPaymentMethods.includes(formData.paymentMethod)
          ? formData.paymentMethod
          : 'cash'

        const transactionData = {
          description: formData.description,
          amount: formData.amount,
          type: validatedType, // ✅ Tipo validado antes de enviar
          category_id: formData.categoryId,
          transaction_date: formData.transactionDate,
          expense_nature: formData.expenseNature || null,
          installment_number: null,
          total_installments: null,
          payment_method: validatedPaymentMethod, // ✅ Payment method validado
          card_id: (validatedPaymentMethod === 'credit' || validatedPaymentMethod === 'debit') ? cardId : null
        }

        await addTransaction(transactionData as any)
        toast.success('Transação criada com sucesso!')
      }
      
      // Pequeno delay para garantir que as transações foram salvas
      await new Promise(resolve => setTimeout(resolve, 500))
      router.push('/transactions')
    } catch (error) {
      console.error('Erro ao criar transação:', error)
      const errorMsg = (error as Error).message || 'Erro desconhecido ao criar transação'
      toast.error(errorMsg)
    }
  }

  const handleInputChange = (field: keyof TransactionFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Exibe todas as categorias (a tabela categories não possui coluna 'type')
  const filteredCategories = categories

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
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
                        if (current && current.type !== methodType) {
                          setCardId('')
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
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
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}