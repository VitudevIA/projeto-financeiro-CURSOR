'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Download, Upload, FileSpreadsheet, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { generateImportTemplate } from '@/utils/import-template'
import { useCardsStore } from '@/lib/stores/cards-store'

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
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'debit' | 'cash' | 'pix' | 'boleto' | ''>('')
  const [cardId, setCardId] = useState<string>('')
  const [validationErrors, setValidationErrors] = useState<{
    paymentMethod?: string
    cardId?: string
  }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { cards, fetchCards } = useCardsStore()

  // Carrega cartões quando o modal abre
  useEffect(() => {
    if (open) {
      fetchCards()
    }
  }, [open, fetchCards])

  // Filtra cartões baseado no método de pagamento selecionado
  const filteredCards = paymentMethod === 'credit' || paymentMethod === 'debit'
    ? cards.filter(card => card.type === paymentMethod && card.is_active)
    : []

  const handleDownloadTemplate = (format: 'csv' | 'xlsx') => {
    try {
      generateImportTemplate(format)
      toast.success(`Modelo ${format.toUpperCase()} baixado com sucesso!`)
    } catch (error) {
      console.error('Erro ao gerar modelo:', error)
      toast.error('Erro ao baixar modelo de importação')
    }
  }

  // Valida campos antes de importar
  const validateFields = (): boolean => {
    const errors: { paymentMethod?: string; cardId?: string } = {}

    if (!paymentMethod) {
      errors.paymentMethod = 'Método de pagamento é obrigatório'
    }

    if ((paymentMethod === 'credit' || paymentMethod === 'debit') && !cardId) {
      errors.cardId = 'Selecione um cartão para pagamentos com cartão'
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return false
    }

    setValidationErrors({})
    return true
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Valida campos obrigatórios antes de processar
    if (!validateFields()) {
      toast.error('Preencha todos os campos obrigatórios antes de importar')
      // Limpa o input para permitir nova tentativa
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Valida extensão
    const fileName = file.name.toLowerCase()
    const isValidFormat = 
      fileName.endsWith('.csv') || 
      fileName.endsWith('.xlsx') || 
      fileName.endsWith('.xls') ||
      fileName.endsWith('.pdf')
    
    if (!isValidFormat) {
      toast.error('Formato inválido. Use CSV, XLSX ou PDF (fatura de cartão).')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setImporting(true)

    try {
      // Lê o arquivo e adiciona dados de pagamento
      const formData = new FormData()
      formData.append('file', file)
      formData.append('paymentMethod', paymentMethod)
      if (cardId) {
        formData.append('cardId', cardId)
      }

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
      
      // Limpa campos e input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setPaymentMethod('')
      setCardId('')
      setValidationErrors({})

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
    // Valida antes de abrir o seletor de arquivo
    if (!validateFields()) {
      toast.error('Selecione o método de pagamento antes de escolher o arquivo')
      return
    }
    fileInputRef.current?.click()
  }

  const handlePaymentMethodChange = (value: 'credit' | 'debit' | 'cash' | 'pix' | 'boleto') => {
    setPaymentMethod(value)
    // Limpa cartão se mudar para método que não precisa
    if (value !== 'credit' && value !== 'debit') {
      setCardId('')
    } else {
      // Se mudou para crédito/débito, valida se o cartão atual ainda é válido
      const currentCard = cards.find(c => c.id === cardId)
      if (currentCard && currentCard.type !== value) {
        setCardId('')
      }
    }
    // Limpa erro de validação
    setValidationErrors(prev => ({ ...prev, paymentMethod: undefined, cardId: undefined }))
  }

  const handleCardChange = (value: string) => {
    setCardId(value)
    // Limpa erro de validação
    setValidationErrors(prev => ({ ...prev, cardId: undefined }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Despesas</DialogTitle>
          <DialogDescription>
            Importe múltiplas despesas de uma vez usando uma planilha CSV ou XLSX, 
            ou importe diretamente uma fatura de cartão de crédito em PDF.
            O modelo inclui suporte para transações parceladas.
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
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="font-semibold mb-1">Importar Despesas</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Selecione um arquivo CSV, XLSX ou PDF (fatura de cartão). 
                    Para PDFs, as transações serão extraídas automaticamente com categorias e parcelamento.
                  </p>
                </div>

                {/* Método de Pagamento - OBRIGATÓRIO */}
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod" className="text-sm font-medium">
                    Método de Pagamento <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={handlePaymentMethodChange}
                  >
                    <SelectTrigger 
                      id="paymentMethod"
                      className={validationErrors.paymentMethod ? 'border-destructive' : ''}
                    >
                      <SelectValue placeholder="Selecione o método de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Crédito</SelectItem>
                      <SelectItem value="debit">Débito</SelectItem>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.paymentMethod && (
                    <p className="text-sm text-destructive">{validationErrors.paymentMethod}</p>
                  )}
                </div>

                {/* Cartão - OBRIGATÓRIO para Crédito/Débito */}
                {(paymentMethod === 'credit' || paymentMethod === 'debit') && (
                  <div className="space-y-2">
                    <Label htmlFor="cardId" className="text-sm font-medium">
                      Cartão <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={cardId}
                      onValueChange={handleCardChange}
                    >
                      <SelectTrigger 
                        id="cardId"
                        className={validationErrors.cardId ? 'border-destructive' : ''}
                      >
                        <SelectValue placeholder={`Selecione um cartão de ${paymentMethod === 'credit' ? 'crédito' : 'débito'}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCards.length > 0 ? (
                          filteredCards.map((card) => (
                            <SelectItem key={card.id} value={card.id}>
                              {card.name} {card.last_digits ? `(${card.last_digits})` : ''}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-cards" disabled>
                            Nenhum cartão {paymentMethod === 'credit' ? 'de crédito' : 'de débito'} cadastrado
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {validationErrors.cardId && (
                      <p className="text-sm text-destructive">{validationErrors.cardId}</p>
                    )}
                    {filteredCards.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Cadastre um cartão {paymentMethod === 'credit' ? 'de crédito' : 'de débito'} nas configurações primeiro.
                      </p>
                    )}
                  </div>
                )}

                {/* Input de arquivo */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  onClick={handleImportClick}
                  disabled={importing || !paymentMethod || (filteredCards.length === 0 && (paymentMethod === 'credit' || paymentMethod === 'debit'))}
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
              <li><strong>CSV/XLSX:</strong> Baixe o modelo e preencha com suas despesas</li>
              <li><strong>CSV/XLSX:</strong> Mantenha o formato original (não altere as colunas)</li>
              <li><strong>CSV/XLSX:</strong> Data no formato: AAAA-MM-DD (ex: 2025-01-15)</li>
              <li><strong>CSV/XLSX:</strong> Valor em número decimal (ex: 150.50)</li>
              <li><strong>CSV/XLSX:</strong> Método de pagamento: credit, debit, cash, pix ou boleto</li>
              <li><strong>PDF:</strong> Envie a fatura do seu cartão de crédito em PDF</li>
              <li><strong>PDF:</strong> As transações serão extraídas automaticamente</li>
              <li><strong>PDF:</strong> Categorias e parcelamento serão reconhecidos automaticamente</li>
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


