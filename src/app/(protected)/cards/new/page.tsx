'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCardsStore } from '@/lib/stores/cards-store'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface FormData {
  name: string
  type: 'credit' | 'debit'
  brand: string
  lastDigits: string
  limitAmount: string
}

const knownBrands = ['Visa', 'Mastercard', 'American Express', 'Elo', 'Hipercard', 'Diners Club', 'Discover']

export default function NewCardPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'credit',
    brand: '',
    lastDigits: '',
    limitAmount: '',
  })
  const [loading, setLoading] = useState(false)
  const { addCard } = useCardsStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Nome do cartão é obrigatório')
      return
    }

    // Validação de últimos dígitos
    if (formData.lastDigits && formData.lastDigits.length !== 4) {
      toast.error('Os últimos dígitos devem ter exatamente 4 números')
      return
    }

    // Validação de limite para cartão de crédito
    if (formData.type === 'credit' && formData.limitAmount) {
      const limit = parseFloat(formData.limitAmount)
      if (limit < 0) {
        toast.error('O limite não pode ser negativo')
        return
      }
      if (limit > 0 && limit < 10) {
        toast.error('Limite mínimo é R$ 10,00')
        return
      }
      if (limit > 1000000) {
        toast.error('Limite máximo é R$ 1.000.000,00')
        return
      }
    }

    setLoading(true)

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        toast.error('Usuário não autenticado')
        setLoading(false)
        return
      }

      const cardData = {
        name: formData.name.trim(),
        type: formData.type,
        brand: formData.brand.trim() || null,
        last_digits: formData.lastDigits.trim() || null,
        limit: formData.limitAmount ? parseFloat(formData.limitAmount) : null,
        is_active: true,
        user_id: user.id
      }

      const { error } = await addCard(cardData)
      
      if (error) {
        toast.error(typeof error === 'string' ? error : 'Erro ao adicionar cartão')
      } else {
        toast.success('Cartão adicionado com sucesso!')
        // Reset do formulário após sucesso
        setFormData({
          name: '',
          type: 'credit',
          brand: '',
          lastDigits: '',
          limitAmount: '',
        })
        router.push('/cards')
      }
    } catch (error) {
      console.error('Erro ao criar cartão:', error)
      toast.error(
        error instanceof Error ? error.message : 'Erro ao salvar cartão'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleLastDigitsChange = (value: string) => {
    // Permite apenas números e limita a 4 dígitos
    const digitsOnly = value.replace(/\D/g, '').slice(0, 4)
    handleInputChange('lastDigits', digitsOnly)
  }

  const handleLimitAmountChange = (value: string) => {
    // Permite apenas números e ponto decimal
    const sanitizedValue = value.replace(/[^\d.]/g, '')
    // Remove pontos extras, mantendo apenas o último
    const parts = sanitizedValue.split('.')
    let finalValue = parts[0]
    if (parts.length > 1) {
      finalValue += '.' + parts.slice(1).join('').slice(0, 2)
    }
    handleInputChange('limitAmount', finalValue)
  }

  const formatCurrency = (value: string) => {
    if (!value) return ''
    const number = parseFloat(value)
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(number)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/cards">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Cartão</h1>
          <p className="text-gray-600">Adicione um novo cartão de crédito ou débito</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Cartão</CardTitle>
          <CardDescription>
            Preencha os dados do seu cartão para organizar suas transações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nome do Cartão */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Cartão *
                </label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ex: Nubank Crédito"
                  required
                  disabled={loading}
                  className="disabled:opacity-50"
                />
              </div>

              {/* Tipo do Cartão */}
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo *
                </label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: 'credit' | 'debit') => handleInputChange('type', value)}
                  disabled={loading}
                >
                  <SelectTrigger className="disabled:opacity-50">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Crédito</SelectItem>
                    <SelectItem value="debit">Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bandeira */}
              <div>
                <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                  Bandeira
                </label>
                <Select 
                  value={formData.brand} 
                  onValueChange={(value) => handleInputChange('brand', value)}
                  disabled={loading}
                >
                  <SelectTrigger className="disabled:opacity-50">
                    <SelectValue placeholder="Selecione a bandeira" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Outra</SelectItem>
                    {knownBrands.map(brand => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.brand === '' && (
                  <Input
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    placeholder="Digite a bandeira"
                    disabled={loading}
                    className="mt-2 disabled:opacity-50"
                  />
                )}
              </div>

              {/* Últimos 4 dígitos */}
              <div>
                <label htmlFor="lastDigits" className="block text-sm font-medium text-gray-700 mb-1">
                  Últimos 4 dígitos
                  {formData.lastDigits && formData.lastDigits.length !== 4 && (
                    <span className="text-orange-600 text-xs ml-1">(precisa ter 4 dígitos)</span>
                  )}
                </label>
                <Input
                  id="lastDigits"
                  value={formData.lastDigits}
                  onChange={(e) => handleLastDigitsChange(e.target.value)}
                  placeholder="1234"
                  maxLength={4}
                  disabled={loading}
                  className="disabled:opacity-50"
                />
              </div>

              {/* Limite do Cartão (apenas crédito) */}
              {formData.type === 'credit' && (
                <div className="md:col-span-2">
                  <label htmlFor="limitAmount" className="block text-sm font-medium text-gray-700 mb-1">
                    Limite do Cartão (R$)
                    {formData.limitAmount && (
                      <span className="text-green-600 text-xs ml-2">
                        {formatCurrency(formData.limitAmount)}
                      </span>
                    )}
                  </label>
                  <Input
                    id="limitAmount"
                    type="text"
                    inputMode="decimal"
                    value={formData.limitAmount}
                    onChange={(e) => handleLimitAmountChange(e.target.value)}
                    placeholder="5000.00"
                    disabled={loading}
                    className="disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Digite o valor limite do cartão (mínimo: R$ 10,00)
                  </p>
                </div>
              )}
            </div>

            {/* Botões de ação */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Link href="/cards">
                <Button variant="outline" type="button" disabled={loading}>
                  Cancelar
                </Button>
              </Link>
              <Button 
                type="submit" 
                disabled={loading || !formData.name.trim()}
                className="relative min-w-32 disabled:opacity-50"
              >
                {loading && (
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  </div>
                )}
                {loading ? 'Salvando...' : 'Salvar Cartão'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}