'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useTransactionsStore } from '@/lib/stores/transactions-store'
import { useCardsStore } from '@/lib/stores/cards-store'
import { useBudgetsStore } from '@/lib/stores/budgets-store'
import CategoriesManagement from '@/components/forms/categories-management'
import { exportToJSON, generateFilename } from '@/utils/export-utils'
import { User, CreditCard, Palette, Shield, Trash2, Download } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function SettingsPage() {
  const { user, updateProfile } = useAuthStore()
  const { transactions, fetchTransactions } = useTransactionsStore()
  const { cards, fetchCards } = useCardsStore()
  const { budgets, fetchBudgets } = useBudgetsStore()
  const [fullName, setFullName] = useState(user?.full_name || '')

  const handleProfileUpdate = async () => {
    if (fullName) {
      // Se updateProfile espera um objeto, ajuste conforme a store
      const { error } = await updateProfile({ full_name: fullName } as any)
      if (error) {
        toast.error(error)
      } else {
        toast.success('Perfil atualizado com sucesso!')
      }
    }
  }

  const handleExportData = async () => {
    try {
      // Fetch all user data
      await Promise.all([
        fetchTransactions(),
        fetchCards(),
        fetchBudgets()
      ])

      // Usando type assertion para o objeto completo
      const userData = {
        profile: {
          id: user?.id,
          // Remova email se não estiver disponível no user da store
          full_name: user?.full_name,
          created_at: user?.created_at
        },
        transactions: transactions.map(t => {
          const tAny = t as any
          return {
            id: tAny.id || tAny.transaction_id || tAny._id,
            description: tAny.description,
            amount: tAny.amount,
            type: tAny.type,
            transaction_date: tAny.transaction_date,
            category: tAny.category?.name || tAny.category_name,
            card: tAny.card?.name || tAny.card_name,
            notes: tAny.notes
          }
        }),
        cards: cards.map(c => {
          const cAny = c as any
          return {
            id: cAny.id || cAny.card_id || cAny._id,
            name: cAny.name,
            type: cAny.type,
            brand: cAny.brand,
            last_digits: cAny.last_digits,
            limit_amount: cAny.limit_amount,
            is_active: cAny.is_active
          }
        }),
        budgets: budgets.map(b => {
          const bAny = b as any
          return {
            id: bAny.id || bAny.budget_id || bAny._id,
            category: bAny.category?.name || bAny.category_name,
            month: bAny.month,
            limit_amount: bAny.limit_amount,
            alert_percentage: bAny.alert_percentage
          }
        })
      } as any

      const filename = generateFilename('dados_usuario', 'json')
      exportToJSON(userData, filename)
      toast.success('Dados exportados com sucesso!')
    } catch (error) {
      toast.error('Erro ao exportar dados')
    }
  }

  const handleDeleteAccount = () => {
    if (window.confirm('Tem certeza que deseja deletar sua conta? Esta ação não pode ser desfeita e todos os seus dados serão removidos permanentemente.')) {
      // Implementar lógica de exclusão de conta
      toast.error('Funcionalidade de exclusão de conta em desenvolvimento')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600">Gerencie suas preferências e dados da conta</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
          <TabsTrigger value="privacy">Privacidade</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Informações do Perfil
              </CardTitle>
              <CardDescription>
                Atualize suas informações pessoais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome completo
                  </label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    // Remova o email se não estiver disponível
                    defaultValue=""
                    disabled
                    placeholder="Email não disponível"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nova senha
                </label>
                <Input
                  type="password"
                  placeholder="Deixe em branco para não alterar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar nova senha
                </label>
                <Input
                  type="password"
                  placeholder="Confirme a nova senha"
                />
              </div>
              <Button onClick={handleProfileUpdate}>Salvar alterações</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resto do código permanece igual */}
        {/* ... */}
      </Tabs>
    </div>
  )
}