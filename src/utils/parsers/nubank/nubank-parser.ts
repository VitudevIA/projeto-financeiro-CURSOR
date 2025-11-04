/**
 * Parser para faturas do Nubank
 * Formato: "DD MMM DESCRIÇÃO VALOR" ou "DD/MM/YYYY DESCRIÇÃO VALOR"
 */

import { BaseBankStatementParser, ExtractedTransaction } from '../base-parser-interface'

export class NubankParser extends BaseBankStatementParser {
  readonly bankId = 'nubank'
  readonly bankName = 'Nubank'

  private readonly indicators = [
    'nubank',
    'nupay',
    'aplicativo do nu',
    'fatura nubank',
  ]

  canParse(text: string): boolean {
    if (!text || text.trim().length === 0) {
      return false
    }
    
    const textLower = text.toLowerCase()
    
    // Verifica indicadores do Nubank
    const hasNubankIndicators = 
      textLower.includes('nubank') ||
      textLower.includes('nupay') ||
      textLower.includes('aplicativo do nu')
    
    // Exclui outros bancos
    const isNotOtherBanks = 
      !textLower.includes('picpay') &&
      !textLower.includes('cartão inter') &&
      !textLower.includes('banco inter') &&
      !textLower.includes('willbank')
    
    const result = hasNubankIndicators && isNotOtherBanks
    
    console.log(`[${this.bankName} Parser] canParse:`, {
      hasNubankIndicators,
      isNotOtherBanks,
      result,
    })
    
    return result
  }

  parse(text: string): ExtractedTransaction[] {
    console.log(`[${this.bankName} Parser] Iniciando parse...`)
    const transactions: ExtractedTransaction[] = []
    
    if (!text || text.trim().length === 0) {
      console.log(`[${this.bankName} Parser] Texto vazio`)
      return transactions
    }

    // Mapeamento de meses abreviados
    const meses: { [key: string]: string } = {
      'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06',
      'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12',
    }

    // Extrai ano da fatura
    let currentYear = new Date().getFullYear()
    const yearMatch = text.match(/FATURA\s+\d{1,2}\s+\w{3}\s+(\d{4})/i) || text.match(/\b(20\d{2})\b/)
    if (yearMatch) {
      currentYear = parseInt(yearMatch[1])
    }

    // Divide o texto em linhas
    const linhas = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    
    console.log(`[${this.bankName} Parser] Processando ${linhas.length} linhas`)

    // Padrão 1: "DD MMM DESCRIÇÃO VALOR" (formato mais comum do Nubank)
    const padraoNubankCompleto = /^(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s+(.+?)\s+([-]?\s*R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})|[-]?\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*R\$)/i
    
