'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTransactionsStore } from '@/lib/stores/transactions-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function ImportTransactionsPage() {
  const router = useRouter()
  const { addTransaction } = useTransactionsStore()
  const [loading, setLoading] = useState(false)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)

    try {
      const text = await file.text()
      const lines = text.split('\n')
      let successCount = 0
      let errorCount = 0

      // Processar cada linha do CSV
      for (let i = 1; i < lines.length; i++) { // Pular cabeçalho
        const line = lines[i].trim()
        if (!line) continue

        const [description, amount, type, category_id, transaction_date] = line.split(',')

        const transactionData = {
          description: description || '',
          amount: parseFloat(amount) || 0,
          type: (type || 'expense') as 'income' | 'expense',
          category_id: category_id || '',
          transaction_date: transaction_date || new Date().toISOString().split('T')[0],
        }

        if (transactionData.description && transactionData.amount > 0) {
          try {
            await addTransaction(transactionData)
            successCount++
          } catch (error) {
            errorCount++
          }
        } else {
          errorCount++
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} transações importadas com sucesso!`)
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} transações falharam ao importar`)
      }

      if (successCount > 0) {
        router.push('/transactions')
      }
    } catch (error) {
      toast.error('Erro ao processar arquivo: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Importar Transações</CardTitle>
            <CardDescription>
              Faça upload de um arquivo CSV para importar transações em massa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={loading}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer block"
                >
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="text-lg font-medium">
                      {loading ? 'Processando...' : 'Clique para fazer upload do CSV'}
                    </div>
                    <Button variant="outline" disabled={loading}>
                      Selecionar Arquivo
                    </Button>
                  </div>
                </label>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-medium mb-2">Formato do CSV esperado:</h3>
                <pre className="text-sm">
                  {`descrição,valor,tipo,category_id,data
Aluguel,1500.00,expense,category_uuid,2024-01-15
Salário,3000.00,income,category_uuid,2024-01-10
...`}
                </pre>
                <p className="text-sm text-muted-foreground mt-2">
                  A primeira linha deve conter o cabeçalho. Use "income" para receitas e "expense" para despesas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}