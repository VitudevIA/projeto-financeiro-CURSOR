'use client'

import { useState, useEffect } from 'react'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

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
  const { addCategory, updateCategory, fetchCategories } = useCategoriesStore()
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
    
    if (!formData.name.trim()) {
      toast.error('Nome da categoria é obrigatório')
      return
    }

    try {
      // Obter user_id da sessão do Supabase
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.user) {
        console.error('[Categories Management] ❌ Erro ao obter sessão:', sessionError)
        toast.error('Erro ao obter informações do usuário. Por favor, faça login novamente.')
        return
      }
      
      const categoryData = {
        name: formData.name.trim(),
        icon: formData.icon || null,
        color: formData.color,
        is_system: false,
        user_id: session.user.id,
        type: formData.type || 'expense'
      }

      if (editingCategory) {
        // Atualizar categoria existente
        const { error } = await updateCategory(editingCategory.id, categoryData)
        if (error) {
          console.error('[Categories Management] ❌ Erro ao atualizar categoria:', error)
          toast.error(`Erro ao atualizar categoria: ${error}`)
          return
        }
        toast.success('Categoria atualizada com sucesso!')
        onClose() // handleCloseCategoryDialog já chama fetchCategories()
      } else {
        // Criar nova categoria
        const { error } = await addCategory(categoryData as any)
        if (error) {
          console.error('[Categories Management] ❌ Erro ao criar categoria:', error)
          toast.error(`Erro ao criar categoria: ${error}`)
          return
        }
        toast.success('Categoria criada com sucesso!')
        onClose() // handleCloseCategoryDialog já chama fetchCategories()
      }
    } catch (error) {
      console.error('[Categories Management] ❌ Erro inesperado:', error)
      toast.error(`Erro inesperado: ${(error as Error).message}`)
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
          <DialogDescription>
            {editingCategory 
              ? 'Edite as informações da categoria abaixo.' 
              : 'Preencha os campos para criar uma nova categoria de transação.'}
          </DialogDescription>
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