'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useTransactionsStore } from '@/lib/stores/transactions-store'
import { useCardsStore } from '@/lib/stores/cards-store'
import { useBudgetsStore } from '@/lib/stores/budgets-store'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import CategoriesManagement from '@/components/forms/categories-management'
import { exportToJSON, generateFilename } from '@/utils/export-utils'
import { User, CreditCard, Palette, Shield, Trash2, Download, Moon, Sun, Plus, Edit, X } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const { user, updateProfile } = useAuthStore()
  const { transactions, fetchTransactions } = useTransactionsStore()
  const { cards, fetchCards } = useCardsStore()
  const { budgets, fetchBudgets } = useBudgetsStore()
  const { categories, loading: categoriesLoading, fetchCategories, deleteCategory } = useCategoriesStore()
  const [fullName, setFullName] = useState(user?.full_name || '')
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const isDarkMode = theme === 'dark'

  // Prevenir hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Carregar categorias quando a aba for acessada
  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

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

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light')
    toast.success(checked ? 'Modo escuro ativado' : 'Modo claro ativado')
  }

  const handleOpenCategoryDialog = (category?: any) => {
    setEditingCategory(category || null)
    setIsCategoryDialogOpen(true)
  }

  const handleCloseCategoryDialog = () => {
    setIsCategoryDialogOpen(false)
    setEditingCategory(null)
    fetchCategories()
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a categoria "${name}"?`)) {
      return
    }

    const { error } = await deleteCategory(id)
    if (error) {
      toast.error(error)
    } else {
      toast.success('Categoria excluída com sucesso!')
      fetchCategories()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">Gerencie suas preferências e dados da conta</p>
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
                  <Label htmlFor="fullName" className="mb-1">
                    Nome completo
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="mb-1">
                    Email
                  </Label>
                  <Input
                    id="email"
                    defaultValue=""
                    disabled
                    placeholder="Email não disponível"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="newPassword" className="mb-1">
                  Nova senha
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Deixe em branco para não alterar"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="mb-1">
                  Confirmar nova senha
                </Label>
                <Input
                  id="confirmPassword"
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5" />
                    Gerenciar Categorias
                  </CardTitle>
                  <CardDescription>
                    Adicione, edite ou remova categorias de transações
                  </CardDescription>
                </div>
                <Button onClick={() => handleOpenCategoryDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Categoria
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando categorias...
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Nenhuma categoria cadastrada
                  </p>
                  <Button onClick={() => handleOpenCategoryDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeira Categoria
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {categories.map((category) => {
                    const categoryWithExtras = category as any
                    return (
                      <div
                        key={category.id}
                        className="flex items-center justify-between p-4 border border-border/50 rounded-xl hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {categoryWithExtras.color && (
                            <div
                              className="h-4 w-4 rounded-full"
                              style={{ backgroundColor: categoryWithExtras.color }}
                            />
                          )}
                          <div>
                            <p className="font-semibold text-foreground">
                              {category.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {category.type === 'income' ? 'Receita' : 'Despesa'}
                              {categoryWithExtras.is_system && ' • Sistema'}
                            </p>
                          </div>
                        </div>
                        {!categoryWithExtras.is_system && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCategoryDialog(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id, category.name)}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dialog de Categorias */}
          <CategoriesManagement
            isOpen={isCategoryDialogOpen}
            onClose={handleCloseCategoryDialog}
            editingCategory={editingCategory}
          />
        </TabsContent>

        {/* Appearance Tab - Toggle Dark Mode */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="mr-2 h-5 w-5" />
                Aparência
              </CardTitle>
              <CardDescription>
                Personalize a aparência da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Toggle Dark Mode */}
              <div className="flex items-center justify-between p-4 border border-border/50 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-12 w-12 rounded-lg flex items-center justify-center transition-colors",
                    isDarkMode 
                      ? "bg-primary/10 text-primary" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {isDarkMode ? (
                      <Moon className="h-6 w-6" />
                    ) : (
                      <Sun className="h-6 w-6" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="dark-mode-toggle" className="text-base font-semibold cursor-pointer">
                      Modo Escuro
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isDarkMode 
                        ? 'Interface com cores escuras ativada' 
                        : 'Interface com cores branco gelo (modo claro)'}
                    </p>
                  </div>
                </div>
                {mounted && (
                  <Switch
                    id="dark-mode-toggle"
                    checked={isDarkMode}
                    onCheckedChange={handleThemeToggle}
                    aria-label="Alternar modo escuro"
                  />
                )}
              </div>

              {/* Preview */}
              <div className="mt-6 p-4 border border-border/50 rounded-xl bg-muted/30">
                <p className="text-sm font-medium mb-3 text-muted-foreground">Preview do tema atual:</p>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-16 w-16 rounded-lg flex items-center justify-center transition-colors",
                    isDarkMode 
                      ? "bg-card border border-border" 
                      : "bg-card border border-border/50"
                  )}>
                    <Palette className={cn(
                      "h-8 w-8",
                      isDarkMode ? "text-primary" : "text-primary"
                    )} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {isDarkMode ? 'Modo Escuro' : 'Modo Claro (Branco Gelo)'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isDarkMode 
                        ? 'Cores escuras para melhor experiência noturna' 
                        : 'Cores suaves branco gelo para melhor legibilidade'}
                    </p>
                  </div>
                </div>
              </div>
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
                  Privacidade e Segurança
                </CardTitle>
                <CardDescription>
                  Gerencie seus dados e exportações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border/50 rounded-xl">
                  <div>
                    <p className="font-semibold">Exportar Dados</p>
                    <p className="text-sm text-muted-foreground">
                      Baixe todos os seus dados em formato JSON
                    </p>
                  </div>
                  <Button onClick={handleExportData} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="flex items-center text-destructive">
                  <Trash2 className="mr-2 h-5 w-5" />
                  Zona Perigosa
                </CardTitle>
                <CardDescription>
                  Ações irreversíveis relacionadas à sua conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-xl bg-destructive/5">
                  <div>
                    <p className="font-semibold text-destructive">Deletar Conta</p>
                    <p className="text-sm text-muted-foreground">
                      Esta ação não pode ser desfeita
                    </p>
                  </div>
                  <Button onClick={handleDeleteAccount} variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Deletar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}