'use client'

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Upload, FileSpreadsheet, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { generateImportTemplate } from '@/utils/import-template'

interface ImportTransactionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportSuccess?: () => void
}

export function ImportTransactionsModal({
  open,
  onOpenChange,
  onImportSuccess,
}: ImportTransactionsModalProps) {
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDownloadTemplate = (format: 'csv' | 'xlsx') => {
    try {
      generateImportTemplate(format)
      toast.success(`Modelo ${format.toUpperCase()} baixado com sucesso!`)
    } catch (error) {
      console.error('Erro ao gerar modelo:', error)
      toast.error('Erro ao baixar modelo de importação')
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Valida extensão
    const fileName = file.name.toLowerCase()
    const isValidFormat = fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')
    
    if (!isValidFormat) {
      toast.error('Formato inválido. Use CSV ou XLSX.')
      return
    }

    setImporting(true)

    try {
      // Lê o arquivo
      const formData = new FormData()
      formData.append('file', file)

      // Chama API de importação
      const response = await fetch('/api/transactions/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao importar transações')
      }

      toast.success(`${data.count || 0} despesa(s) importada(s) com sucesso!`)
      
      // Limpa o input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      onImportSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao importar:', error)
      toast.error((error as Error).message || 'Erro ao importar arquivo')
    } finally {
      setImporting(false)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Despesas</DialogTitle>
          <DialogDescription>
            Importe múltiplas despesas de uma vez usando uma planilha CSV ou XLSX
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Opção 1: Baixar Modelo */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Download className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Modelo de Importação</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Baixe um modelo para preencher com suas despesas
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadTemplate('xlsx')}
                    className="flex items-center gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Baixar Modelo XLSX
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadTemplate('csv')}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Baixar Modelo CSV
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Opção 2: Importar Arquivo */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Upload className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Importar Despesas</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Selecione um arquivo CSV ou XLSX preenchido com suas despesas
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  onClick={handleImportClick}
                  disabled={importing}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {importing ? 'Importando...' : 'Selecionar Arquivo'}
                </Button>
              </div>
            </div>
          </div>

          {/* Instruções */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm">Instruções:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Baixe o modelo e preencha com suas despesas</li>
              <li>Mantenha o formato original (não altere as colunas)</li>
              <li>Data no formato: AAAA-MM-DD (ex: 2025-01-15)</li>
              <li>Valor em número decimal (ex: 150.50)</li>
              <li>Método de pagamento: credit, debit, cash, pix ou boleto</li>
              <li>As linhas com dados inválidos serão ignoradas</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


