'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useInsightsStore } from '@/lib/stores/insights-store'
import { 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  Info, 
  X, 
  CheckCircle2,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

export default function InsightsCard() {
  const { 
    insights, 
    loading, 
    error, 
    fetchInsights, 
    generateInsights, 
    markAsRead, 
    deleteInsight,
    markAllAsRead 
  } = useInsightsStore()

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  const getInsightIcon = (type: string, severity: string) => {
    const iconClass = severity === 'critical' ? 'text-red-500' : 
                    severity === 'warning' ? 'text-yellow-500' : 'text-blue-500'
    
    switch (type) {
      case 'comparison':
        return <TrendingUp className={`h-5 w-5 ${iconClass}`} />
      case 'anomaly':
        return <AlertTriangle className={`h-5 w-5 ${iconClass}`} />
      case 'trend':
        return <TrendingUp className={`h-5 w-5 ${iconClass}`} />
      case 'prediction':
        return <Lightbulb className={`h-5 w-5 ${iconClass}`} />
      case 'alert':
        return <AlertTriangle className={`h-5 w-5 ${iconClass}`} />
      default:
        return <Info className={`h-5 w-5 ${iconClass}`} />
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Crítico</Badge>
      case 'warning':
        return <Badge variant="secondary">Atenção</Badge>
      case 'info':
        return <Badge variant="outline">Info</Badge>
      default:
        return <Badge variant="outline">Info</Badge>
    }
  }

  const handleGenerateInsights = async () => {
    await generateInsights()
    toast.success('Novos insights gerados!')
  }

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id)
  }

  const handleDeleteInsight = async (id: string) => {
    await deleteInsight(id)
    toast.success('Insight removido')
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
    toast.success('Todos os insights marcados como lidos')
  }

  const unreadCount = insights.filter(insight => !insight.is_read).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Lightbulb className="mr-2 h-5 w-5" />
              Insights Inteligentes
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unreadCount} novo{unreadCount > 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Análises automáticas dos seus gastos e padrões financeiros
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGenerateInsights}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Gerar
            </Button>
            {unreadCount > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleMarkAllAsRead}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Marcar todos
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border rounded-lg">
                <div className="h-5 w-5 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center text-red-600 py-4">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={fetchInsights} className="mt-2">
              Tentar novamente
            </Button>
          </div>
        )}

        {!loading && !error && insights.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Nenhum insight disponível</p>
            <p className="text-sm mb-4">
              Clique em "Gerar" para criar insights automáticos baseados nos seus dados
            </p>
            <Button onClick={handleGenerateInsights}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Gerar Insights
            </Button>
          </div>
        )}

        {!loading && !error && insights.length > 0 && (
          <div className="space-y-3">
            {insights.map((insight) => (
              <div 
                key={insight.id} 
                className={`p-4 border rounded-lg transition-all ${
                  insight.is_read 
                    ? 'bg-gray-50 border-gray-200' 
                    : 'bg-white border-blue-200 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getInsightIcon(insight.type, insight.severity)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {getSeverityBadge(insight.severity)}
                        {!insight.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{insight.message}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(insight.generated_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 ml-4">
                    {!insight.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead(insight.id!)}
                        className="h-8 w-8 p-0"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteInsight(insight.id!)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
