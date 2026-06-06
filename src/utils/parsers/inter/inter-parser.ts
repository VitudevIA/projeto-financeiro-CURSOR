/**
 * Parser para faturas do Banco Inter
 * Formato: "DD de mmm. YYYY DESCRIÇÃO -R$ VALOR" ou "+ R$ VALOR"
 */

import { BaseBankStatementParser, ExtractedTransaction } from '../base-parser-interface'

export class InterParser extends BaseBankStatementParser {
  readonly bankId = 'inter'
  readonly bankName = 'Banco Inter'

  /** Padrão de data por extenso: "10 de jun. 2025" ou "26 de mar. 2026" */
  private static readonly PADRAO_DATA_EXTENSO =
    /(\d{1,2})\s+de\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.?\s+(\d{4})/i

  private readonly indicators = [
    'banco inter',
    'cartão inter',
    'conta do inter',
    'resumo da fatura',
    'ficha de compensação',
    'autenticação mecânica',
  ]

  canParse(text: string): boolean {
    if (!text || text.trim().length === 0) {
      return false
    }
    
    const textLower = text.toLowerCase()
    
    // Indicadores específicos do Inter
    const temCartaoInter = textLower.includes('cartão inter')
    const temBancoInter = textLower.includes('banco inter')
    const temContaInter = textLower.includes('conta do inter')
    const temResumoFatura = textLower.includes('resumo da fatura')
    const temFichaCompensacao = textLower.includes('ficha de compensação')
    const temAutenticacao = textLower.includes('autenticação mecânica')
    
    // Combinações que indicam Inter
    const hasInterIndicators = 
      temCartaoInter ||
      temBancoInter ||
      temContaInter ||
      (temResumoFatura && temFichaCompensacao) ||
      (temResumoFatura && temAutenticacao)
    
    // Exclui outros bancos, mas permite se tiver indicadores fortes do Inter
    const temPicPay = textLower.includes('picpay')
    const temNubank = textLower.includes('nubank')
    const temWillbank = textLower.includes('willbank')
    
    // Se tem indicadores fortes do Inter (cartão inter, banco inter), aceita mesmo se tiver outros nomes
    const temIndicadoresFortesInter = temCartaoInter || temBancoInter || (temResumoFatura && temFichaCompensacao)
    
    // Se não tem indicadores fortes, verifica se não é outro banco
    const isNotOtherBanks = !temPicPay && !temNubank && !temWillbank
    
    // Aceita se: (tem indicadores fortes) OU (tem indicadores e não é outro banco)
    const result = temIndicadoresFortesInter || (hasInterIndicators && isNotOtherBanks)
    
    console.log(`[${this.bankName} Parser] canParse:`, {
      temCartaoInter,
      temBancoInter,
      temResumoFatura,
      temFichaCompensacao,
      hasInterIndicators,
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

    const meses = BaseBankStatementParser.MESES_ABREV

    // Divide o texto em linhas
    const linhas = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    
    // Procura pela seção "Despesas da fatura"
    let indiceInicio = -1
    for (let i = 0; i < linhas.length; i++) {
      const linhaLower = linhas[i].toLowerCase()
      if (linhaLower.includes('despesas da fatura')) {
        indiceInicio = i + 1 // Próxima linha após o título
        console.log(`[${this.bankName} Parser] Seção "Despesas da fatura" encontrada na linha ${i}`)
        break
      }
    }

    // Se não encontrou "Despesas da fatura", procura por cabeçalho de tabela
    if (indiceInicio === -1) {
      for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i]
        if (linha.includes('DataMovimentaçãoBeneficiárioValor') || 
            (linha.includes('Data') && linha.includes('Movimentação') && linha.includes('Beneficiário'))) {
          indiceInicio = i + 1 // Próxima linha após o cabeçalho
          console.log(`[${this.bankName} Parser] Cabeçalho de tabela encontrado na linha ${i}`)
          break
        }
      }
    }

    // Se ainda não encontrou, procura por padrões de data que indicam início de transações
    if (indiceInicio === -1) {
      // Procura por linhas que começam com data no formato do Inter (DD de mmm. YYYY)
      for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i]
        if (InterParser.PADRAO_DATA_EXTENSO.test(linha)) {
          // Verifica se a linha anterior tem indicadores de seção
          if (i > 0) {
            const linhaAnterior = linhas[i - 1].toLowerCase()
            if (linhaAnterior.includes('despesas') || 
                linhaAnterior.includes('lançamentos') ||
                linhaAnterior.includes('transações') ||
                linhaAnterior.includes('resumo')) {
              indiceInicio = i
              console.log(`[${this.bankName} Parser] Primeira transação encontrada na linha ${i}`)
              break
            }
          } else {
            indiceInicio = i
            console.log(`[${this.bankName} Parser] Primeira transação encontrada na linha ${i}`)
            break
          }
        }
      }
    }

    // Se ainda não encontrou, começa após "Resumo da fatura" e procura primeira transação
    if (indiceInicio === -1) {
      for (let i = 0; i < linhas.length; i++) {
        if (linhas[i].toLowerCase().includes('resumo da fatura')) {
          // Procura pela primeira linha com data após o resumo
          for (let j = i + 1; j < Math.min(i + 20, linhas.length); j++) {
            if (InterParser.PADRAO_DATA_EXTENSO.test(linhas[j])) {
              indiceInicio = j
              console.log(`[${this.bankName} Parser] Usando fallback: início na linha ${j} (após resumo na linha ${i})`)
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

    // Padrão principal: "DD de mmm. YYYY DESCRIÇÃO -R$ VALOR" (ponto após mês opcional)
    const padraoInterCompleto =
      /(\d{1,2})\s+de\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.?\s+(\d{4})(.+?)([+-]?\s*R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2}))$/i

    for (let i = 0; i < linhasProcessar.length; i++) {
      const linha = linhasProcessar[i]
      
      // Ignora cabeçalhos e rodapés
      if (this.deveIgnorarLinha(linha)) {
        continue
      }

      let match: RegExpMatchArray | null = linha.match(padraoInterCompleto)
      let data: string | null = null
      let descricao: string = ''
      let valor: number | null = null
      let parcelamento: { current: number; total: number } | null = null

      if (match) {
        const dia = match[1].padStart(2, '0')
        const mesAbr = match[2].toLowerCase()
        const ano = parseInt(match[3], 10)
        const mes = meses[mesAbr] || '01'
        descricao = match[4].trim()
        const valorStr = match[6]
        const sinal = match[5]?.includes('+') ? '+' : '-'

        // Extrai parcelamento da descrição
        const descricaoTemp = this.normalizeText(descricao)
        const parcelaMatch = descricaoTemp.match(/Parcela\s+(\d+)\s+de\s+(\d+)/i)
        if (parcelaMatch) {
          parcelamento = {
            current: parseInt(parcelaMatch[1]),
            total: parseInt(parcelaMatch[2]),
          }
        }

        // Ano explícito na linha → YYYY-MM-DD literal
        let dataFormatada: string
        if (parcelamento && parcelamento.total > 1 && mesAnoFatura.mes && mesAnoFatura.ano) {
          dataFormatada = this.toIsoDate(
            parseInt(mesAnoFatura.ano, 10),
            mesAnoFatura.mes,
            dia
          )
          console.log(`[${this.bankName} Parser] 📅 Data ajustada (parcela): ${this.toIsoDate(ano, mes, dia)} -> ${dataFormatada}`)
        } else {
          dataFormatada = this.toIsoDate(ano, mes, dia)
        }
        data = dataFormatada

        valor = this.parseMonetaryValue(valorStr)
        if (sinal === '+') {
          valor = Math.abs(valor)
        } else {
          valor = -Math.abs(valor)
        }

        console.log(`[${this.bankName} Parser] ✅ Match formato Inter: ${data} - ${descricao.substring(0, 50)} - R$ ${valor?.toFixed(2)}`)
      } else {
        // Fallback: tenta padrões alternativos
        // Padrão: "DD/MM/YYYY DESCRIÇÃO R$ VALOR"
        const padraoAlternativo1 = /(\d{1,2}\/\d{1,2}\/\d{4})(.+?)([+-]?\s*R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2}))/i
        match = linha.match(padraoAlternativo1)
        
        if (match) {
          const dataStr = match[1]
          descricao = match[2].trim()
          const valorStr = match[4]
          const sinal = match[3]?.includes('+') ? '+' : '-'

          const [dia, mes, ano] = dataStr.split('/')
          data = this.toIsoDate(parseInt(ano, 10), mes, dia)

          // Extrai parcelamento
          parcelamento = this.extractInstallments(descricao)
          
          // Ajusta data para parcelas
          if (parcelamento && parcelamento.total > 1 && mesAnoFatura.mes && mesAnoFatura.ano) {
            data = this.toIsoDate(
              parseInt(mesAnoFatura.ano, 10),
              mesAnoFatura.mes,
              dia
            )
          }

          valor = this.parseMonetaryValue(valorStr)
          if (sinal === '+') {
            valor = Math.abs(valor)
          } else {
            valor = -Math.abs(valor)
          }

          console.log(`[${this.bankName} Parser] ✅ Match formato alternativo: ${data} - ${descricao.substring(0, 50)}`)
        }
      }

      if (data && valor !== null && !isNaN(valor) && descricao.length > 2) {
        // Limpa descrição
        descricao = this.normalizeText(descricao)
        
        // Remove informações de parcelamento da descrição base (já extraímos)
        if (parcelamento) {
          descricao = descricao.replace(/Parcela\s+\d+\s+de\s+\d+/gi, '').trim()
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
   * Extrai mês/ano da fatura vigente
   */
  private extrairMesAnoFaturaVigente(text: string): { mes: string; ano: string } {
    const resultado = { mes: '', ano: '' }
    
    // Procura por "Data de Vencimento DD/MM/YYYY"
    const vencimentoMatch = text.match(/Data\s+de\s+Vencimento\s+(\d{2})\/(\d{2})\/(\d{4})/i)
    if (vencimentoMatch) {
      resultado.mes = vencimentoMatch[2]
      resultado.ano = vencimentoMatch[3]
      console.log(`[${this.bankName} Parser] Mês/ano extraído do vencimento: ${resultado.mes}/${resultado.ano}`)
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
    
    // Ignora cabeçalhos de tabela
    if (linhaLower.includes('datamovimentação') || 
        linhaLower.includes('beneficiário') ||
        linhaLower.includes('valor') ||
        linhaLower.includes('total') ||
        linhaLower.includes('resumo da fatura') ||
        linhaLower.includes('ficha de compensação') ||
        linhaLower.includes('autenticação mecânica')) {
      return true
    }

    // Ignora linhas muito curtas
    if (linha.length < 10) {
      return true
    }

    return false
  }
}

