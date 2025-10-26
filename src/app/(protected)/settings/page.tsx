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
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '')

  const handleProfileUpdate = async () => {
    if (fullName) {
      const { error } = await updateProfile(fullName)
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

      const userData = {
        profile: {
          id: user?.id,
          email: user?.email,
          full_name: user?.user_metadata?.full_name,
          created_at: user?.created_at
        },
        transactions: transactions.map(t => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          type: t.type,
          transaction_date: t.transaction_date,
          category: t.category.name,
          card: t.card?.name,
          notes: t.notes
        })),
        cards: cards.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          brand: c.brand,
          last_digits: c.last_digits,
          limit_amount: c.limit_amount,
          is_active: c.is_active
        })),
        budgets: budgets.map(b => ({
          id: b.id,
          category: b.category.name,
          month: b.month,
          limit_amount: b.limit_amount,
          alert_percentage: b.alert_percentage
        }))
      }

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
                    defaultValue={user?.id || ''}
                    disabled
                    placeholder="seu@email.com"
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

        {/* Categories Tab */}
        <TabsContent value="categories">
          <CategoriesManagement />
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="mr-2 h-5 w-5" />
                Aparência
              </CardTitle>
              <CardDescription>
                Personalize a aparência da aplicação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tema
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="cursor-pointer hover:bg-gray-50">
                    <CardContent className="p-4 text-center">
                      <div className="w-8 h-8 bg-white border-2 border-gray-300 rounded mx-auto mb-2"></div>
                      <p className="text-sm font-medium">Claro</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:bg-gray-50">
                    <CardContent className="p-4 text-center">
                      <div className="w-8 h-8 bg-gray-800 border-2 border-gray-300 rounded mx-auto mb-2"></div>
                      <p className="text-sm font-medium">Escuro</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
              <Button>Salvar preferências</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Dados e Privacidade
                </CardTitle>
                <CardDescription>
                  Gerencie seus dados pessoais e privacidade
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium">Exportar dados</h3>
                    <p className="text-sm text-gray-600">
                      Baixe todos os seus dados em formato JSON
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleExportData}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                  <div>
                    <h3 className="font-medium text-red-900">Deletar conta</h3>
                    <p className="text-sm text-red-700">
                      Esta ação não pode ser desfeita. Todos os seus dados serão removidos permanentemente.
                    </p>
                  </div>
                  <Button variant="destructive" onClick={handleDeleteAccount}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Deletar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documentos Legais</CardTitle>
                <CardDescription>
                  Termos de uso e política de privacidade
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/terms">
                  <Button variant="outline" className="w-full justify-start">
                    Termos de Uso
                  </Button>
                </Link>
                <Link href="/privacy">
                  <Button variant="outline" className="w-full justify-start">
                    Política de Privacidade
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
