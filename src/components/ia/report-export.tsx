'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { generatePDFReport } from '@/lib/ia/pdf-report'

interface ReportExportProps {
  healthScore: {
    score: number
    breakdown: {
      controleGastos: number
      poupancaReservas: number
      previsibilidade: number
      dividas: number
      diversificacao: number
    }
    category: string
  } | null
  anomalies: Array<{
    title: string
    severity: string
    amount: number
    description: string
  }>
  recommendations: Array<{
    title: string
    priority: string
    estimatedBenefit?: string
  }>
  periodMonths: number
}

export default function ReportExport({ 
  healthScore, 
  anomalies, 
  recommendations, 
  periodMonths 
}: ReportExportProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    if (!healthScore) {
      alert('Aguarde o carregamento dos dados')
      return
    }

    try {
      setLoading(true)
      await generatePDFReport({
        healthScore,
        anomalies,
        recommendations,
        periodMonths,
        generatedAt: new Date(),
      })
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar relatório PDF. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={loading || !healthScore}
      variant="outline"
      className="w-full sm:w-auto"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Gerando...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Exportar Relatório PDF
        </>
      )}
    </Button>
  )
}

