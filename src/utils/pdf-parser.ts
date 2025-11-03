/**
 * Utilitário para processar PDFs de faturas de cartão de crédito
 * Extrai transações (data, descrição, valor, parcelamento)
 */

import { extractTextFromPDFServer } from './pdf-parser-server'
import { parsePicPayBill } from './picpay-pdf-parser'

/**
 * Extrai texto de um arquivo PDF
 * Usa pdf-parse no servidor (Node.js) que é mais compatível
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Valida se o arquivo é válido
    if (!file || !(file instanceof File)) {
      throw new Error('Arquivo inválido fornecido')
    }

    // Valida tamanho do arquivo (limite de 10MB para PDFs)
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_SIZE) {
      throw new Error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Tamanho máximo permitido: 10MB`)
    }

    if (file.size === 0) {
      throw new Error('Arquivo vazio fornecido')
    }

    // Valida tipo MIME
    if (file.type && !file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('Arquivo não é um PDF válido')
    }

    // No servidor (Node.js), usa pdf-parse que é mais compatível
    if (typeof window === 'undefined') {
      // Converte File para ArrayBuffer e depois para Buffer
      let arrayBuffer: ArrayBuffer
      try {
        arrayBuffer = await file.arrayBuffer()
      } catch (error) {
        throw new Error(`Erro ao ler arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      }
      
      // Valida ArrayBuffer
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('ArrayBuffer vazio ou inválido')
      }

      // Cria Buffer a partir do ArrayBuffer usando método seguro
      // IMPORTANTE: Garante que é um Buffer válido do Node.js, não uma string ou caminho
      let buffer: Buffer
      try {
        // Método 1: Buffer.from com Uint8Array (mais seguro)
        const uint8Array = new Uint8Array(arrayBuffer)
        buffer = Buffer.from(uint8Array)
      } catch (bufferError) {
        try {
          // Método 2: Fallback direto (caso método 1 falhe)
          buffer = Buffer.from(arrayBuffer)
        } catch (fallbackError) {
          throw new Error(
            `Erro ao criar Buffer do arquivo. ` +
            `Método 1: ${bufferError instanceof Error ? bufferError.message : 'Erro desconhecido'}. ` +
            `Método 2: ${fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido'}`
          )
        }
      }
      
      // Validações críticas do Buffer
      if (!buffer) {
        throw new Error('Buffer é null ou undefined')
      }
      
      if (!Buffer.isBuffer(buffer)) {
        throw new Error(`Buffer não é uma instância válida de Buffer. Tipo: ${typeof buffer}`)
      }
      
      if (buffer.length === 0) {
        throw new Error('Buffer vazio')
      }

      // Valida que não é uma string disfarçada de Buffer (segurança extra)
      if (typeof buffer === 'string') {
        throw new Error('Buffer é uma string (erro na conversão)')
      }

      // Log para debug (remover em produção se necessário)
      console.log('[PDF Parser] Buffer criado com sucesso:', {
        bufferType: Buffer.isBuffer(buffer) ? 'Buffer válido' : 'Inválido',
        bufferLength: buffer.length,
        fileName: file.name,
        fileSize: file.size,
      })

      // Usa função auxiliar que usa require diretamente
      return await extractTextFromPDFServer(buffer)
    } else {
      // No cliente (browser), usa pdfjs-dist
      // Nota: Em produção, o processamento de PDF deve sempre acontecer no servidor
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
        
        const arrayBuffer = await file.arrayBuffer()
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
        const pdf = await loadingTask.promise

        let fullText = ''

        // Itera por todas as páginas
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum)
          const textContent = await page.getTextContent()
          
          // Extrai texto de cada item
          const pageText = textContent.items
            .map((item: any) => {
              if ('str' in item) {
                return item.str
              }
              return ''
            })
            .join(' ')
          
          fullText += pageText + '\n'
        }

        if (!fullText || fullText.trim().length === 0) {
          throw new Error('Nenhum texto encontrado no PDF')
        }

        return fullText
      } catch (clientError) {
        // Se falhar no cliente, sugere usar o servidor
        throw new Error(
          `Erro ao processar PDF no navegador. ` +
          `Por favor, tente novamente ou entre em contato com o suporte. ` +
          `Erro: ${clientError instanceof Error ? clientError.message : 'Erro desconhecido'}`
        )
      }
    }
  } catch (error) {
    // Evita encadear mensagens de erro
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
}

/**
 * Extrai transações de uma fatura de cartão de crédito
 * Procura por padrões comuns em faturas brasileiras
 * Usa parser otimizado para PicPay quando detectado, com fallback para parser genérico
 */
