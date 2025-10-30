'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useCardsStore } from '@/lib/stores/cards-store'
import { createClient } from '@/lib/supabase/client'

interface CardFormData {
  name: string
  type: 'credit' | 'debit'
  brand: string
  last_digits: string
  limit: number
}

export default function NewCardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { user } = useAuthStore()
  const { addCard } = useCardsStore()
  const [formData, setFormData] = useState<CardFormData>({
    name: '',
    type: 'credit',
    brand: '',
    last_digits: '',
    limit: 0,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!user) {
        toast.error('Usuário não autenticado')
        return
      }

      if (!formData.name) {
        toast.error('Informe o nome do cartão')
        return
      }

      if (formData.type === 'credit' && (!formData.limit || formData.limit <= 0)) {
        toast.error('Informe um limite válido para cartão de crédito')
        return
      }

      // Verifica e garante sessão válida antes do insert
      const sb = createClient()
      
      const { data: sessionData, error: sessionError } = await sb.auth.getSession()
      
      if (!sessionData.session || sessionError) {
        // Tenta renovar a sessão
        const { data: refreshData, error: refreshError } = await sb.auth.refreshSession()
        
        if (!refreshData.session || refreshError) {
          toast.error('Sessão expirada. Faça login novamente.')
          setTimeout(() => {
            router.push('/login')
          }, 2000)
          return
        }
      }

      // Normaliza últimos 4 dígitos
      const normalizedDigits = (formData.last_digits || '').trim().replace(/\D/g, '').slice(-4)

      // Verifica se já existe cartão igual para este usuário
      let existQuery = sb
        .from('cards')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', formData.type)
        .eq('name', formData.name)

      existQuery = normalizedDigits ? existQuery.eq('last_digits', normalizedDigits) : existQuery.is('last_digits', null)

      const { data: existing, error: existErr } = await existQuery.maybeSingle()

      if (existErr) {
        console.warn('Aviso na verificação de cartão existente:', existErr)
      }

      if (existing) {
        toast.error('Já existe um cartão com este nome, tipo e últimos dígitos.')
        setLoading(false)
        return
      }

      const payload = {
        name: formData.name,
        type: formData.type,
        brand: formData.brand || null,
        last_digits: normalizedDigits || null,
        limit_amount: formData.type === 'credit' ? formData.limit : null,
        user_id: user.id,
        is_active: true,
      }

      // Usa o store para adicionar o cartão (atualiza o estado automaticamente)
      const { error: storeError } = await addCard(payload)

      if (storeError) {
        console.error('Erro ao cadastrar cartão:', storeError)
        
        // Tenta identificar o tipo de erro
        if (storeError.includes('42P01') || storeError.includes('não configurada')) {
          toast.error('Tabela de cartões não configurada no banco de dados')
        } else if (storeError.includes('42501') || storeError.includes('Permissão negada')) {
          toast.error('Permissão negada. Tente refazer login.')
        } else if (storeError.includes('PGRST301') || storeError.includes('autenticação')) {
          toast.error('Erro de autenticação. Faça login novamente.')
          setTimeout(() => {
            router.push('/login')
          }, 2000)
        } else {
          toast.error(`Erro ao cadastrar cartão: ${storeError}`)
        }
        return
      }

      toast.success('Cartão cadastrado com sucesso!')
      router.push('/cards')
      
    } catch (error) {
      console.error('Erro ao cadastrar cartão:', error)
      toast.error('Erro inesperado ao cadastrar cartão. Tente novamente.')
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
      {/* Header simples com botão Voltar e título */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/cards" className="inline-flex items-center text-sm text-gray-700 hover:text-gray-900">
          <ChevronLeft className="h-5 w-5 mr-1" />
          Voltar
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Cartão</h1>
          <p className="text-gray-600">Adicione um novo cartão de crédito ou débito</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900">Informações do Cartão</h2>
        <p className="text-sm text-gray-600 mb-6">Preencha os dados do seu cartão para organizar suas transações</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-1">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome do Cartão *</label>
              <Input
                id="name"
                placeholder="Ex: Nubank Crédito"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700">Tipo *</label>
              <Select
                value={formData.type}
                onValueChange={(value: 'credit' | 'debit') => handleInputChange('type', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Crédito</SelectItem>
                  <SelectItem value="debit">Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-1">
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700">Bandeira</label>
              <Input
                id="brand"
                placeholder="Ex: Visa, Mastercard"
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="md:col-span-1">
              <label htmlFor="last_digits" className="block text-sm font-medium text-gray-700">Últimos 4 dígitos</label>
              <Input
                id="last_digits"
                placeholder="1234"
                value={formData.last_digits}
                onChange={(e) => handleInputChange('last_digits', e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <label htmlFor="limit" className="block text-sm font-medium text-gray-700">Limite do Cartão (R$)</label>
            <Input
              id="limit"
              type="number"
              step="0.01"
              min="0"
              placeholder="5000.00"
              value={formData.type === 'credit' ? (formData.limit || '') : ''}
              onChange={(e) => handleInputChange('limit', parseFloat(e.target.value) || 0)}
              className="mt-1"
              disabled={formData.type !== 'credit'}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => router.push('/cards')} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Cartão'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}