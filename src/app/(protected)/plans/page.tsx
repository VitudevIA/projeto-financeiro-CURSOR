'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePlansStore } from '@/lib/stores/plans-store'
import { Check, Star, Zap } from 'lucide-react'
import { toast } from 'sonner'

export default function PlansPage() {
  const { plans, userPlan, loading, fetchPlans, fetchUserPlan } = usePlansStore()

  useEffect(() => {
    fetchPlans()
    fetchUserPlan()
  }, [fetchPlans, fetchUserPlan])

  const handleUpgrade = (planId: string) => {
    // Por enquanto, apenas mostrar mensagem
    // No futuro, integrar com sistema de pagamento
    toast.info('Sistema de pagamento em desenvolvimento. Entre em contato para upgrade.')
  }

  const getCurrentPlan = () => {
    if (!userPlan) return null
    return plans.find(p => p.id === userPlan.plan_id)
  }

  const currentPlan = getCurrentPlan()

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Escolha seu Plano</h1>
        <p className="text-gray-600 mt-4">
          Selecione o plano que melhor atende às suas necessidades financeiras
        </p>
      </div>

      {/* Current Plan Status */}
      {currentPlan && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">
                  Plano Atual: {currentPlan.name}
                </h3>
                <p className="text-blue-700">
                  {userPlan.transaction_count} de {currentPlan.transaction_limit === -1 ? '∞' : currentPlan.transaction_limit} transações usadas
                </p>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Ativo
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const isCurrentPlan = userPlan?.plan_id === plan.id
          const isPopular = plan.is_popular

          return (
            <Card 
              key={plan.id} 
              className={`relative ${
                isPopular 
                  ? 'border-blue-500 shadow-lg scale-105' 
                  : 'border-gray-200'
              } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white px-4 py-1">
                    <Star className="mr-1 h-3 w-3" />
                    Mais Popular
                  </Badge>
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute -top-4 right-4">
                  <Badge className="bg-green-500 text-white px-4 py-1">
                    <Check className="mr-1 h-3 w-3" />
                    Atual
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">R$ {plan.price.toFixed(2)}</span>
                  <span className="text-gray-600">/mês</span>
                </div>
                <CardDescription className="mt-2">
                  {plan.transaction_limit === -1 
                    ? 'Transações ilimitadas' 
                    : `Até ${plan.transaction_limit} transações por mês`
                  }
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className="w-full"
                  variant={isCurrentPlan ? "outline" : isPopular ? "default" : "outline"}
                  disabled={isCurrentPlan}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {isCurrentPlan ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Plano Atual
                    </Button>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      {plan.price === 0 ? 'Continuar Gratuito' : 'Fazer Upgrade'}
                    </Button>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* FAQ Section */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Perguntas Frequentes
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Como funciona o limite de transações?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                O limite é contado mensalmente. Transações antigas não afetam o limite atual. 
                Você pode ver seu uso atual no dashboard.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Posso mudar de plano a qualquer momento?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Sim! Você pode fazer upgrade ou downgrade a qualquer momento. 
                As mudanças são aplicadas imediatamente.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Meus dados estão seguros?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Absolutamente! Utilizamos criptografia de ponta a ponta e seguimos 
                todas as normas de segurança e LGPD.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Há período de teste?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Sim! Todos os planos pagos têm 7 dias de teste gratuito. 
                Cancele a qualquer momento sem compromisso.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contact Section */}
      <Card className="bg-gray-50">
        <CardContent className="p-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Precisa de ajuda para escolher?
          </h3>
          <p className="text-gray-600 mb-6">
            Nossa equipe está aqui para ajudar você a encontrar o plano ideal
          </p>
          <Button variant="outline">
            Entrar em Contato
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
