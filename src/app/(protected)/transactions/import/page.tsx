'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTransactionsStore } from '@/lib/stores/transactions-store'
import { useCardsStore } from '@/lib/stores/cards-store'
import { useCategoriesStore } from '@/lib/stores/categories-store'
import { formatCurrency, formatDate } from '@/utils/helpers'
import { toast } from 'sonner'
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import * as XLSX from 'xlsx'

interface ImportedTransaction {
  date: string
  description: string
  amount: number
  category: string
  card?: string
  type: string
  isValid: boolean
  errors: string[]
}

export default function ImportTransactionsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [importedData, setImportedData] = useState<ImportedTransaction[]>([])
  const [mapping, setMapping] = useState({
    dateColumn: '',
    descriptionColumn: '',
    amountColumn: '',
    categoryColumn: '',
    cardColumn: '',
    typeColumn: '',
  })
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { addTransaction } = useTransactionsStore()
  const { cards, fetchCards } = useCardsStore()
  const { categories, fetchCategories } = useCategoriesStore()
  const router = useRouter()

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/)) {
      toast.error('Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV')
      return
    }

    setFile(selectedFile)
    parseFile(selectedFile)
  }

  const parseFile = async (file: File) => {
    try {
      setLoading(true)
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      if (jsonData.length === 0) {
        toast.error('Arquivo vazio ou inválido')
        return
      }

      const headers = jsonData[0] as string[]
      setMapping({
        dateColumn: headers.find(h => h?.toLowerCase().includes('data')) || '',
        descriptionColumn: headers.find(h => h?.toLowerCase().includes('descrição') || h?.toLowerCase().includes('description')) || '',
        amountColumn: headers.find(h => h?.toLowerCase().includes('valor') || h?.toLowerCase().includes('amount')) || '',
        categoryColumn: headers.find(h => h?.toLowerCase().includes('categoria') || h?.toLowerCase().includes('category')) || '',
        cardColumn: headers.find(h => h?.toLowerCase().includes('cartão') || h?.toLowerCase().includes('card')) || '',
        typeColumn: headers.find(h => h?.toLowerCase().includes('tipo') || h?.toLowerCase().includes('type')) || '',
      })

      const rows = jsonData.slice(1) as any[][]
      const transactions: ImportedTransaction[] = rows.map((row, index) => {
        const transaction: ImportedTransaction = {
          date: '',
          description: '',
          amount: 0,
          category: '',
          type: 'credit',
          isValid: true,
          errors: [],
        }

        // Parse data based on mapping
        if (mapping.dateColumn) {
          const dateIndex = headers.indexOf(mapping.dateColumn)
          transaction.date = row[dateIndex] ? new Date(row[dateIndex]).toISOString().split('T')[0] : ''
        }
        if (mapping.descriptionColumn) {
          const descIndex = headers.indexOf(mapping.descriptionColumn)
          transaction.description = row[descIndex] || ''
        }
        if (mapping.amountColumn) {
          const amountIndex = headers.indexOf(mapping.amountColumn)
          transaction.amount = parseFloat(row[amountIndex]) || 0
        }
        if (mapping.categoryColumn) {
          const catIndex = headers.indexOf(mapping.categoryColumn)
          transaction.category = row[catIndex] || ''
        }
        if (mapping.typeColumn) {
          const typeIndex = headers.indexOf(mapping.typeColumn)
          transaction.type = row[typeIndex] || 'credit'
        }

        // Validate transaction
        if (!transaction.date) transaction.errors.push('Data é obrigatória')
        if (!transaction.description) transaction.errors.push('Descrição é obrigatória')
        if (transaction.amount <= 0) transaction.errors.push('Valor deve ser maior que zero')
        if (!transaction.category) transaction.errors.push('Categoria é obrigatória')

        transaction.isValid = transaction.errors.length === 0
        return transaction
      })

      setImportedData(transactions)
      setLoading(false)
    } catch (error) {
      console.error('Erro ao processar arquivo:', error)
      toast.error('Erro ao processar arquivo')
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (importedData.length === 0) return

    setImporting(true)
    let successCount = 0
    let errorCount = 0

    for (const transaction of importedData) {
      if (!transaction.isValid) {
        errorCount++
        continue
      }

      // Find category by name
      const category = categories.find(c => 
        c.name.toLowerCase() === transaction.category.toLowerCase()
      )

      if (!category) {
        errorCount++
        continue
      }

      const transactionData = {
        type: transaction.type as any,
        card_id: null,
        category_id: category.id,
        amount: transaction.amount,
        description: transaction.description,
        transaction_date: transaction.date,
        is_recurring: false,
        recurring_type: null,
        notes: null,
      }

      const { error } = await addTransaction(transactionData)
      if (error) {
        errorCount++
      } else {
        successCount++
      }
    }

    toast.success(`${successCount} transações importadas com sucesso! ${errorCount > 0 ? `${errorCount} falharam.` : ''}`)
    setImporting(false)
    router.push('/transactions')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/transactions">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importar Transações</h1>
          <p className="text-gray-600">Importe transações de uma planilha Excel ou CSV</p>
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload do Arquivo</CardTitle>
          <CardDescription>
            Selecione um arquivo Excel (.xlsx, .xls) ou CSV com suas transações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                {file ? file.name : 'Clique para selecionar um arquivo'}
              </p>
              <p className="text-sm text-gray-500">
                Formatos suportados: .xlsx, .xls, .csv
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Column Mapping */}
      {importedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mapeamento de Colunas</CardTitle>
            <CardDescription>
              Mapeie as colunas do seu arquivo para os campos corretos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coluna de Data
                </label>
                <Select value={mapping.dateColumn} onValueChange={(value) => setMapping(prev => ({ ...prev, dateColumn: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(importedData[0] || {}).map((key) => (
                      <SelectItem key={key} value={key}>{key}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coluna de Descrição
                </label>
                <Select value={mapping.descriptionColumn} onValueChange={(value) => setMapping(prev => ({ ...prev, descriptionColumn: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(importedData[0] || {}).map((key) => (
                      <SelectItem key={key} value={key}>{key}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {importedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview dos Dados</CardTitle>
            <CardDescription>
              Revise os dados antes de importar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importedData.slice(0, 10).map((transaction, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {transaction.isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell>{transaction.date}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell>{transaction.category}</TableCell>
                      <TableCell>{transaction.type}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {importedData.length > 10 && (
              <p className="text-sm text-gray-500 mt-4">
                Mostrando 10 de {importedData.length} transações
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Button */}
      {importedData.length > 0 && (
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={() => {
            setFile(null)
            setImportedData([])
            setMapping({
              dateColumn: '',
              descriptionColumn: '',
              amountColumn: '',
              categoryColumn: '',
              cardColumn: '',
              typeColumn: '',
            })
          }}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={importing}>
            {importing ? 'Importando...' : `Importar ${importedData.length} transações`}
          </Button>
        </div>
      )}
    </div>
  )
}
