import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export interface PDFReportData {
  period: string
  totalSpent: number
  averageDaily: number
  monthlyProjection: number
  budgetUsage: number
  availableBalance: number
  daysOfReserve: number
  transactions: Array<{
    date: string
    description: string
    amount: number
    category: string
    type: string
    payment_method?: 'credit' | 'debit' | 'cash' | 'pix' | 'boleto'
  }>
  categoryData: Array<{
    name: string
    value: number
    percentage: number
  }>
}

export class PDFExporter {
  private doc: jsPDF
  private currentY: number = 20
  private pageHeight: number = 280
  private margin: number = 20

  constructor() {
    this.doc = new jsPDF()
    this.doc.setFont('helvetica')
  }

  async generateReport(data: PDFReportData): Promise<void> {
    // Cabeçalho
    this.addHeader(data.period)
    
    // Resumo executivo
    this.addExecutiveSummary(data)
    
    // Gráficos (se disponíveis)
    await this.addCharts()
    
    // Lista de transações
    this.addTransactionsTable(data.transactions)
    
    // Análise por categoria
    this.addCategoryAnalysis(data.categoryData)
    
    // Rodapé
    this.addFooter()
    
    // Salvar PDF
    const filename = `relatorio_financeiro_${new Date().toISOString().slice(0, 10)}.pdf`
    this.doc.save(filename)
  }

  private addHeader(period: string): void {
    this.doc.setFontSize(20)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Relatório Financeiro', this.margin, this.currentY)
    
    this.currentY += 10
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(`Período: ${period}`, this.margin, this.currentY)
    
    this.currentY += 5
    this.doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, this.margin, this.currentY)
    
    this.currentY += 15
    this.addLine()
  }

  private addExecutiveSummary(data: PDFReportData): void {
    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Resumo Executivo', this.margin, this.currentY)
    this.currentY += 10

    // KPIs em duas colunas
    const kpis = [
      { label: 'Total Gasto', value: `R$ ${data.totalSpent.toFixed(2)}` },
      { label: 'Média Diária', value: `R$ ${data.averageDaily.toFixed(2)}` },
      { label: 'Projeção do Mês', value: `R$ ${data.monthlyProjection.toFixed(2)}` },
      { label: 'Orçamento Usado', value: `${data.budgetUsage.toFixed(1)}%` },
      { label: 'Saldo Disponível', value: `R$ ${data.availableBalance.toFixed(2)}` },
      { label: 'Dias de Reserva', value: `${data.daysOfReserve} dias` }
    ]

    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'normal')
    
    for (let i = 0; i < kpis.length; i += 2) {
      const kpi1 = kpis[i]
      const kpi2 = kpis[i + 1]
      
      this.doc.text(`${kpi1.label}:`, this.margin, this.currentY)
      this.doc.text(kpi1.value, this.margin + 60, this.currentY)
      
      if (kpi2) {
        this.doc.text(`${kpi2.label}:`, this.margin + 100, this.currentY)
        this.doc.text(kpi2.value, this.margin + 160, this.currentY)
      }
      
      this.currentY += 8
    }
    
    this.currentY += 10
    this.addLine()
  }

  private async addCharts(): Promise<void> {
    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Análise Visual', this.margin, this.currentY)
    this.currentY += 10

    // Tentar capturar gráficos do dashboard
    try {
      const chartsContainer = document.querySelector('[data-charts-container]')
      if (chartsContainer) {
        const canvas = await html2canvas(chartsContainer as HTMLElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        })
        
        const imgData = canvas.toDataURL('image/png')
        const imgWidth = 160
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        
        if (this.currentY + imgHeight > this.pageHeight) {
          this.doc.addPage()
          this.currentY = 20
        }
        
        this.doc.addImage(imgData, 'PNG', this.margin, this.currentY, imgWidth, imgHeight)
        this.currentY += imgHeight + 10
      }
    } catch (error) {
      console.warn('Não foi possível capturar gráficos:', error)
      this.doc.setFontSize(12)
      this.doc.text('Gráficos não disponíveis nesta versão', this.margin, this.currentY)
      this.currentY += 10
    }
    
    this.addLine()
  }

  private addTransactionsTable(transactions: PDFReportData['transactions']): void {
    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Transações', this.margin, this.currentY)
    this.currentY += 10

    if (transactions.length === 0) {
      this.doc.setFontSize(12)
      this.doc.text('Nenhuma transação encontrada', this.margin, this.currentY)
      this.currentY += 10
      return
    }

    // Cabeçalho da tabela
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')
    
    const colWidths = [22, 55, 28, 23, 22, 20]
    const colPositions = [this.margin, this.margin + 22, this.margin + 77, this.margin + 105, this.margin + 128, this.margin + 150]
    
    this.doc.text('Data', colPositions[0], this.currentY)
    this.doc.text('Descrição', colPositions[1], this.currentY)
    this.doc.text('Valor', colPositions[2], this.currentY)
    this.doc.text('Categoria', colPositions[3], this.currentY)
    this.doc.text('Tipo', colPositions[4], this.currentY)
    this.doc.text('Método', colPositions[5], this.currentY)
    
    this.currentY += 5
    this.addLine()
    this.currentY += 2

    // Dados da tabela
    this.doc.setFont('helvetica', 'normal')
    
    for (const transaction of transactions.slice(0, 20)) { // Limitar a 20 transações
      if (this.currentY > this.pageHeight - 20) {
        this.doc.addPage()
        this.currentY = 20
      }
      
      this.doc.text(transaction.date, colPositions[0], this.currentY)
      this.doc.text(transaction.description.substring(0, 20), colPositions[1], this.currentY)
      this.doc.text(`R$ ${transaction.amount.toFixed(2)}`, colPositions[2], this.currentY)
      this.doc.text(transaction.category.substring(0, 10), colPositions[3], this.currentY)
      this.doc.text(transaction.type, colPositions[4], this.currentY)
      this.doc.text((transaction.payment_method || '').toString(), colPositions[5], this.currentY)
      
      this.currentY += 6
    }
    
    this.currentY += 10
  }

  private addCategoryAnalysis(categoryData: PDFReportData['categoryData']): void {
    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Análise por Categoria', this.margin, this.currentY)
    this.currentY += 10

    if (categoryData.length === 0) {
      this.doc.setFontSize(12)
      this.doc.text('Nenhum dado de categoria disponível', this.margin, this.currentY)
      this.currentY += 10
      return
    }

    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'normal')
    
    for (const category of categoryData.slice(0, 10)) { // Limitar a 10 categorias
      if (this.currentY > this.pageHeight - 20) {
        this.doc.addPage()
        this.currentY = 20
      }
      
      this.doc.text(`${category.name}:`, this.margin, this.currentY)
      this.doc.text(`R$ ${category.value.toFixed(2)} (${category.percentage.toFixed(1)}%)`, this.margin + 80, this.currentY)
      
      this.currentY += 8
    }
    
    this.currentY += 10
  }

  private addFooter(): void {
    const pageCount = this.doc.getNumberOfPages()
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i)
      this.doc.setFontSize(8)
      this.doc.text(`Página ${i} de ${pageCount}`, this.margin, 290)
      this.doc.text('Sistema de Gestão Financeira Pessoal', 150, 290)
    }
  }

  private addLine(): void {
    this.doc.setLineWidth(0.5)
    this.doc.line(this.margin, this.currentY, 190, this.currentY)
    this.currentY += 5
  }
}

export async function exportToPDF(data: PDFReportData): Promise<void> {
  const exporter = new PDFExporter()
  await exporter.generateReport(data)
}