    // Padrão 2: "DD/MM/YYYY DESCRIÇÃO VALOR"
    const padraoNubankDataCompleta = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(.+?)\s+([-]?\s*R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})|[-]?\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*R\$)/i

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i]
      
      // Ignora cabeçalhos e rodapés
      if (this.deveIgnorarLinha(linha)) {
        continue
      }

      let match: RegExpMatchArray | null = null
      let data: string | null = null
      let descricao: string = ''
      let valor: number | null = null
      let parcelamento: { current: number; total: number } | null = null

      // Tenta padrão 1: DD MMM
      match = linha.match(padraoNubankCompleto)
      if (match) {
        const dia = match[1].padStart(2, '0')
        const mesAbr = match[2].toLowerCase()
        const mes = meses[mesAbr] || '01'
        descricao = match[3].trim()
        const valorStr = match[5] || match[6]
        const sinal = linha.includes('-') ? '-' : '+'

        // Verifica se a descrição está na linha seguinte
        if (descricao.length < 3 && i + 1 < linhas.length) {
          descricao = linhas[i + 1].trim()
          i++ // Pula a linha seguinte
        }

        data = `${currentYear}-${mes}-${dia}`

        // Extrai parcelamento
        parcelamento = this.extractInstallments(descricao)

        valor = this.parseMonetaryValue(valorStr || '0')
        if (sinal === '-') {
          valor = -Math.abs(valor)
        } else {
          valor = Math.abs(valor)
        }

        console.log(`[${this.bankName} Parser] ✅ Match formato DD MMM: ${data} - ${descricao.substring(0, 50)}`)
      } else {
        // Tenta padrão 2: DD/MM/YYYY
        match = linha.match(padraoNubankDataCompleta)
        if (match) {
          const dia = match[1].padStart(2, '0')
          const mes = match[2].padStart(2, '0')
          const ano = match[3]
          descricao = match[4].trim()
          const valorStr = match[6] || match[7]
          const sinal = linha.includes('-') ? '-' : '+'

          data = `${ano}-${mes}-${dia}`

          // Extrai parcelamento
          parcelamento = this.extractInstallments(descricao)

          valor = this.parseMonetaryValue(valorStr || '0')
          if (sinal === '-') {
            valor = -Math.abs(valor)
          } else {
            valor = Math.abs(valor)
          }

          console.log(`[${this.bankName} Parser] ✅ Match formato DD/MM/YYYY: ${data} - ${descricao.substring(0, 50)}`)
        }
      }

      // Fallback: tenta encontrar data e valor em linhas separadas
      if (!data && !valor) {
        const dataMatch = linha.match(/^(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i)
        if (dataMatch && i + 1 < linhas.length) {
          const dia = dataMatch[1].padStart(2, '0')
          const mesAbr = dataMatch[2].toLowerCase()
          const mes = meses[mesAbr] || '01'
          const linhaSeguinte = linhas[i + 1]
          
          // Procura descrição e valor na linha seguinte
          const valorMatch = linhaSeguinte.match(/([-]?\s*R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})|[-]?\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*R\$)/i)
          if (valorMatch) {
            descricao = linhaSeguinte.replace(valorMatch[0], '').trim()
            const valorStr = valorMatch[2] || valorMatch[3]
            const sinal = linhaSeguinte.includes('-') ? '-' : '+'

            data = `${currentYear}-${mes}-${dia}`
            parcelamento = this.extractInstallments(descricao)
            valor = this.parseMonetaryValue(valorStr || '0')
            
            if (sinal === '-') {
              valor = -Math.abs(valor)
            } else {
              valor = Math.abs(valor)
            }

            i++ // Pula a linha seguinte
            console.log(`[${this.bankName} Parser] ✅ Match formato multi-linha: ${data} - ${descricao.substring(0, 50)}`)
          }
        }
      }

      if (data && valor !== null && !isNaN(valor) && descricao.length > 2) {
        // Limpa descrição
        descricao = this.normalizeText(descricao)
        
        // Remove informações de parcelamento da descrição base
        if (parcelamento) {
          descricao = descricao.replace(/Parcela\s+\d+\s+de\s+\d+/gi, '').trim()
        }

        // Ignora linhas que são apenas nomes (sem descrição válida)
        if (descricao.length < 3 || /^[A-ZÁÉÍÓÚÇ\s]+$/.test(descricao)) {
          continue
        }

        transactions.push({
          date: data,
          description: descricao,
          amount: Math.abs(valor), // Sempre positivo (despesas)
          installments: parcelamento,
        })
      }
    }

    const uniqueTransactions = this.removeDuplicates(transactions)
    console.log(`[${this.bankName} Parser] ✅ ${uniqueTransactions.length} transações extraídas`)
    return uniqueTransactions
  }

  /**
   * Verifica se a linha deve ser ignorada (cabeçalho/rodapé)
   */
  private deveIgnorarLinha(linha: string): boolean {
    const linhaLower = linha.toLowerCase()
    
    // Ignora cabeçalhos
    if (linhaLower.includes('fatura') && linhaLower.includes('nubank')) return true
    if (linhaLower.includes('resumo') && linhaLower.includes('fatura')) return true
    if (linhaLower.includes('data') && linhaLower.includes('descrição')) return true
    if (linhaLower.includes('vencimento')) return true
    if (linhaLower.includes('total')) return true
    
    // Ignora linhas muito curtas
    if (linha.length < 5) return true
    
    // Ignora linhas que são apenas nomes (sem números ou descrições)
    if (/^[A-ZÁÉÍÓÚÇ\s]+$/.test(linha) && linha.length < 20) return true

    return false
  }
}

