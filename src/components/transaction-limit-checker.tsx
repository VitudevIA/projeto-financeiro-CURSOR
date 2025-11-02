'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePlansStore } from '@/lib/stores/plans-store'
import { AlertTriangle, Zap, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface TransactionLimitCheckerProps {
  onLimitReached?: () => void
}

export default function TransactionLimitChecker({ onLimitReached }: TransactionLimitCheckerProps) {
  const { userPlan, plans, checkTransactionLimit, fetchUserPlan } = usePlansStore()
  const [limitInfo, setLimitInfo] = useState<{ canAdd: boolean; remaining: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkLimit = async () => {
      setLoading(true)
      await fetchUserPlan()
      const limit = await checkTransactionLimit()
      setLimitInfo(limit)
      setLoading(false)

      if (!limit.canAdd && onLimitReached) {
        onLimitReached()
      }
    }

    checkLimit()
  }, [checkTransactionLimit, fetchUserPlan, onLimitReached])

  if (loading || !userPlan || !limitInfo) {
    return null
  }

  const currentPlan = plans.find(p => p.id === userPlan.plan_id)
  if (!currentPlan) return null

  // Se pode adicionar transações, não mostrar nada
  if (limitInfo.canAdd) {
    return null
  }

  // Se atingiu o limite
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center text-orange-900">
          <AlertTriangle className="mr-2 h-5 w-5" />
          Limite de Transações Atingido
        </CardTitle>
        <CardDescription className="text-orange-700">
          Você atingiu o limite do seu plano atual
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-800">
                <strong>Plano Atual:</strong> {currentPlan.name}
              </p>
              <p className="text-sm text-orange-800">
                <strong>Limite:</strong> {currentPlan.transaction_limit === -1 ? 'Ilimitado' : `${currentPlan.transaction_limit} transações/mês`}
              </p>
              <p className="text-sm text-orange-800">
                <strong>Usado:</strong> {userPlan.transaction_count} transações
              </p>
            </div>
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              {userPlan.transaction_count}/{currentPlan.transaction_limit === -1 ? '∞' : currentPlan.transaction_limit}
            </Badge>
          </div>

          <div className="flex items-center space-x-3">
            <Link href="/plans">
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Zap className="mr-2 h-4 w-4" />
                Fazer Upgrade
              </Button>
            </Link>
            <Button variant="outline" onClick={() => toast.info('Entre em contato para suporte')}>
              Entrar em Contato
            </Button>
          </div>

          <div className="text-xs text-orange-600">
            💡 <strong>Dica:</strong> Faça upgrade para continuar adicionando transações sem limites
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Componente para mostrar status do limite (mais discreto)
export function TransactionLimitStatus() {
  const { userPlan, plans, checkTransactionLimit, fetchUserPlan } = usePlansStore()
  const [limitInfo, setLimitInfo] = useState<{ canAdd: boolean; remaining: number } | null>(null)

  useEffect(() => {
    const checkLimit = async () => {
      await fetchUserPlan()
      const limit = await checkTransactionLimit()
      setLimitInfo(limit)
    }

    checkLimit()
  }, [checkTransactionLimit, fetchUserPlan])

  if (!userPlan || !limitInfo || limitInfo.remaining === -1) {
    return null
  }

  const currentPlan = plans.find(p => p.id === userPlan.plan_id)
  if (!currentPlan) return null

  const percentage = (userPlan.transaction_count / currentPlan.transaction_limit) * 100
  const isNearLimit = percentage >= 80
  const isAtLimit = !limitInfo.canAdd

  if (isAtLimit) {
    return (
      <div className="flex items-center space-x-2 text-red-600">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">Limite atingido</span>
      </div>
    )
  }

  if (isNearLimit) {
    return (
      <div className="flex items-center space-x-2 text-orange-600">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm">
          {limitInfo.remaining} transações restantes
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2 text-green-600">
      <CheckCircle className="h-4 w-4" />
      <span className="text-sm">
        {limitInfo.remaining} transações restantes
      </span>
    </div>
  )
}
