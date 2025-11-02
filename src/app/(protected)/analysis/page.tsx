'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import HealthScoreCard from '@/components/ia/health-score-card'
import AnomaliesList from '@/components/ia/anomalies-list'
import RecommendationsList from '@/components/ia/recommendations-list'
import ForecastChart from '@/components/ia/forecast-chart'
import BenchmarkCard from '@/components/ia/benchmark-card'
import ReportExport from '@/components/ia/report-export'
import { AlertCircle, Calendar } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface HealthScoreData {
  score: number
  breakdown: {
    controleGastos: number
    poupancaReservas: number
    previsibilidade: number
    dividas: number
    diversificacao: number
  }
  trend: 'up' | 'down' | 'stable'
  category: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
}

export default function AnalysisPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [periodMonths, setPeriodMonths] = useState(3)
  const [loading, setLoading] = useState(true)
  const [healthScore, setHealthScore] = useState<HealthScoreData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    fetchHealthScore()
  }, [user, router, periodMonths])

  const fetchHealthScore = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/ia/saude-financeira?periodMonths=${periodMonths}`)
      
      if (!response.ok) {
        throw new Error('Erro ao buscar dados')
      }

      const data = await response.json()
      setHealthScore(data)
      setError(null)
    } catch (err) {
      console.error('Erro ao buscar score de saúde:', err)
      setError('Não foi possível carregar os dados. Tente novamente mais tarde.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análise IA</h1>
          <p className="text-muted-foreground mt-2">
            Inteligência acionável para melhorar sua saúde financeira
          </p>
        </div>
        
        {/* Filtro Temporal e Export */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="period" className="flex items-center gap-2 whitespace-nowrap">
              <Calendar className="h-4 w-4" />
              Período:
            </Label>
            <Select value={String(periodMonths)} onValueChange={(value) => setPeriodMonths(Number(value))}>
              <SelectTrigger id="period" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Último mês</SelectItem>
                <SelectItem value="3">3 meses</SelectItem>
                <SelectItem value="6">6 meses</SelectItem>
                <SelectItem value="12">12 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <ReportExport
            healthScore={healthScore ? {
              score: healthScore.score,
              breakdown: healthScore.breakdown,
              category: healthScore.category,
            } : null}
            anomalies={[]}
            recommendations={[]}
            periodMonths={periodMonths}
          />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Health Score - Always Visible */}
      <HealthScoreCard data={healthScore} loading={loading} periodMonths={periodMonths} />

      {/* Tabs Content */}
      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalias</TabsTrigger>
          <TabsTrigger value="benchmark">Benchmark</TabsTrigger>
          <TabsTrigger value="forecast">Previsões</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          <RecommendationsList />
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-4">
          <AnomaliesList />
        </TabsContent>

        <TabsContent value="benchmark" className="space-y-4">
          <BenchmarkCard periodMonths={periodMonths} />
        </TabsContent>

        <TabsContent value="forecast" className="space-y-4">
          <ForecastChart />
        </TabsContent>
      </Tabs>
    </div>
  )
}

