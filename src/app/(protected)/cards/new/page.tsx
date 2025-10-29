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

export default function NewCardPage() {
  const [formData, setFormData] = useState({
    name: '',
    type: 'credit' as 'credit' | 'debit',
    brand: '',
    lastDigits: '',
    limitAmount: '',
  })
  const [loading, setLoading] = useState(false)
  const { addCard } = useCardsStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // ✅ CORREÇÃO: Obter o usuário atual corretamente
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        toast.error('Usuário não autenticado')
        setLoading(false)
        return
      }

      const cardData = {
        name: formData.name,
        type: formData.type,
        brand: formData.brand || null,
        last_digits: formData.lastDigits || null,
        limit_amount: formData.limitAmount ? parseFloat(formData.limitAmount) : null,
        is_active: true,
        user_id: user.id // ✅ AGORA COM UUID VÁLIDO
      }

      const { error } = await addCard(cardData as any)
      
      if (error) {
        toast.error(error)
      } else {
        toast.success('Cartão adicionado com sucesso!')
        router.push('/cards')
      }
    } catch (error) {
      console.error('Erro ao criar cartão:', error)
      toast.error('Erro ao salvar cartão')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
                />
              </div>

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
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                  Bandeira
                </label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  placeholder="Ex: Visa, Mastercard"
                />
              </div>

              <div>
                <label htmlFor="lastDigits" className="block text-sm font-medium text-gray-700 mb-1">
                  Últimos 4 dígitos
                </label>
                <Input
                  id="lastDigits"
                  value={formData.lastDigits}
                  onChange={(e) => handleInputChange('lastDigits', e.target.value)}
                  placeholder="1234"
                  maxLength={4}
                />
              </div>

              {formData.type === 'credit' && (
                <div className="md:col-span-2">
                  <label htmlFor="limitAmount" className="block text-sm font-medium text-gray-700 mb-1">
                    Limite do Cartão (R$)
                  </label>
                  <Input
                    id="limitAmount"
                    type="number"
                    step="0.01"
                    value={formData.limitAmount}
                    onChange={(e) => handleInputChange('limitAmount', e.target.value)}
                    placeholder="5000.00"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <Link href="/cards">
                <Button variant="outline" type="button">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Cartão'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}