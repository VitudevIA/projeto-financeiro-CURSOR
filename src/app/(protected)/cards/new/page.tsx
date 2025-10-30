'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase' // ← Importar supabase
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

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
  const [user, setUser] = useState<any>(null)
  const [formData, setFormData] = useState<CardFormData>({
    name: '',
    type: 'credit',
    limit: 0,
    closing_day: 1,
    due_day: 10
  })

  // Verificar usuário logado
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (!user) {
        toast.error('Usuário não autenticado')
        router.push('/login')
      }
    }
    
    getUser()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Verificar autenticação
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
      // Inserir no banco diretamente
      const { error } = await supabase
        .from('cards') // ← ajuste para o nome da sua tabela
        .insert([{
          ...formData,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (error) throw error
      
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

  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center">
          <div className="text-lg">Verificando autenticação...</div>
        </div>
      </div>
    )
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
                {/* Nome do Cartão */}
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

                {/* Tipo do Cartão */}
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

                {/* Limite (apenas crédito) */}
                {formData.type === 'credit' && (
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
                )}

                {/* Dia de Fechamento (apenas crédito) */}
                {formData.type === 'credit' && (
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
                )}

                {/* Dia de Vencimento (apenas crédito) */}
                {formData.type === 'credit' && (
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