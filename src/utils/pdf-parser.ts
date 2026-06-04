/**
 * Utilitário para processar PDFs de faturas de cartão de crédito
 * Extrai transações (data, descrição, valor, parcelamento)
 */

import { extractTextFromPDFServer } from './pdf-parser-server'
import { BankStatementParserFactory } from './parsers/parser-factory'
import { preprocessPicPayBillText } from './parsers/picpay/picpay-parser'

export { preprocessPicPayBillText } from './parsers/picpay/picpay-parser'

/**
 * Extrai texto de um arquivo PDF
 * Usa pdf-parse no servidor (Node.js) que é mais compatível
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    if (!file || !(file instanceof File)) {
      throw new Error('Arquivo inválido fornecido')
    }

    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_SIZE) {
      throw new Error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Tamanho máximo permitido: 10MB`)
    }

    if (file.size === 0) {
      throw new Error('Arquivo vazio fornecido')
    }

    if (file.type && !file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('Arquivo não é um PDF válido')
    }

    if (typeof window === 'undefined') {
      let arrayBuffer: ArrayBuffer
      try {
        arrayBuffer = await file.arrayBuffer()
      } catch (error) {
        throw new Error(`Erro ao ler arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      }
      
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('ArrayBuffer vazio ou inválido')
      }

      let buffer: Buffer
      try {
        const uint8Array = new Uint8Array(arrayBuffer)
        buffer = Buffer.from(uint8Array)
      } catch (bufferError) {
        try {
          buffer = Buffer.from(arrayBuffer)
        } catch (fallbackError) {
          throw new Error(
            `Erro ao criar Buffer do arquivo. ` +
            `Método 1: ${bufferError instanceof Error ? bufferError.message : 'Erro desconhecido'}. ` +
            `Método 2: ${fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido'}`
          )
        }
      }
      
      if (!buffer) {
        throw new Error('Buffer é null ou undefined')
      }
      
      if (!Buffer.isBuffer(buffer)) {
        throw new Error(`Buffer não é uma instância válida de Buffer. Tipo: ${typeof buffer}`)
      }
      
      if (buffer.length === 0) {
        throw new Error('Buffer vazio')
      }

      if (typeof buffer === 'string') {
        throw new Error('Buffer é uma string (erro na conversão)')
      }

      console.log('[PDF Parser] Buffer criado com sucesso:', {
        bufferType: Buffer.isBuffer(buffer) ? 'Buffer válido' : 'Inválido',
        bufferLength: buffer.length,
        fileName: file.name,
        fileSize: file.size,
      })

      return await extractTextFromPDFServer(buffer)
    } else {
      throw new Error(
        'Processamento de PDF no cliente não é suportado. ' +
        'O processamento deve ser feito no servidor através da API route. ' +
        'Certifique-se de que o arquivo está sendo enviado para /api/transactions/import'
      )
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    if (errorMessage.includes('Erro ao processar PDF:')) {
      throw error
    }
    console.error('Erro ao extrair texto do PDF:', errorMessage)
    throw new Error(`Erro ao processar PDF: ${errorMessage}`)
  }
}

/**
 * Interface para uma transação extraída da fatura
 */
export interface ExtractedTransaction {
  date: string
  description: string
  amount: number
  installments?: {
    current: number
    total: number
  } | null
  /** Posição sequencial na fatura (0 = primeira linha lida de cima para baixo) */
  sequence_number?: number
}

/**
 * Extrai transações de uma fatura de cartão de crédito
 */
