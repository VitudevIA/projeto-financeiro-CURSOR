'use client'

import { useState, useEffect } from 'react'
import { useRecurringIncomesStore } from '@/lib/stores/recurring-incomes-store'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import { useCardsStore } from '@/lib/stores/cards-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { RecurringIncome, RecurringIncomeInsert } from '@/types/database.types'

interface RecurringIncomeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  income?: RecurringIncome | null
  onSuccess: () => void
}

export function RecurringIncomeModal({
  open,
  onOpenChange,
  income,
  onSuccess,
}: RecurringIncomeModalProps) {
  const { addRecurringIncome, updateRecurringIncome } = useRecurringIncomesStore()
  const { categories, fetchCategories, addCategory } = useCategoriesStore()
  const { cards, fetchCards } = useCardsStore()
  const { user } = useAuthStore()

  const [formData, setFormData] = useState<RecurringIncomeInsert>({
    user_id: '',
    description: '',
    amount: 0,
    category_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: null,
    day_of_month: new Date().getDate(),
    is_active: true,
    payment_method: 'cash',
    card_id: null,
  })

  const [showOnlyActiveCards, setShowOnlyActiveCards] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchCategories()
    fetchCards()
  }, [fetchCategories, fetchCards])

  useEffect(() => {
    if (income) {
      setFormData({
        user_id: income.user_id,
        description: income.description,
        amount: income.amount,
        category_id: income.category_id,
        start_date: income.start_date,
        end_date: income.end_date,
        day_of_month: income.day_of_month,
        is_active: income.is_active,
        payment_method: income.payment_method,
        card_id: income.card_id,
      })
    } else {
      // Reset form
      setFormData({
        user_id: '',
        description: '',
        amount: 0,
        category_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: null,
        day_of_month: new Date().getDate(),
        is_active: true,
        payment_method: 'cash',
        card_id: null,
      })
    }
  }, [income, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validações
    if (!formData.description || formData.amount <= 0) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    // Se não houver categoria, usa a primeira categoria de receita disponível ou cria uma padrão
    let categoryId: string | undefined = formData.category_id
    if (!categoryId) {
      if (incomeCategories.length > 0) {
        // Usa a primeira categoria de receita disponível
        categoryId = incomeCategories[0].id
      } else if (categories.length > 0) {
        // Se não houver categoria de receita, usa qualquer categoria disponível
        categoryId = categories[0].id
      } else {
        // Se não houver categorias, a API vai criar automaticamente
        // Não precisa fazer nada aqui, deixar a API lidar
        categoryId = undefined
      }
    }

    if (formData.day_of_month < 1 || formData.day_of_month > 31) {
      toast.error('Dia do mês deve estar entre 1 e 31')
      return
    }

    if ((formData.payment_method === 'credit' || formData.payment_method === 'debit') && !formData.card_id) {
      toast.error('Selecione um cartão para pagamentos de Crédito/Débito')
      return
    }

    setLoading(true)

    try {
      // Prepara dados com categoria padrão se necessário
      const dataToSave = {
        ...formData,
        category_id: categoryId || formData.category_id,
      }

      if (income) {
        // Atualizar
        const { error } = await updateRecurringIncome(income.id, dataToSave)
        if (error) {
          toast.error(error)
        } else {
          toast.success('Receita recorrente atualizada com sucesso!')
          onSuccess()
        }
      } else {
        // Criar
        const { error } = await addRecurringIncome(dataToSave)
        if (error) {
          toast.error(error)
        } else {
          toast.success('Receita recorrente criada com sucesso!')
          onSuccess()
        }
      }
    } catch (error) {
      toast.error('Erro ao salvar receita recorrente')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Busca categorias de receita para usar como padrão quando necessário
  const incomeCategories = categories.filter((cat) => cat.type === 'income' || !cat.type)

  const filteredCards = cards.filter((card) => {
    if (showOnlyActiveCards && !card.is_active) return false
    const cardType = String(card.type || '').trim().toLowerCase()
    if (formData.payment_method === 'credit') {
      return ['credit', 'crédito', 'credito'].includes(cardType)
    } else if (formData.payment_method === 'debit') {
      return ['debit', 'débito', 'debito'].includes(cardType)
    }
    return false
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {income ? 'Editar Receita Recorrente' : 'Nova Receita Recorrente'}
          </DialogTitle>
          <DialogDescription>
            Configure uma receita que se repete mensalmente. Você pode provisionar automaticamente
            para vários meses.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Descrição <span className="text-destructive">*</span>
            </Label>
            <Input
              id="description"
              placeholder="Ex: Salário, Aluguel recebido..."
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              required
            />
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Valor (R$) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={formData.amount || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  amount: parseFloat(e.target.value) || 0,
                }))
              }
              required
            />
          </div>


          {/* Dia do Mês */}
          <div className="space-y-2">
            <Label htmlFor="day_of_month">
              Dia do Mês <span className="text-destructive">*</span>
            </Label>
            <Input
              id="day_of_month"
              type="number"
              min="1"
              max="31"
              value={formData.day_of_month}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  day_of_month: parseInt(e.target.value) || 1,
                }))
              }
              required
            />
            <p className="text-xs text-muted-foreground">
              Dia em que a receita ocorre mensalmente (1-31)
            </p>
          </div>

          {/* Método de Pagamento */}
          <div className="space-y-2">
            <Label htmlFor="payment_method">
              Método de Pagamento <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value: 'credit' | 'debit' | 'cash' | 'pix' | 'boleto') => {
                setFormData((prev) => ({
                  ...prev,
                  payment_method: value,
                  card_id: value !== 'credit' && value !== 'debit' ? null : prev.card_id,
                }))
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

          {/* Cartão - condicional */}
          {(formData.payment_method === 'credit' || formData.payment_method === 'debit') && (
            <div className="space-y-2">
              <Label htmlFor="card_id">Cartão</Label>
              <div className="flex items-center gap-2 mb-1">
                <Checkbox
                  id="onlyActiveCards"
                  checked={showOnlyActiveCards}
                  onCheckedChange={(v) => setShowOnlyActiveCards(Boolean(v))}
                />
                <Label htmlFor="onlyActiveCards" className="text-xs text-muted-foreground">
                  Mostrar apenas cartões ativos
                </Label>
              </div>
              <Select
                value={formData.card_id || ''}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, card_id: value || null }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cartão (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCards.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-gray-500">
                      Nenhum cartão encontrado
                    </div>
                  ) : (
                    filteredCards.map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.name}
                        {card.brand ? ` (${card.brand})` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Data Início */}
          <div className="space-y-2">
            <Label htmlFor="start_date">Data Início</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, start_date: e.target.value }))
              }
            />
          </div>

          {/* Data Fim (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="end_date">Data Fim (opcional)</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  end_date: e.target.value || null,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Deixe vazio para receita infinita
            </p>
          </div>

          {/* Ativa */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_active: Boolean(checked) }))
              }
            />
            <Label htmlFor="is_active">Receita ativa</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : income ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
