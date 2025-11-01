/**
 * Geração de Relatório PDF
 * Utiliza jspdf e html2canvas já presentes no projeto
 */

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export interface ReportData {
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
  }
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
  generatedAt: Date
}

/**
 * Gera relatório PDF completo
 */
export async function generatePDFReport(data: ReportData): Promise<void> {
  const doc = new jsPDF('portrait', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  let yPos = margin

  // Helper para adicionar nova página se necessário
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage()
      yPos = margin
    }
  }

  // Título
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Relatório de Análise IA', pageWidth / 2, yPos, { align: 'center' })
  yPos += 10

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Gerado em: ${data.generatedAt.toLocaleDateString('pt-BR')} | Período: ${data.periodMonths} meses`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  )
  yPos += 15

  // Score de Saúde Financeira
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Score de Saúde Financeira', margin, yPos)
  yPos += 8

  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  const scoreColor = data.healthScore.score >= 80 ? [34, 197, 94] :
                     data.healthScore.score >= 60 ? [59, 130, 246] :
                     data.healthScore.score >= 40 ? [234, 179, 8] :
                     data.healthScore.score >= 20 ? [249, 115, 22] : [239, 68, 68]
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2])
  doc.text(`${data.healthScore.score}`, margin, yPos)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(12)
  doc.text(`/ 100 (${data.healthScore.category})`, margin + 20, yPos)
  yPos += 10

  // Breakdown
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  const breakdown = data.healthScore.breakdown
  doc.text(`Controle de Gastos: ${breakdown.controleGastos.toFixed(1)} / 30`, margin, yPos)
  yPos += 6
  doc.text(`Poupança e Reservas: ${breakdown.poupancaReservas.toFixed(1)} / 25`, margin, yPos)
  yPos += 6
  doc.text(`Previsibilidade: ${breakdown.previsibilidade.toFixed(1)} / 20`, margin, yPos)
  yPos += 6
  doc.text(`Dívidas: ${breakdown.dividas.toFixed(1)} / 15`, margin, yPos)
  yPos += 6
  doc.text(`Diversificação: ${breakdown.diversificacao.toFixed(1)} / 10`, margin, yPos)
  yPos += 12

  checkPageBreak(30)

  // Anomalias
  if (data.anomalies.length > 0) {
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(`Anomalias Detectadas (${data.anomalies.length})`, margin, yPos)
    yPos += 8

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    data.anomalies.slice(0, 5).forEach((anomaly, idx) => {
      checkPageBreak(20)
      doc.setFont('helvetica', 'bold')
      doc.text(`${idx + 1}. ${anomaly.title}`, margin, yPos)
      yPos += 5
      doc.setFont('helvetica', 'normal')
      doc.text(`   ${anomaly.description}`, margin + 5, yPos, { maxWidth: pageWidth - margin * 2 - 10 })
      yPos += 5
      doc.text(`   Valor: R$ ${anomaly.amount.toFixed(2)} | Severidade: ${anomaly.severity}`, margin + 5, yPos)
      yPos += 8
    })
    yPos += 5
  }

  checkPageBreak(30)

  // Recomendações
  if (data.recommendations.length > 0) {
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(`Recomendações (${data.recommendations.length})`, margin, yPos)
    yPos += 8

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    data.recommendations.slice(0, 5).forEach((rec, idx) => {
      checkPageBreak(20)
      doc.setFont('helvetica', 'bold')
      doc.text(`${idx + 1}. ${rec.title}`, margin, yPos)
      yPos += 5
      doc.setFont('helvetica', 'normal')
      if (rec.estimatedBenefit) {
        doc.text(`   Benefício: ${rec.estimatedBenefit}`, margin + 5, yPos)
        yPos += 5
      }
      doc.text(`   Prioridade: ${rec.priority}`, margin + 5, yPos)
      yPos += 8
    })
  }

  // Rodapé
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
    doc.setTextColor(0, 0, 0)
  }

  // Salva o PDF
  doc.save(`relatorio-analise-ia-${data.generatedAt.toISOString().split('T')[0]}.pdf`)
}

