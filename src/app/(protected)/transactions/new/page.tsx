'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useTransactionsStore } from '@/lib/stores/transactions-store'
import { useCardsStore } from '@/lib/stores/cards-store'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewTransactionPage() {
  const [formData, setFormData] = useState({
    type: 'credit' as 'credit' | 'debit' | 'cash' | 'pix' | 'boleto',
    cardId: '',
    categoryId: '',
    amount: '',
    description: '',
    transactionDate: new Date().toISOString().split('T')[0],
    isRecurring: false,
    recurringType: '',
    expenseNature: 'variable' as 'fixed' | 'variable' | 'installment',
    installments: '1',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  
  const { addTransaction } = useTransactionsStore()
  const { cards, fetchCards } = useCardsStore()
  const { categories, fetchCategories } = useCategoriesStore()
  const router = useRouter()

  useEffect(() => {
    fetchCards()
    fetchCategories()
  }, [fetchCards, fetchCategories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        toast.error('Usuário não autenticado')
        setLoading(false)
        return
      }

      const installmentCount = parseInt(formData.installments) || 1
      const baseAmount = parseFloat(formData.amount)

      // Se for parcelado, criar múltiplas transações
      if (formData.expenseNature === 'installment' && installmentCount > 1) {
        const installmentAmount = baseAmount / installmentCount
        
        for (let i = 0; i < installmentCount; i++) {
          // Calcular a data de cada parcela (adiciona meses)
          const installmentDate = new Date(formData.transactionDate)
          installmentDate.setMonth(installmentDate.getMonth() + i)
          
          const transactionData = {
            type: formData.type,
            card_id: formData.cardId || null,
            category_id: formData.categoryId,
            amount: installmentAmount,
            description: `${formData.description} (${i + 1}/${installmentCount})`,
            transaction_date: installmentDate.toISOString().split('T')[0],
            is_recurring: formData.isRecurring,
            recurring_type: formData.recurringType || null,
            notes: formData.notes || null,
            user_id: user.id,
            expense_nature: formData.expenseNature,
            installment_number: i + 1,
            total_installments: installmentCount
          }

          const { error } = await addTransaction(transactionData as any)
          
          if (error) {
            toast.error(`Erro ao criar parcela ${i + 1}: ${error}`)
            setLoading(false)
            return
          }
        }
        
        toast.success(`${installmentCount} parcelas criadas com sucesso!`)
      } else {
        // Transação única (fixo ou variável)
        const transactionData = {
          type: formData.type,
          card_id: formData.cardId || null,
          category_id: formData.categoryId,
          amount: baseAmount,
          description: formData.description,
          transaction_date: formData.transactionDate,
          is_recurring: formData.isRecurring,
          recurring_type: formData.recurringType || null,
          notes: formData.notes || null,
          user_id: user.id,
          expense_nature: formData.expenseNature,
          installment_number: null,
          total_installments: null
        }

        const { error } = await addTransaction(transactionData as any)
        
        if (error) {
          toast.error(error)
          setLoading(false)
          return
        }
        
        toast.success('Transação adicionada com sucesso!')
      }
      
      router.push('/transactions')
    } catch (error) {
      console.error('🔍 DEBUG - Catch error:', error)
      toast.error('Erro ao salvar transação')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // Se mudar para não-parcelado, reseta as parcelas para 1
      if (field === 'expenseNature' && value !== 'installment') {
        newData.installments = '1'
      }
      
      return newData
    })
  }

  const filteredCards = cards.filter(card => 
    formData.type === 'credit' ? card.type === 'credit' : 
    formData.type === 'debit' ? card.type === 'debit' : 
    true
  )

  // Calcular valor por parcela
  const installmentAmount = formData.expenseNature === 'installment' && formData.installments 
    ? (parseFloat(formData.amount) || 0) / parseInt(formData.installments)
    : parseFloat(formData.amount) || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/transactions">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nova Transação</h1>
          <p className="text-gray-600">Registre uma nova transação financeira</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da Transação</CardTitle>
          <CardDescription>
            Preencha os dados da sua transação financeira
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo *
                </label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
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

              {(formData.type === 'credit' || formData.type === 'debit') && (
                <div>
                  <label htmlFor="cardId" className="block text-sm font-medium text-gray-700 mb-1">
                    Cartão
                  </label>
                  <Select value={formData.cardId} onValueChange={(value) => handleInputChange('cardId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cartão" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCards.map((card) => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.name} {card.brand && `(${card.brand})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

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
                <label htmlFor="expenseNature" className="block text-sm font-medium text-gray-700 mb-1">
                  Natureza do Gasto *
                </label>
                <Select value={formData.expenseNature} onValueChange={(value) => handleInputChange('expenseNature', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a natureza" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixo</SelectItem>
                    <SelectItem value="variable">Variável</SelectItem>
                    <SelectItem value="installment">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Total (R$) *
                </label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="100.00"
                  required
                />
              </div>

              {formData.expenseNature === 'installment' && (
                <div>
                  <label htmlFor="installments" className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Parcelas *
                  </label>
                  <Input
                    id="installments"
                    type="number"
                    min="2"
                    max="48"
                    value={formData.installments}
                    onChange={(e) => handleInputChange('installments', e.target.value)}
                    placeholder="Ex: 12"
                    required
                  />
                  {formData.amount && formData.installments && parseInt(formData.installments) > 1 && (
                    <p className="text-sm text-gray-500 mt-1">
                      {parseInt(formData.installments)}x de {installmentAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição *
                </label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Ex: Supermercado Extra"
                  required
                />
              </div>

              <div>
                <label htmlFor="transactionDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Data {formData.expenseNature === 'installment' ? '(1ª parcela)' : ''} *
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

            {/* Recurring Transaction */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) => handleInputChange('isRecurring', checked as boolean)}
                />
                <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
                  Transação recorrente (mensal)
                </label>
              </div>

              {formData.isRecurring && (
                <div>
                  <label htmlFor="recurringType" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de recorrência
                  </label>
                  <Select value={formData.recurringType} onValueChange={(value) => handleInputChange('recurringType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="streaming">Streaming</SelectItem>
                      <SelectItem value="subscription">Assinatura</SelectItem>
                      <SelectItem value="rent">Aluguel</SelectItem>
                      <SelectItem value="loan">Empréstimo</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Observações
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Observações adicionais sobre a transação"
                className="w-full p-2 border border-gray-300 rounded-md resize-none"
                rows={3}
              />
            </div>

            {formData.expenseNature === 'installment' && parseInt(formData.installments) > 1 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">📋 Resumo do Parcelamento</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• Valor total: {parseFloat(formData.amount || '0').toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  <p>• Número de parcelas: {formData.installments}x</p>
                  <p>• Valor por parcela: {installmentAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  <p>• Serão criadas {formData.installments} transações com vencimentos mensais</p>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Link href="/transactions">
                <Button variant="outline" type="button">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Transação'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}