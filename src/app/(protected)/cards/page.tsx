'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, CreditCard, Edit, Trash2, Power, PowerOff } from 'lucide-react'
import Link from 'next/link'
import { useCardsStore } from '@/lib/stores/cards-store'
import { formatCurrency } from '@/utils/helpers'
import { toast } from 'sonner'

export default function CardsPage() {
  const { cards, loading, fetchCards, deleteCard, toggleCardStatus } = useCardsStore()

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o cartão "${name}"?`)) {
      const { error } = await deleteCard(id)
      if (error) {
        toast.error(error)
      } else {
        toast.success('Cartão excluído com sucesso!')
      }
    }
  }

  const handleToggleStatus = async (id: string) => {
    const { error } = await toggleCardStatus(id)
    if (error) {
      toast.error(error)
    } else {
      toast.success('Status do cartão alterado!')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cartões</h1>
          <p className="text-gray-600">Gerencie seus cartões de crédito e débito</p>
        </div>
        <Link href="/cards/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cartão
          </Button>
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cards Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Card key={card.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{card.name}</CardTitle>
                  <Badge variant={card.is_active ? 'default' : 'secondary'}>
                    {card.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <CardDescription>
                  {card.brand} •••• {card.last_digits}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Tipo:</span>
                    <span className="text-sm font-medium">
                      {card.type === 'credit' ? 'Crédito' : 'Débito'}
                    </span>
                  </div>
                  {card.limit_amount && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Limite:</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(card.limit_amount)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleToggleStatus(card.id)}
                    className="flex-1"
                  >
                    {card.is_active ? (
                      <>
                        <PowerOff className="mr-2 h-4 w-4" />
                        Desativar
                      </>
                    ) : (
                      <>
                        <Power className="mr-2 h-4 w-4" />
                        Ativar
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDelete(card.id, card.name)}
                    className="flex-1"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

        {/* Add Card Card */}
        <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <CreditCard className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Adicionar Cartão
            </h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              Cadastre um novo cartão para organizar suas transações
            </p>
            <Link href="/cards/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Cartão
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

        {/* Add Card Card */}
        <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <CreditCard className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Adicionar Cartão
            </h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              Cadastre um novo cartão para organizar suas transações
            </p>
            <Link href="/cards/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Cartão
              </Button>
            </Link>
          </CardContent>
        </Card>
        </div>
      )}

      {/* Empty State */}
      {!loading && cards.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum cartão cadastrado
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Comece adicionando seus cartões para organizar melhor suas transações
            </p>
            <Link href="/cards/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Cartão
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
