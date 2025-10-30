'use client'

import { useState, useEffect } from 'react'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface CategoriesManagementProps {
  isOpen: boolean
  onClose: () => void
  editingCategory?: any
}

interface CategoryFormData {
  name: string
  icon: string | null
  color: string
  type: 'income' | 'expense'
}

export default function CategoriesManagement({ 
  isOpen, 
  onClose, 
  editingCategory 
}: CategoriesManagementProps) {
  const { addCategory, updateCategory } = useCategoriesStore()
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    icon: null,
    color: '#3b82f6',
    type: 'expense'
  })

  useEffect(() => {
    if (editingCategory) {
      setFormData({
        name: editingCategory.name || '',
        icon: editingCategory.icon || null,
        color: editingCategory.color || '#3b82f6',
        type: editingCategory.type || 'expense'
      })
    } else {
      setFormData({
        name: '',
        icon: null,
        color: '#3b82f6',
        type: 'expense'
      })
    }
  }, [editingCategory, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name) {
      toast.error('Nome da categoria é obrigatório')
      return
    }

    try {
      // Obter user_id do localStorage ou usar um valor padrão temporário
      const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      const user = userData ? JSON.parse(userData) : null
      
      const categoryData = {
        name: formData.name,
        icon: formData.icon || null,
        color: formData.color,
        is_system: false,
        user_id: user?.id || 'default-user-id', // Valor temporário
        type: formData.type || 'expense',
        updated_at: null
      }

      if (editingCategory) {
        // Atualizar categoria existente
        try {
          await updateCategory(editingCategory.id, categoryData)
          toast.success('Categoria atualizada com sucesso!')
          onClose()
        } catch (error) {
          toast.error((error as Error).message)
        }
      } else {
        // Criar nova categoria
        try {
          await addCategory(categoryData as any)
          toast.success('Categoria criada com sucesso!')
          onClose()
        } catch (error) {
          toast.error((error as Error).message)
        }
      }
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const handleInputChange = (field: keyof CategoryFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Nome da Categoria *
            </label>
            <Input
              id="name"
              placeholder="Ex: Alimentação, Transporte..."
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="type" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Tipo
            </label>
            <Select 
              value={formData.type} 
              onValueChange={(value: 'income' | 'expense') => handleInputChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Despesa</SelectItem>
                <SelectItem value="income">Receita</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="color" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Cor
            </label>
            <div className="flex gap-2">
              <Input
                id="color"
                type="color"
                value={formData.color}
                onChange={(e) => handleInputChange('color', e.target.value)}
                className="w-20"
              />
              <Input
                value={formData.color}
                onChange={(e) => handleInputChange('color', e.target.value)}
                placeholder="#3b82f6"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="icon" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Ícone (opcional)
            </label>
            <Input
              id="icon"
              placeholder="Nome do ícone ou emoji"
              value={formData.icon || ''}
              onChange={(e) => handleInputChange('icon', e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingCategory ? 'Atualizar' : 'Criar'} Categoria
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}