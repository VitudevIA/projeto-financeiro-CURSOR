'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, AlertCircle, Info, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/utils/helpers'
import { cn } from '@/lib/utils'

interface Anomaly {
  id: string
  severity: 'critical' | 'high' | 'moderate'
  type: string
  title: string
  description: string
  amount: number
  deviation: number
  date: string
  category_name?: string
  suggestedAction?: string
}

export default function AnomaliesList() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [criticalAnomaly, setCriticalAnomaly] = useState<Anomaly | null>(null)

  useEffect(() => {
    fetchAnomalies()
  }, [])

  // Abre modal automaticamente para primeira anomalia crítica
  useEffect(() => {
    const critical = anomalies.find(a => a.severity === 'critical')
    if (critical) {
      setCriticalAnomaly(critical)
    }
  }, [anomalies])

  const fetchAnomalies = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/ia/anomalias?periodMonths=3')
      
      if (!response.ok) {
        throw new Error('Erro ao buscar anomalias')
      }

      const data = await response.json()
      setAnomalies(data.anomalies || [])
      setError(null)
    } catch (err) {
      console.error('Erro ao buscar anomalias:', err)
      setError('Não foi possível carregar as anomalias.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Anomalias Detectadas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const severityConfig = {
    critical: {
      label: 'Crítico',
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: AlertCircle,
      iconColor: 'text-red-600',
    },
    high: {
      label: 'Alto',
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: AlertTriangle,
      iconColor: 'text-orange-600',
    },
    moderate: {
      label: 'Moderado',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: Info,
      iconColor: 'text-yellow-600',
    },
  }

  if (anomalies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Anomalias Detectadas
          </CardTitle>
          <CardDescription>Nenhuma anomalia detectada recentemente</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Seus gastos estão dentro do padrão esperado. Continue assim! 🎉
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Modal para Anomalias Críticas */}
      <Dialog open={!!criticalAnomaly} onOpenChange={(open) => !open && setCriticalAnomaly(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              Anomalia Crítica Detectada
            </DialogTitle>
            <DialogDescription>
              Uma situação crítica foi identificada nos seus gastos
            </DialogDescription>
          </DialogHeader>
          
          {criticalAnomaly && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h3 className="font-semibold text-red-900 mb-2">{criticalAnomaly.title}</h3>
                <p className="text-sm text-red-800 mb-3">{criticalAnomaly.description}</p>
                
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs text-red-600 mb-1">Valor</div>
                    <div className="text-lg font-bold text-red-900">
                      {formatCurrency(criticalAnomaly.amount)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-red-600 mb-1">Desvio</div>
                    <div className="text-lg font-bold text-red-900">
                      {criticalAnomaly.deviation > 0 ? '+' : ''}{criticalAnomaly.deviation.toFixed(0)}%
                    </div>
                  </div>
                </div>

                {criticalAnomaly.category_name && (
                  <div className="text-xs text-red-700 mb-2">
                    Categoria: {criticalAnomaly.category_name}
                  </div>
                )}

                {criticalAnomaly.suggestedAction && (
                  <div className="mt-3 p-3 bg-white rounded border border-red-300">
                    <div className="text-xs font-semibold text-red-900 mb-1">💡 Ação Recomendada:</div>
                    <div className="text-xs text-red-800">{criticalAnomaly.suggestedAction}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setCriticalAnomaly(null)}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Anomalias Detectadas
          </CardTitle>
          <CardDescription>
            {anomalies.length} {anomalies.length === 1 ? 'anomalia encontrada' : 'anomalias encontradas'}
            {anomalies.filter(a => a.severity === 'critical').length > 0 && (
              <span className="ml-2 text-red-600 font-semibold">
                ({anomalies.filter(a => a.severity === 'critical').length} crítica(s))
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
        <div className="space-y-4">
          {anomalies.map((anomaly) => {
            const config = severityConfig[anomaly.severity]
            const Icon = config.icon

            return (
              <div
                key={anomaly.id}
                className={cn(
                  'p-4 rounded-lg border-2',
                  config.color
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-5 w-5', config.iconColor)} />
                    <h3 className="font-semibold">{anomaly.title}</h3>
                    <Badge variant="outline" className={cn('ml-2', config.color)}>
                      {config.label}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{formatCurrency(anomaly.amount)}</div>
                    <div className="text-xs text-muted-foreground">
                      {anomaly.deviation > 0 ? '+' : ''}{anomaly.deviation.toFixed(0)}%
                    </div>
                  </div>
                </div>

                <p className="text-sm mb-2">{anomaly.description}</p>

                {anomaly.category_name && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Categoria: {anomaly.category_name}
                  </p>
                )}

                {anomaly.suggestedAction && (
                  <div className="mt-3 p-2 bg-white/50 rounded text-xs">
                    <strong>💡 Sugestão:</strong> {anomaly.suggestedAction}
                  </div>
                )}

                <div className="text-xs text-muted-foreground mt-2">
                  {new Date(anomaly.date).toLocaleDateString('pt-BR')}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
    </>
  )
}

