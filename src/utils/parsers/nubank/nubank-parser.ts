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

    const meses = BaseBankStatementParser.MESES_ABREV
    const vencimento = this.extrairMesAnoVencimento(text)
    console.log(`[${this.bankName} Parser] Vencimento referência: ${vencimento.mes}/${vencimento.ano}`)

    const linhas = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
    let ultimaDataValida: string | null = null
    let ultimaDescricaoValida: string | null = null

    console.log(`[${this.bankName} Parser] Processando ${linhas.length} linhas`)

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i]

      if (this.deveIgnorarLinha(linha)) {
        continue
      }

      const dataSomente = this.extrairDataSomenteDaLinha(linha, vencimento, meses)
      if (dataSomente && !this.linhaContemValorFinanceiro(linha)) {
        ultimaDataValida = dataSomente
        continue
      }

      let data: string | null = null
      let descricao = ''
      let valor: number | null = null
      let parcelamento: { current: number; total: number } | null = null
      let camada = ''

      const camadaCompleta = this.tentarCamadaLinhaCompleta(linha, vencimento, meses, linhas, i)
      if (camadaCompleta) {
        data = camadaCompleta.data
        descricao = camadaCompleta.descricao
        valor = camadaCompleta.valor
        parcelamento = camadaCompleta.parcelamento
        i += camadaCompleta.linhasAvancadas
        camada = camadaCompleta.origem
      } else if (this.linhaContemValorFinanceiro(linha) && ultimaDataValida) {
        const camadaValor = this.tentarCamadaSomenteValor(
          linha,
          ultimaDataValida,
          ultimaDescricaoValida
        )
        if (camadaValor) {
          data = camadaValor.data
          descricao = camadaValor.descricao
          valor = camadaValor.valor
          parcelamento = camadaValor.parcelamento
          camada = 'valor-herdado'
        }
      }

      if (!data || valor === null || isNaN(valor)) {
        continue
      }

      descricao = this.limparDescricaoNubank(descricao, parcelamento)
      if (descricao.length < 3 && ultimaDescricaoValida && ultimaDescricaoValida.length >= 3) {
        descricao = ultimaDescricaoValida
      }

      if (descricao.length < 2) {
        continue
      }

      ultimaDataValida = data
      ultimaDescricaoValida = descricao

      console.log(
        `[${this.bankName} Parser] ✅ ${camada}: ${data} - ${descricao.substring(0, 50)} - R$ ${Math.abs(valor).toFixed(2)}`
      )

      transactions.push({
        date: data,
        description: descricao,
        amount: Math.abs(valor),
        installments: parcelamento,
      })
    }

    const uniqueTransactions = this.removeDuplicates(transactions)
    console.log(`[${this.bankName} Parser] ✅ ${uniqueTransactions.length} transações extraídas`)
    return uniqueTransactions
  }

  private readonly padraoValorGuloso = /R\$\s?[\d.,]+/i

  private linhaContemValorFinanceiro(linha: string): boolean {
    return (
      this.padraoValorGuloso.test(linha) ||
      /(\d{1,3}(?:\.\d{3})*,\d{2})\s*R\$/i.test(linha)
    )
  }

  private extrairValorDaLinha(linha: string): { textoValor: string; indice: number } | null {
    const matchGuloso = linha.match(this.padraoValorGuloso)
    if (matchGuloso && matchGuloso.index !== undefined) {
      return { textoValor: matchGuloso[0], indice: matchGuloso.index }
    }

    const matchInvertido = linha.match(/(\d{1,3}(?:\.\d{3})*,\d{2})\s*R\$/i)
    if (matchInvertido && matchInvertido.index !== undefined) {
      return { textoValor: matchInvertido[0], indice: matchInvertido.index }
    }

    return null
  }

  private aplicarSinalValor(linha: string, valor: number): number {
    return /[-−]/.test(linha) ? -Math.abs(valor) : Math.abs(valor)
  }

  private limparDescricaoNubank(
    descricao: string,
    parcelamento: { current: number; total: number } | null
  ): string {
    let limpa = this.normalizeText(descricao)
    limpa = limpa.replace(/[-−\s]+$/, '').trim()

    if (parcelamento) {
      limpa = limpa.replace(/Parcela\s+\d+\s+de\s+\d+/gi, '').trim()
    }

    return limpa
  }

  private extrairDataSomenteDaLinha(
    linha: string,
    vencimento: { mes: number; ano: number },
    meses: Record<string, string>
  ): string | null {
    const match = linha.match(
      /^(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b\.?\s*$/i
    )
    if (!match) return null

    const dia = match[1].padStart(2, '0')
    const mes = meses[match[2].toLowerCase()] || '01'
    return this.buildNubankDate(dia, mes, vencimento)
  }

  private tentarCamadaSomenteValor(
    linha: string,
    ultimaDataValida: string,
    ultimaDescricaoValida: string | null
  ): {
    data: string
    descricao: string
    valor: number
    parcelamento: { current: number; total: number } | null
  } | null {
    const valorExtraido = this.extrairValorDaLinha(linha)
    if (!valorExtraido) return null

    const textoAntesValor = linha.substring(0, valorExtraido.indice).trim()
    const descricao =
      textoAntesValor.length >= 2
        ? textoAntesValor
        : (ultimaDescricaoValida ?? '').trim()

    if (!descricao) return null

    const valor = this.aplicarSinalValor(
      linha,
      this.parseMonetaryValue(valorExtraido.textoValor)
    )

    if (isNaN(valor) || valor === 0) return null

    return {
      data: ultimaDataValida,
      descricao,
      valor,
      parcelamento: this.extractInstallments(descricao),
    }
  }

  private tentarCamadaLinhaCompleta(
    linha: string,
    vencimento: { mes: number; ano: number },
    meses: Record<string, string>,
    linhas: string[],
    indice: number
  ): {
    data: string
    descricao: string
    valor: number
    parcelamento: { current: number; total: number } | null
    linhasAvancadas: number
    origem: string
  } | null {
    const padraoNubankCompleto =
      /^(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b\s+(.+?)\s+([-]?\s*R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})|[-]?\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*R\$)/i
    const padraoNubankDataCompleta =
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(.+?)\s+([-]?\s*R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})|[-]?\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*R\$)/i

    let linhasAvancadas = 0

    const matchCompleto = linha.match(padraoNubankCompleto)
    if (matchCompleto) {
      const dia = matchCompleto[1].padStart(2, '0')
      const mes = meses[matchCompleto[2].toLowerCase()] || '01'
      let descricao = matchCompleto[3].trim()
      const valorStr = matchCompleto[5] || matchCompleto[6]

      if (descricao.length < 3 && indice + 1 < linhas.length) {
        descricao = linhas[indice + 1].trim()
        linhasAvancadas = 1
      }

      const valor = this.aplicarSinalValor(linha, this.parseMonetaryValue(valorStr || '0'))
      if (isNaN(valor) || valor === 0) return null

      return {
        data: this.buildNubankDate(dia, mes, vencimento),
        descricao,
        valor,
        parcelamento: this.extractInstallments(descricao),
        linhasAvancadas,
        origem: 'DD MMM',
      }
    }

    const matchDataCompleta = linha.match(padraoNubankDataCompleta)
    if (matchDataCompleta) {
      const dia = matchDataCompleta[1].padStart(2, '0')
      const mes = matchDataCompleta[2].padStart(2, '0')
      const ano = matchDataCompleta[3]
      const descricao = matchDataCompleta[4].trim()
      const valorStr = matchDataCompleta[6] || matchDataCompleta[7]
      const valor = this.aplicarSinalValor(linha, this.parseMonetaryValue(valorStr || '0'))

      if (isNaN(valor) || valor === 0) return null

      return {
        data: this.toIsoDate(parseInt(ano, 10), mes, dia),
        descricao,
        valor,
        parcelamento: this.extractInstallments(descricao),
        linhasAvancadas: 0,
        origem: 'DD/MM/YYYY',
      }
    }

    const dataMatch = linha.match(/^(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b/i)
    if (dataMatch && indice + 1 < linhas.length) {
      const dia = dataMatch[1].padStart(2, '0')
      const mes = meses[dataMatch[2].toLowerCase()] || '01'
      const linhaSeguinte = linhas[indice + 1]
      const valorExtraido = this.extrairValorDaLinha(linhaSeguinte)

      if (valorExtraido) {
        const descricao = linhaSeguinte.substring(0, valorExtraido.indice).trim()
        const valor = this.aplicarSinalValor(
          linhaSeguinte,
          this.parseMonetaryValue(valorExtraido.textoValor)
        )

        if (!isNaN(valor) && valor !== 0 && descricao.length >= 2) {
          return {
            data: this.buildNubankDate(dia, mes, vencimento),
            descricao,
            valor,
            parcelamento: this.extractInstallments(descricao),
            linhasAvancadas: 1,
            origem: 'multi-linha',
          }
        }
      }
    }

    return null
  }

  /**
   * Monta YYYY-MM-DD aplicando ano incoerente quando mês da compra > mês de vencimento
   */
  private buildNubankDate(
    dia: string,
    mes: string,
    vencimento: { mes: number; ano: number }
  ): string {
    const txMonth = parseInt(mes, 10)
    const year = this.resolveTransactionYear(txMonth, vencimento.mes, vencimento.ano)
    return this.toIsoDate(year, mes, dia)
  }

  /**
   * Extrai mês/ano de vencimento da fatura para inferência de ano das transações
   */
  private extrairMesAnoVencimento(text: string): { mes: number; ano: number } {
    const meses = BaseBankStatementParser.MESES_ABREV

    const vencimentoSlash = text.match(/vencimento[:\s]*(\d{1,2})\/(\d{1,2})\/(\d{4})/i)
    if (vencimentoSlash) {
      return {
        mes: parseInt(vencimentoSlash[2], 10),
        ano: parseInt(vencimentoSlash[3], 10),
      }
    }

    const vencimentoExtenso = text.match(
      /vencimento[:\s]*(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.?\s+(\d{4})/i
    )
    if (vencimentoExtenso) {
      const mesStr = meses[vencimentoExtenso[2].toLowerCase()] || '01'
      return {
        mes: parseInt(mesStr, 10),
        ano: parseInt(vencimentoExtenso[3], 10),
      }
    }

    const faturaMatch = text.match(/FATURA\s+\d{1,2}\s+\w{3}\s+(\d{4})/i)
    const ano = faturaMatch ? parseInt(faturaMatch[1], 10) : new Date().getFullYear()
    const yearMatch = text.match(/\b(20\d{2})\b/)
    const anoFinal = yearMatch ? parseInt(yearMatch[1], 10) : ano

    return { mes: new Date().getMonth() + 1, ano: anoFinal }
  }

  /**
   * Verifica se a linha deve ser ignorada (cabeçalho/rodapé)
   */
  private deveIgnorarLinha(linha: string): boolean {
    if (this.linhaContemValorFinanceiro(linha)) {
      return false
    }

    const linhaLower = linha.toLowerCase()

    if (linhaLower.includes('fatura') && linhaLower.includes('nubank')) return true
    if (linhaLower.includes('resumo') && linhaLower.includes('fatura')) return true
    if (linhaLower.includes('data') && linhaLower.includes('descrição')) return true
    if (linhaLower.includes('vencimento')) return true
    if (linhaLower.includes('total')) return true
    if (/^pagamentos e financiamentos$/i.test(linhaLower)) return true

    if (linha.length < 5) return true

    return false
  }
}

