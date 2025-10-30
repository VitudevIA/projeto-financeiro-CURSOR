'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTransactionsStore } from '@/lib/stores/transactions-store'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import { useCardsStore } from '@/lib/stores/cards-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
  const { categories } = useCategoriesStore()
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

  // carregar cartões
  import { useEffect } from 'react'
  useEffect(() => { fetchCards() }, [fetchCards])

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

      if (installmentCount > 1) {
        // Criar transações parceladas
        const installmentAmount = formData.amount / installmentCount
        let createdCount = 0

        for (let i = 0; i < installmentCount; i++) {
          const installmentDate = new Date(formData.transactionDate)
          installmentDate.setMonth(installmentDate.getMonth() + i)

          const transactionData = {
            description: `${formData.description} (${i + 1}/${installmentCount})`,
            amount: installmentAmount,
            type: formData.type,
            category_id: formData.categoryId,
            transaction_date: installmentDate.toISOString().split('T')[0],
            expense_nature: formData.expenseNature,
            installment_number: i + 1,
            total_installments: installmentCount,
            payment_method: formData.paymentMethod,
            card_id: (formData.paymentMethod === 'credit' || formData.paymentMethod === 'debit') ? cardId : null
          }

          try {
            await addTransaction(transactionData as any)
            createdCount++
          } catch (error) {
            toast.error(`Erro ao criar parcela ${i + 1}: ${(error as Error).message}`)
          }
        }

        toast.success(`${createdCount} parcelas criadas com sucesso!`)
      } else {
        // Criar transação única
        const transactionData = {
          description: formData.description,
          amount: formData.amount,
          type: formData.type,
          category_id: formData.categoryId,
          transaction_date: formData.transactionDate,
          expense_nature: formData.expenseNature,
          installment_number: null,
          total_installments: null,
          payment_method: formData.paymentMethod,
          card_id: (formData.paymentMethod === 'credit' || formData.paymentMethod === 'debit') ? cardId : null
        }

        await addTransaction(transactionData as any)
        toast.success('Transação criada com sucesso!')
      }
      
      router.push('/transactions')
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const handleInputChange = (field: keyof TransactionFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Filtra categorias baseadas no tipo selecionado
  const filteredCategories = categories.filter(cat => cat.type === formData.type)

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
                    <Select value={cardId} onValueChange={(v) => setCardId(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cartão" />
                      </SelectTrigger>
                      <SelectContent>
                        {cards
                          .filter(card => card.type === (formData.paymentMethod === 'credit' ? 'credit' : 'debit'))
                          .map(card => (
                          <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
                        ))}
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