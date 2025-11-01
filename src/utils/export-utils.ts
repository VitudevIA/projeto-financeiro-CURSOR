import { formatCurrency, formatDate } from './helpers'

export interface ExportTransaction {
  id: string
  date: string
  description: string
  amount: number
  type: string
  category: string
  card?: string
  payment_method?: 'credit' | 'debit' | 'cash' | 'pix' | 'boleto'
  notes?: string
}

export function exportToCSV(transactions: ExportTransaction[], filename: string = 'transacoes.csv') {
  if (transactions.length === 0) {
    throw new Error('Nenhuma transação para exportar')
  }

  // Headers
  const headers = [
    'Data',
    'Descrição',
    'Valor',
    'Tipo',
    'Categoria',
    'Cartão',
    'Método',
    'Observações'
  ]

  // Convert transactions to CSV rows
  const rows = transactions.map(transaction => [
    formatDate(transaction.date),
    transaction.description,
    formatCurrency(transaction.amount),
    transaction.type,
    transaction.category,
    transaction.card || '',
    transaction.payment_method || '',
    transaction.notes || ''
  ])

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n')

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

export function exportToJSON(transactions: ExportTransaction[], filename: string = 'transacoes.json') {
  if (transactions.length === 0) {
    throw new Error('Nenhuma transação para exportar')
  }

  const jsonContent = JSON.stringify(transactions, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

export function generateFilename(prefix: string = 'transacoes', extension: string = 'csv'): string {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '')
  return `${prefix}_${dateStr}_${timeStr}.${extension}`
}
