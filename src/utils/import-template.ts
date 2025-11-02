/**
 * Utilitário para gerar modelo de importação de transações
 */

export function generateImportTemplate(format: 'csv' | 'xlsx' = 'xlsx') {
  // Dados do modelo com exemplo
  const headers = [
    'data',
    'descricao',
    'valor',
    'metodo_pagamento',
    'categoria',
    'cartao',
    'natureza_despesa',
    'observacoes',
  ]

  // Exemplos de dados
  const examples = [
    {
      data: '2025-01-15',
      descricao: 'Supermercado',
      valor: '150.50',
      metodo_pagamento: 'credit',
      categoria: 'Alimentação',
      cartao: '',
      natureza_despesa: 'Essencial',
      observacoes: 'Compras do mês',
    },
    {
      data: '2025-01-20',
      descricao: 'Conta de Luz',
      valor: '120.00',
      metodo_pagamento: 'pix',
      categoria: 'Utilidades',
      cartao: '',
      natureza_despesa: 'Essencial',
      observacoes: '',
    },
  ]

  if (format === 'csv') {
    generateCSVTemplate(headers, examples)
  } else {
    generateXLSXTemplate(headers, examples)
  }
}

function generateCSVTemplate(headers: string[], examples: any[]) {
  // Cria conteúdo CSV
  const csvRows = [
    headers.join(','), // Header
    ...examples.map((row) =>
      headers.map((header) => {
        const value = row[header] || ''
        // Escapa vírgulas e aspas
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    ),
  ]

  const csvContent = csvRows.join('\n')
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }) // BOM para Excel
  downloadFile(blob, 'modelo_importacao_despesas.csv')
}

async function generateXLSXTemplate(headers: string[], examples: any[]) {
  // Tenta usar xlsx library se disponível
  try {
    // Importa dinamicamente xlsx
    const XLSX = await import('xlsx')
    
    // Cria workbook
    const wb = XLSX.utils.book_new()

    // Cria worksheet com dados
    const wsData = [
      headers,
      ...examples.map((row) => headers.map((header) => row[header] || '')),
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Ajusta largura das colunas
    const colWidths = headers.map(() => ({ wch: 20 }))
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, 'Despesas')
    XLSX.writeFile(wb, 'modelo_importacao_despesas.xlsx')
  } catch (error) {
    console.error('Erro ao gerar XLSX:', error)
    // Fallback para CSV
    console.warn('XLSX não disponível, usando CSV')
    generateCSVTemplate(headers, examples)
  }
}

function downloadFile(blob: Blob, filename: string) {
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
