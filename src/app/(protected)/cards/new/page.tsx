'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth-store'

interface CardFormData {
  name: string
  type: 'credit' | 'debit'
  limit: number
  closing_day: number
  due_day: number
}

export default function NewCardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { user } = useAuthStore() // busca usuário do store global
  const [formData, setFormData] = useState<CardFormData>({
    name: '',
    type: 'credit',
    limit: 0,
    closing_day: 1,
    due_day: 10
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (!user) {
      toast.error('Usuário não autenticado')
      setLoading(false)
      return
    }

    if (!formData.name || (formData.type === 'credit' && formData.limit <= 0)) {
      toast.error('Preencha todos os campos obrigatórios')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase
        .from('cards')
        .insert([{ ...formData, user_id: user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])

      if (error) {
        console.error('Erro do Supabase:', error)
        if (error.code === '42P01') {
          toast.error('Tabela de cartões não configurada')
        } else {
          throw error
        }
        return
      }

      toast.success('Cartão cadastrado com sucesso!')
      router.push('/cards')
    } catch (error) {
      console.error('Erro ao cadastrar cartão:', error)
      toast.error('Erro ao cadastrar cartão')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof CardFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Cadastrar Novo Cartão</CardTitle>
            <CardDescription>
              Adicione um cartão de crédito ou débito para controle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Nome do Cartão *
                  </label>
                  <Input
                    id="name"
                    placeholder="Ex: Nubank, Itaú..."
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="type" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Tipo do Cartão *
                  </label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: 'credit' | 'debit') => handleInputChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Cartão de Crédito</SelectItem>
                      <SelectItem value="debit">Cartão de Débito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.type === 'credit' && (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="limit" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Limite do Cartão (R$) *
                      </label>
                      <Input
                        id="limit"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={formData.limit || ''}
                        onChange={(e) => handleInputChange('limit', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="closing_day" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Dia de Fechamento *
                      </label>
                      <Input
                        id="closing_day"
                        type="number"
                        min="1"
                        max="31"
                        placeholder="1"
                        value={formData.closing_day}
                        onChange={(e) => handleInputChange('closing_day', parseInt(e.target.value) || 1)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="due_day" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Dia de Vencimento *
                      </label>
                      <Input
                        id="due_day"
                        type="number"
                        min="1"
                        max="31"
                        placeholder="10"
                        value={formData.due_day}
                        onChange={(e) => handleInputChange('due_day', parseInt(e.target.value) || 10)}
                        required
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/cards')}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                >
                  {loading ? 'Cadastrando...' : 'Cadastrar Cartão'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}