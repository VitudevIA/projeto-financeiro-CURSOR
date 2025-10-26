'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Tag } from 'lucide-react'

export default function CategoriesManagement() {
  const { categories, loading, fetchCategories, addCategory, updateCategory, deleteCategory } = useCategoriesStore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    icon: '',
    color: '#3B82F6',
  })

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Nome da categoria é obrigatório')
      return
    }

    const categoryData = {
      name: formData.name.trim(),
      icon: formData.icon || null,
      color: formData.color,
      is_system: false,
      user_id: 'test-user-id'
    }

    const { error } = await addCategory(categoryData as any)

    if (editingCategory) {
      const { error } = await updateCategory(editingCategory.id, categoryData)
      if (error) {
        toast.error(error)
      } else {
        toast.success('Categoria atualizada com sucesso!')
        setEditingCategory(null)
      }
    } else {
      const { error } = await addCategory(categoryData)
      if (error) {
        toast.error(error)
      } else {
        toast.success('Categoria criada com sucesso!')
      }
    }

    setIsDialogOpen(false)
    setFormData({ name: '', icon: '', color: '#3B82F6' })
  }

  const handleEdit = (category: any) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      icon: category.icon || '',
      color: category.color || '#3B82F6',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a categoria "${name}"?`)) {
      const { error } = await deleteCategory(id)
      if (error) {
        toast.error(error)
      } else {
        toast.success('Categoria excluída com sucesso!')
      }
    }
  }

  const handleCancel = () => {
    setIsDialogOpen(false)
    setEditingCategory(null)
    setFormData({ name: '', icon: '', color: '#3B82F6' })
  }

  const systemCategories = categories.filter(cat => cat.is_system)
  const customCategories = categories.filter(cat => !cat.is_system)

  const iconOptions = [
    '🍽️', '🚗', '🏠', '🏥', '📚', '🎮', '📺', '👕', '💻', '✈️', '📈', '📦',
    '💰', '💳', '🛒', '🍕', '🚌', '🏦', '🎬', '🎵', '📱', '🛍️', '🏊', '⚽'
  ]

  return (
    <div className="space-y-6">
      {/* System Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Tag className="mr-2 h-5 w-5" />
            Categorias do Sistema
          </CardTitle>
          <CardDescription>
            Categorias pré-definidas que não podem ser editadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemCategories.map((category) => (
              <div key={category.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <span className="text-2xl">{category.icon}</span>
                <div className="flex-1">
                  <h3 className="font-medium">{category.name}</h3>
                  <p className="text-sm text-gray-500">Categoria do sistema</p>
                </div>
                <Badge variant="secondary">Sistema</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Categories */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Tag className="mr-2 h-5 w-5" />
                Suas Categorias
              </CardTitle>
              <CardDescription>
                Categorias personalizadas que você criou
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleCancel()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Categoria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCategory ? 'Atualize os dados da categoria' : 'Crie uma nova categoria personalizada'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome da Categoria *
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Viagem"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ícone
                    </label>
                    <div className="grid grid-cols-6 gap-2 mb-2">
                      {iconOptions.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, icon }))}
                          className={`p-2 text-2xl rounded border ${
                            formData.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                    <Input
                      value={formData.icon}
                      onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                      placeholder="Ou digite um emoji"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cor
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <Input
                        value={formData.color}
                        onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingCategory ? 'Atualizar' : 'Criar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : customCategories.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Tag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Nenhuma categoria personalizada criada</p>
              <p className="text-sm">Crie sua primeira categoria personalizada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customCategories.map((category) => (
  <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
    <div className="flex items-center space-x-3">
      <span className="text-2xl">{category.icon}</span>
      <div>
        <h3 className="font-medium">{category.name}</h3>
        <div className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: category.color } as React.CSSProperties}
          ></div>
          <span className="text-sm text-gray-500">Personalizada</span>
        </div>
      </div>
    </div>
    <div className="flex space-x-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleEdit(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(category.id, category.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
