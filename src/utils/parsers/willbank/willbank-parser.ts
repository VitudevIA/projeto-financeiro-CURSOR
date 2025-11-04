/**
 * Parser para faturas do WillBank
 * Formato: "DD/MM/YYYY DESCRIÇÃO VALOR" ou "DD/MM DESCRIÇÃO VALOR"
 * Transações aparecem após "Lançamentos de [mês]" > "Gastos"
 */

import { BaseBankStatementParser, ExtractedTransaction } from '../base-parser-interface'

export class WillBankParser extends BaseBankStatementParser {
  readonly bankId = 'willbank'
  readonly bankName = 'WillBank'

  private readonly indicators = [
    'willbank',
    'will financeira',
    'lançamentos de',
    'gastos',
  ]

  canParse(text: string): boolean {
    if (!text || text.trim().length === 0) {
      return false
    }
    
    const textLower = text.toLowerCase()
    
    // Verifica indicadores do WillBank
    const hasWillBankIndicators = 
      textLower.includes('willbank') ||
      textLower.includes('will financeira') ||
      (textLower.includes('lançamentos de') && textLower.includes('gastos'))
    
    // Exclui outros bancos
    const isNotOtherBanks = 
      !textLower.includes('picpay') &&
      !textLower.includes('nubank') &&
      !textLower.includes('cartão inter') &&
      !textLower.includes('banco inter')
    
    const result = hasWillBankIndicators && isNotOtherBanks
    
    console.log(`[${this.bankName} Parser] canParse:`, {
      hasWillBankIndicators,
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

    // Extrai mês/ano da fatura vigente
    const mesAnoFatura = this.extrairMesAnoFaturaVigente(text)
    console.log(`[${this.bankName} Parser] Mês/ano da fatura: ${mesAnoFatura.mes}/${mesAnoFatura.ano}`)

    // Divide o texto em linhas
    const linhas = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    
    // Procura pela seção "Lançamentos de [mês]" > "Gastos"
    let indiceInicio = -1
    let encontrouLancamentos = false
    let encontrouGastos = false
    
    for (let i = 0; i < linhas.length; i++) {
      const linhaLower = linhas[i].toLowerCase()
      
      // Procura por "Lançamentos de [mês]"
      if (linhaLower.includes('lançamentos de') && !encontrouLancamentos) {
        encontrouLancamentos = true
        console.log(`[${this.bankName} Parser] Seção "Lançamentos de [mês]" encontrada na linha ${i}`)
        continue
      }
      
      // Após encontrar "Lançamentos", procura por "Gastos"
      if (encontrouLancamentos && linhaLower.includes('gastos') && !encontrouGastos) {
        encontrouGastos = true
        // Procura pela primeira linha com data após "Gastos"
        for (let j = i + 1; j < Math.min(i + 10, linhas.length); j++) {
          if (/\d{2}\/\d{2}(\/\d{4})?/.test(linhas[j])) {
            indiceInicio = j
            console.log(`[${this.bankName} Parser] Seção "Gastos" encontrada na linha ${i}, primeira transação na linha ${indiceInicio}`)
            break
          }
        }
        if (indiceInicio !== -1) break
      }
    }

    // Se não encontrou, procura por "Fechamento da fatura"
    if (indiceInicio === -1) {
      for (let i = 0; i < linhas.length; i++) {
        if (linhas[i].toLowerCase().includes('fechamento da fatura')) {
          // Procura pela primeira transação após o fechamento
          for (let j = i + 1; j < Math.min(i + 20, linhas.length); j++) {
            if (/\d{2}\/\d{2}(\/\d{4})?/.test(linhas[j])) {
              indiceInicio = j
              console.log(`[${this.bankName} Parser] Usando fallback: início na linha ${j} (após fechamento na linha ${i})`)
              break
            }
          }
          if (indiceInicio !== -1) break
        }
      }
    }

    // Se ainda não encontrou, usa todas as linhas
    if (indiceInicio === -1) {
      indiceInicio = 0
      console.log(`[${this.bankName} Parser] Usando todas as linhas`)
    }

    // Processa linhas a partir do índice encontrado
    const linhasProcessar = linhas.slice(indiceInicio)
    console.log(`[${this.bankName} Parser] Processando ${linhasProcessar.length} linhas`)
    
    // Log das primeiras linhas processadas para debug
    if (linhasProcessar.length > 0) {
      console.log(`[${this.bankName} Parser] Primeiras 10 linhas a processar:`)
      linhasProcessar.slice(0, 10).forEach((linha, idx) => {
        console.log(`[${this.bankName} Parser] Linha ${idx}: "${linha.substring(0, 100)}"`)
      })
    }

    // WillBank usa formato multi-linha: cada campo em uma linha separada
    // Formato típico:
    // - Descrição (ex: "PlatinumServices")
    // - Parcelamento (ex: "Parcela 7 de 12")
    // - Data (ex: "10/03/2025")
    // - Valor (ex: "R$ 487,50")

    // Padrões para formato tradicional (linha única)
    const padraoWillBankCompleto = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-+]?\s*R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})|[-+]?\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*R\$|[-+]?\s*(\d{1,3}(?:\.\d{3})*,\d{2}))/i
    const padraoWillBankSemAno = /^(\d{2}\/\d{2})\s+(.+?)\s+([-+]?\s*R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})|[-+]?\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*R\$|[-+]?\s*(\d{1,3}(?:\.\d{3})*,\d{2}))/i
    const padraoWillBankFlexivel = /^(\d{2}\/\d{2})\s+(.+?)\s+([-+]?\d{1,3}(?:\.\d{3})*,\d{2})/i

    // Padrões para formato multi-linha
    const padraoDescricao = /^[A-Z][A-Za-z0-9\s]+$/ // Descrição (sem números no início, sem R$)
    const padraoParcela = /Parcela\s+(\d+)\s+de\s+(\d+)/i
    const padraoData = /^(\d{2}\/\d{2}\/\d{4})$/
    const padraoValor = /^R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})$/i

    for (let i = 0; i < linhasProcessar.length; i++) {
      const linha = linhasProcessar[i]
      
      // Ignora cabeçalhos e rodapés
      if (this.deveIgnorarLinha(linha)) {
        continue
      }

      let data: string | null = null
      let descricao: string = ''
      let valor: number | null = null
      let parcelamento: { current: number; total: number } | null = null

      // TENTA FORMATO MULTI-LINHA PRIMEIRO (formato tabular do WillBank)
      // Verifica se a linha atual parece ser uma descrição (começa com letra, não é data, não é valor)
      const isDescricao = 
        !linha.match(/^\d{2}\/\d{2}(\/\d{4})?$/) && // Não é data
        !linha.match(/^R\$\s*\d/) && // Não é valor
        !linha.match(/^Parcela\s+\d+/) && // Não é parcelamento
        !linha.match(/^Cartão\s+\d+/) && // Não é número do cartão
        linha.length > 3 && 
        linha.length < 100 &&
        /^[A-Za-z]/.test(linha.trim()) // Começa com letra

      if (isDescricao) {
        // Verifica as próximas 6 linhas para encontrar parcelamento, data e valor
        let descricaoTemp = linha.trim()
        let dataTemp: string | null = null
        let valorTemp: number | null = null
        let parcelamentoTemp: { current: number; total: number } | null = null
        let linhasPuladas = 0

        for (let j = i + 1; j < Math.min(i + 7, linhasProcessar.length); j++) {
          const linhaSeguinte = linhasProcessar[j].trim()
          
          // Ignora linhas que devem ser puladas
          if (this.deveIgnorarLinha(linhaSeguinte)) {
            continue
          }

          // Verifica parcelamento
          const parcelaMatch = linhaSeguinte.match(padraoParcela)
          if (parcelaMatch) {
            parcelamentoTemp = {
              current: parseInt(parcelaMatch[1]),
              total: parseInt(parcelaMatch[2]),
            }
            linhasPuladas++
            continue
          }

          // Verifica data (formato DD/MM/YYYY)
          const dataMatch = linhaSeguinte.match(padraoData)
          if (dataMatch && !dataTemp) {
            dataTemp = dataMatch[1]
            linhasPuladas++
            continue
          }

          // Verifica valor
          const valorMatch = linhaSeguinte.match(padraoValor)
          if (valorMatch && valorTemp === null) {
            valorTemp = this.parseMonetaryValue(valorMatch[1])
            linhasPuladas++
            break // Quando encontra valor, termina a busca
          }
        }

        // Se encontrou data e valor (mínimos necessários), cria transação
        if (dataTemp && valorTemp !== null && !isNaN(valorTemp) && descricaoTemp.length > 2) {
          const [dia, mes, ano] = dataTemp.split('/')
          
          // Ajusta data para parcelas: usa mês/ano da fatura vigente
          if (parcelamentoTemp && parcelamentoTemp.total > 1 && mesAnoFatura.mes && mesAnoFatura.ano) {
            data = `${mesAnoFatura.ano}-${mesAnoFatura.mes}-${dia}`
            console.log(`[${this.bankName} Parser] 📅 Data ajustada (multi-linha): ${ano}-${mes}-${dia} (original) -> ${data} (parcela ${parcelamentoTemp.current}/${parcelamentoTemp.total})`)
          } else {
            data = `${ano}-${mes}-${dia}`
          }

          descricao = this.normalizeText(descricaoTemp)
          valor = Math.abs(valorTemp)
          parcelamento = parcelamentoTemp

          // Pula as linhas que foram processadas
          i += linhasPuladas

          console.log(`[${this.bankName} Parser] ✅ Transação multi-linha: ${data} - ${descricao.substring(0, 50)} - R$ ${valor.toFixed(2)} ${parcelamento ? `(Parcela ${parcelamento.current}/${parcelamento.total})` : ''}`)

          transactions.push({
            date: data,
            description: descricao,
            amount: valor,
            installments: parcelamento,
          })
          continue // Pula para próxima iteração
        }
      }

      // FALLBACK: Tenta formato tradicional (linha única)
      let match: RegExpMatchArray | null = null

      // Tenta padrão 1: DD/MM/YYYY
      match = linha.match(padraoWillBankCompleto)
      if (match) {
        const dataStr = match[1]
        descricao = match[2].trim()
        const valorStr = match[4] || match[5] || match[6]
        const sinal = linha.includes('-') ? '-' : '+'

        const [dia, mes, ano] = dataStr.split('/')
        data = `${ano}-${mes}-${dia}`

        parcelamento = this.extractInstallments(descricao)
        
        if (parcelamento && parcelamento.total > 1 && mesAnoFatura.mes && mesAnoFatura.ano) {
          data = `${mesAnoFatura.ano}-${mesAnoFatura.mes}-${dia}`
        }

        valor = this.parseMonetaryValue(valorStr || '0')
        valor = sinal === '-' ? -Math.abs(valor) : Math.abs(valor)

        console.log(`[${this.bankName} Parser] ✅ Match formato DD/MM/YYYY: ${data} - ${descricao.substring(0, 50)} - R$ ${valor.toFixed(2)}`)
      } else {
        // Tenta padrão 2: DD/MM
        match = linha.match(padraoWillBankSemAno)
        if (match) {
          const dataStr = match[1]
          descricao = match[2].trim()
          const valorStr = match[4] || match[5] || match[6]
          const sinal = linha.includes('-') ? '-' : '+'

          const [dia, mes] = dataStr.split('/')
          const ano = mesAnoFatura.ano || new Date().getFullYear().toString()
          data = `${ano}-${mes}-${dia}`

          parcelamento = this.extractInstallments(descricao)
          
          if (parcelamento && parcelamento.total > 1 && mesAnoFatura.mes && mesAnoFatura.ano) {
            data = `${mesAnoFatura.ano}-${mesAnoFatura.mes}-${dia}`
          }

          valor = this.parseMonetaryValue(valorStr || '0')
          valor = sinal === '-' ? -Math.abs(valor) : Math.abs(valor)

          console.log(`[${this.bankName} Parser] ✅ Match formato DD/MM: ${data} - ${descricao.substring(0, 50)} - R$ ${valor.toFixed(2)}`)
        } else {
          // Tenta padrão 3: flexível
          match = linha.match(padraoWillBankFlexivel)
          if (match) {
            const dataStr = match[1]
            descricao = match[2].trim()
            const valorStr = match[3]
            const sinal = linha.includes('-') ? '-' : '+'

            const [dia, mes] = dataStr.split('/')
            const ano = mesAnoFatura.ano || new Date().getFullYear().toString()
            data = `${ano}-${mes}-${dia}`

            parcelamento = this.extractInstallments(descricao)
            
            if (parcelamento && parcelamento.total > 1 && mesAnoFatura.mes && mesAnoFatura.ano) {
              data = `${mesAnoFatura.ano}-${mesAnoFatura.mes}-${dia}`
            }

            valor = this.parseMonetaryValue(valorStr || '0')
            valor = sinal === '-' ? -Math.abs(valor) : Math.abs(valor)

            console.log(`[${this.bankName} Parser] ✅ Match formato flexível: ${data} - ${descricao.substring(0, 50)} - R$ ${valor.toFixed(2)}`)
          }
        }
      }

      // Processa transação do formato tradicional
      if (data && valor !== null && !isNaN(valor) && descricao.length > 2) {
        descricao = this.normalizeText(descricao)
        
        if (parcelamento) {
          descricao = descricao.replace(/Parcela\s+\d+\s+de\s+\d+/gi, '').trim()
        }

        transactions.push({
          date: data,
          description: descricao,
          amount: Math.abs(valor),
          installments: parcelamento,
        })
      }
    }

    const uniqueTransactions = this.removeDuplicates(transactions)
    console.log(`[${this.bankName} Parser] ✅ ${uniqueTransactions.length} transações extraídas`)
    return uniqueTransactions
  }

  /**
   * Extrai mês/ano da fatura vigente
   */
  private extrairMesAnoFaturaVigente(text: string): { mes: string; ano: string } {
    const resultado = { mes: '', ano: '' }
    
    // Padrão 1: "Lançamentos de [mês]"
    const meses: { [key: string]: string } = {
      'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
      'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
      'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12',
    }

    const lancamentosMatch = text.match(/Lançamentos\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i)
    if (lancamentosMatch) {
      const mesNome = lancamentosMatch[1].toLowerCase()
      resultado.mes = meses[mesNome] || ''
      
      // Procura ano próximo
      const anoMatch = text.match(/(20\d{2})/)
      if (anoMatch) {
        resultado.ano = anoMatch[1]
      } else {
        resultado.ano = new Date().getFullYear().toString()
      }
      
      console.log(`[${this.bankName} Parser] Mês/ano extraído de "Lançamentos de ${mesNome}": ${resultado.mes}/${resultado.ano}`)
      return resultado
    }

    // Padrão 2: "Fechamento da fatura DD/MM/YYYY"
    const fechamentoMatch = text.match(/Fechamento\s+da\s+fatura\s+(\d{2})\/(\d{2})\/(\d{4})/i)
    if (fechamentoMatch) {
      resultado.mes = fechamentoMatch[2]
      resultado.ano = fechamentoMatch[3]
      console.log(`[${this.bankName} Parser] Mês/ano extraído do fechamento: ${resultado.mes}/${resultado.ano}`)
      return resultado
    }

    // Fallback: usa mês/ano atual
    const agora = new Date()
    resultado.mes = String(agora.getMonth() + 1).padStart(2, '0')
    resultado.ano = agora.getFullYear().toString()
    
    return resultado
  }

  /**
   * Verifica se a linha deve ser ignorada (cabeçalho/rodapé)
   */
  private deveIgnorarLinha(linha: string): boolean {
    const linhaLower = linha.toLowerCase()
    
    // Ignora cabeçalhos
    if (linhaLower.includes('lançamentos de') && linhaLower.includes('gastos')) return false
    if (linhaLower.includes('lançamentos de')) return true
    if (linhaLower.includes('gastos') && linhaLower.length < 10 && !linhaLower.includes('parcelamentos')) return true
    if (linhaLower.includes('fechamento da fatura')) return true
    if (linhaLower.includes('data') && linhaLower.includes('descrição')) return true
    if (linhaLower.includes('valor') && linhaLower.length < 20) return true
    if (linhaLower.includes('total')) return true
    if (linhaLower.includes('previsão próximo fechamento')) return true
    if (linhaLower.includes('lançamentos em parcelas')) return true
    if (linhaLower.includes('cartão') && /cartão\s+\d+/.test(linhaLower)) return true // Ignora "Cartão 8191"
    
    // Ignora linhas muito curtas (exceto valores)
    if (linha.length < 3) return true

    return false
  }
}