export function parseCreditCardBill(text: string): ExtractedTransaction[] {
  console.log('[PDF Parser] Iniciando parseCreditCardBill')
  console.log(`[PDF Parser] Tamanho do texto recebido: ${text.length} caracteres`)
  
  // Tenta primeiro com parser PicPay otimizado
  try {
    console.log('[PDF Parser] Tentando parser PicPay...')
    const picPayTransactions = parsePicPayBill(text)
    
    console.log(`[PDF Parser] Parser PicPay retornou: ${picPayTransactions?.length || 0} transações`)
    
    if (picPayTransactions && picPayTransactions.length > 0) {
      console.log(`[PDF Parser] ✅ Usando parser PicPay: ${picPayTransactions.length} transações encontradas`)
      return picPayTransactions
    } else {
      console.log('[PDF Parser] ⚠️ Parser PicPay não encontrou transações, tentando parser genérico...')
    }
  } catch (error) {
    // Se falhar, continua com parser genérico
    console.error('[PDF Parser] ❌ Erro no parser PicPay, usando parser genérico:', error)
    console.error('[PDF Parser] Stack:', error instanceof Error ? error.stack : 'N/A')
  }
  
  console.log('[PDF Parser] Usando parser genérico como fallback...')

  // Fallback para parser genérico (código original)
  const transactions: ExtractedTransaction[] = []

  // Normaliza o texto: remove múltiplos espaços e quebras de linha
  const normalizedText = text.replace(/\s+/g, ' ').trim()

  // Padrões para identificar transações em faturas de cartão
  // Padrão 1: Data DD/MM seguido de descrição e valor
  // Exemplo: "15/01 COMPRA PADRÃO 150,50"
  // Padrão 2: Data DD/MM/YYYY seguido de descrição e valor
  // Exemplo: "15/01/2025 SUPERMERCADO ABC R$ 150,50"
  
  // Regex para detectar linhas com data, descrição e valor
  // Procura por padrões como:
  // - DD/MM/YYYY ou DD/MM seguido de texto e R$ valor ou valor numérico
  const datePattern = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/
  const currencyPattern = /R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)|(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*R\$/
  
  // Divide o texto em linhas potencialmente relevantes
  const lines = text.split(/\n/).filter(line => line.trim().length > 0)

  let currentYear = new Date().getFullYear()

  // Procura pelo ano na fatura (geralmente no cabeçalho)
  const yearMatch = text.match(/\b(20\d{2})\b/)
  if (yearMatch) {
    currentYear = parseInt(yearMatch[1])
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Ignora linhas muito curtas ou que são claramente cabeçalhos
    if (line.length < 10) continue
    if (line.match(/^(FATURA|RESUMO|CARTÃO|VENCIMENTO|TOTAL|SALDO)/i)) continue
    
    // Procura por data no início da linha
    const dateMatch = line.match(datePattern)
    if (!dateMatch) continue

    let day = parseInt(dateMatch[1])
    let month = parseInt(dateMatch[2])
    let year = dateMatch[3] ? parseInt(dateMatch[3]) : currentYear

    // Ajusta para o ano correto (se a data está no futuro, provavelmente é do ano passado)
    const parsedDate = new Date(year, month - 1, day)
    if (parsedDate > new Date()) {
      year = year - 1
    }

    // Procura por valor monetário na linha
    // Padrões: R$ 1.500,50 ou 1500,50 ou 1.500,50 R$
    let amount: number | null = null
    let amountStr = ''

    // Primeiro tenta encontrar valores com R$
    const currencyWithSymbol = line.match(/R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i)
    if (currencyWithSymbol) {
      amountStr = currencyWithSymbol[1]
    } else {
      // Tenta encontrar valores monetários no formato brasileiro (com vírgula decimal)
      const monetaryValue = line.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{2}))/)
      if (monetaryValue) {
        // Pega o último valor encontrado (geralmente é o valor da transação)
        amountStr = monetaryValue[1]
      } else {
        // Fallback: procura por qualquer número com vírgula
        const numbersWithComma = line.match(/(\d+,\d{2})/)
        if (numbersWithComma) {
          amountStr = numbersWithComma[1]
        }
      }
    }

    if (amountStr) {
      // Converte formato brasileiro (1.500,50) para número
      amountStr = amountStr.replace(/\./g, '').replace(',', '.')
      amount = parseFloat(amountStr)
    }

    if (!amount || isNaN(amount) || amount <= 0) continue

    // Extrai a descrição (tudo entre a data e o valor)
    const dateEndIndex = dateMatch.index! + dateMatch[0].length
    let description = line.substring(dateEndIndex).trim()
    
    // Remove o valor da descrição
    if (amountStr) {
      // Procura pela string do valor na linha
      const valueIndex = line.lastIndexOf(amountStr.replace(/\./g, '').replace(',', '.'))
      if (valueIndex > dateEndIndex) {
        description = line.substring(dateEndIndex, valueIndex).trim()
      } else {
        // Tenta encontrar R$ seguido do valor
        const r$Index = line.indexOf('R$', dateEndIndex)
        if (r$Index > dateEndIndex) {
          description = line.substring(dateEndIndex, r$Index).trim()
        }
      }
    }

    // Remove prefixos comuns e limpa a descrição
    description = description
      .replace(/^(COMPRA|PAGAMENTO|DEBITO|CREDITO|TRANSFERENCIA|SAQUE)\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!description || description.length < 3) continue

    // Verifica se é parcelado
    // Procura por padrões como "01/10", "1 DE 10", "PARCELA 1/10", etc.
    let installments: { current: number; total: number } | null = null
    
    // Verifica na linha atual e nas próximas 2 linhas
    const searchText = [line, lines[i + 1] || '', lines[i + 2] || ''].join(' ')
    
    // Padrões de parcelamento
    const installmentPatterns = [
      /(\d{1,2})\s*\/\s*(\d{1,2})/g, // "01/10"
      /(\d{1,2})\s+DE\s+(\d{1,2})/gi, // "1 DE 10"
      /PARCELA\s+(\d{1,2})\s*\/\s*(\d{1,2})/gi, // "PARCELA 1/10"
      /(\d{1,2})X/gi, // "10X" (total de parcelas)
      /(\d{1,2})\s*X\s*DE\s*R\$/gi, // "10 X DE R$"
    ]

    for (const pattern of installmentPatterns) {
      const matches = [...searchText.matchAll(pattern)]
      for (const match of matches) {
        const current = parseInt(match[1])
        const total = parseInt(match[2] || match[1])
        
        if (current && total && total > 1 && current <= total) {
          installments = { current, total }
          break
        }
        
        // Caso especial: só tem o total (ex: "10X")
        if (total && total > 1 && !match[2]) {
          // Se encontrarmos "10X", provavelmente é a primeira parcela
          installments = { current: 1, total }
          break
        }
      }
      if (installments) break
    }

    // Formata a data para YYYY-MM-DD
    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    transactions.push({
      date: formattedDate,
      description,
      amount,
      installments,
    })
  }

  // Remove duplicatas (mesma data, descrição e valor)
  const uniqueTransactions = transactions.filter((trans, index, self) =>
    index === self.findIndex((t) =>
      t.date === trans.date &&
      t.description === trans.description &&
      Math.abs(t.amount - trans.amount) < 0.01
    )
  )

  return uniqueTransactions
}