export function parseCreditCardBill(text: string): ExtractedTransaction[] {
  console.log('[PDF Parser] Iniciando parseCreditCardBill Multi-Linha Avançado')
  console.log(`[PDF Parser] Tamanho do texto bruto recebido: ${text.length} caracteres`)

  const isPicPay = text.toLowerCase().includes('picpay') || text.toLowerCase().includes('picpay card')
  const preparedText = isPicPay ? preprocessPicPayBillText(text) : text
  
  if (isPicPay) {
    console.log(`[PDF Parser] Detectado PicPay. Tamanho após pré-processamento: ${preparedText.length} caracteres`)
  }
  
  // Tenta parser específico da Factory primeiro
  try {
    const transactions = BankStatementParserFactory.parse(preparedText)
    
    if (transactions && Array.isArray(transactions) && transactions.length > 0) {
      console.log(`[PDF Parser] ✅ SUCESSO: ${transactions.length} transações extraídas via Parser Específico.`);
      return transactions.map((t, i) => ({ ...t, sequence_number: t.sequence_number ?? i }))
    }
    console.log('[PDF Parser] ⚠️ Alerta: Parser específico retornou 0 transações. Acionando analisador adaptativo secundário...');
  } catch (error) {
    console.error('[PDF Parser] ❌ Falha no parser específico, executando fallback adaptativo:', error)
  }
  
  console.log('[PDF Parser] Executando Engine Adaptativa Multi-Linha...')

  const transactions: ExtractedTransaction[] = []
  
  // Captura o ano de referência
  let currentYear = new Date().getFullYear()
  const yearMatch = text.match(/\b(20\d{2})\b/)
  if (yearMatch) {
    currentYear = parseInt(yearMatch[1])
  }

  // Divisão flexível de linhas limpas
  const lines = preparedText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0)
  
  // Padrões de Data estruturados
  const dateOnlyPattern = /^(\d{1,2})\/(\d{1,2})$/ // Exato "DD/MM" sem nada do lado
  const generalDatePattern = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/
  const amountPattern = /^-?(\d{1,3}(?:\.\d{3})*(?:,\d{2}))$/ // Exato "11,50" ou "-13,00"

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // -----------------------------------------------------------------------------------------
    // INTEGRAÇÃO CASO CRÍTICO: Trata escada de dados (Linha 1: Data \n Linha 2: Descrição \n Linha 3: Valor)
    // -----------------------------------------------------------------------------------------
    if (dateOnlyPattern.test(line)) {
      const dateMatch = line.match(dateOnlyPattern)!
      const nextLine1 = lines[i + 1] ? lines[i + 1].trim() : ''
      const nextLine2 = lines[i + 2] ? lines[i + 2].trim() : ''

      // Validação: Se a linha +1 não for um valor, mas a linha +2 for um valor monetário puro
      if (nextLine1 && nextLine2 && !amountPattern.test(nextLine1) && amountPattern.test(nextLine2)) {
        const day = parseInt(dateMatch[1])
        const month = parseInt(dateMatch[2])
        
        const amountStr = nextLine2.match(amountPattern)![1].replace(/\./g, '').replace(',', '.')
        let amount = parseFloat(amountStr)
        if (amount < 0) amount = Math.abs(amount)

        if (amount && !isNaN(amount) && amount > 0) {
          const formattedDate = `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          
          // Captura parcelamento na própria linha de descrição se houver (Ex: "FUTURA PARC (1/6)")
          let installments: { current: number; total: number } | null = null
          const installmentPatterns = [/(\d{1,2})\s*\/\s*(\d{1,2})/, /(\d{1,2})\s+DE\s+(\d{1,2})/i]
          for (const pattern of installmentPatterns) {
            const match = nextLine1.match(pattern)
            if (match) {
              const current = parseInt(match[1])
              const total = parseInt(match[2])
              if (current && total && total > 1 && current <= total) {
                installments = { current, total }
                break
              }
            }
          }

          transactions.push({
            date: formattedDate,
            description: nextLine1.replace(/[|\\/]/g, '').trim(),
            amount,
            installments,
          })

          i += 2 // Avança o ponteiro do loop para pular a descrição e o valor processados
          continue
        }
      }
    }

    // -----------------------------------------------------------------------------------------
    // CASO TRADICIONAL: Tudo na mesma linha (DD/MM Descrição Valor)
    // -----------------------------------------------------------------------------------------
    const dateMatch = line.match(generalDatePattern)
    if (!dateMatch) continue

    // Bloqueia leituras falsas de cabeçalhos institucionais com data
    if (line.match(/(vencimento|fechamento|emitido em|pagar até|fatura de|total da fatura)/i) && !line.match(/R\$/i)) {
      continue 
    }
    if (line.toLowerCase().includes('fatura anterior') || line.toLowerCase().includes('pagamento recebido')) continue

    let day = parseInt(dateMatch[1])
    let month = parseInt(dateMatch[2])
    let year = dateMatch[3] ? parseInt(dateMatch[3]) : currentYear

    const parsedDate = new Date(year, month - 1, day)
    if (parsedDate > new Date()) {
      year = year - 1
    }

    let amount: number | null = null
    let amountStr = ''

    const monetaryValue = line.match(/(?:R\$\s*)?(-?\d{1,3}(?:\.\d{3})*(?:,\d{2}))/)
    if (monetaryValue) {
      amountStr = monetaryValue[1]
    } else {
      const numbersWithComma = line.match(/(-?\d+,\d{2})/)
      if (numbersWithComma) {
        amountStr = numbersWithComma[1]
      }
    }

    if (amountStr) {
      const cleanedAmountStr = amountStr.replace(/\./g, '').replace(',', '.')
      amount = parseFloat(cleanedAmountStr)
      if (amount < 0) amount = Math.abs(amount)
    }

    if (!amount || isNaN(amount) || amount <= 0) continue

    const dateEndIndex = dateMatch.index! + dateMatch[0].length
    let description = line.substring(dateEndIndex).trim()
    
    if (amountStr) {
      description = description.replace(amountStr, '').replace('R$', '').trim()
    }
    
    description = description
      .replace(/[|\\/]/g, '')
      .replace(/^(COMPRA|PAGAMENTO|DEBITO|CREDITO|TRANSFERENCIA|SAQUE)\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!description || description.length < 2) continue

    let installments: { current: number; total: number } | null = null
    const searchText = [line, lines[i + 1] || '', lines[i + 2] || ''].join(' ')
    
    const installmentPatterns = [
      /(\d{1,2})\s*\/\s*(\d{1,2})/,
      /(\d{1,2})\s+DE\s+(\d{1,2})/i,
      /PARCELA\s+(\d{1,2})\s*\/\s*(\d{1,2})/i,
      /(\d{1,2})X/i
    ]

    for (const pattern of installmentPatterns) {
      const match = searchText.match(pattern)
      if (match) {
        const current = parseInt(match[1])
        const total = parseInt(match[2] || match[1])
        if (current && total && total > 1 && current <= total) {
          installments = { current, total }
          break
        }
      }
    }

    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    transactions.push({
      date: formattedDate,
      description,
      amount,
      installments,
    })
  }

  // Consolidação final eliminando duplicatas exatas geradas por resquícios do parser
  const uniqueTransactions = transactions.filter((trans, index, self) =>
    index === self.findIndex((t) =>
      t.date === trans.date &&
      t.description === trans.description &&
      Math.abs(t.amount - trans.amount) < 0.01
    )
  )

  console.log(`[PDF Parser] Processamento Finalizado. ${uniqueTransactions.length} registros prontos para inserção.`);
  return uniqueTransactions.map((t, i) => ({ ...t, sequence_number: i }))
}