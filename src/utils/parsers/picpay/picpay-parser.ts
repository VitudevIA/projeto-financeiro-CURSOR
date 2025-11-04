/**
 * Parser para faturas do PicPay
 * Refatorado para usar a interface base
 */

import { BaseBankStatementParser, ExtractedTransaction } from '../base-parser-interface'

export class PicPayParser extends BaseBankStatementParser {
  readonly bankId = 'picpay'
  readonly bankName = 'PicPay'

  private readonly indicators = [
    'picpay',
    'mastercard',
    'transações nacionais',
    'estabelecimento',
    'total da fatura',
  ]

  canParse(text: string): boolean {
    const textLower = text.toLowerCase()
    
    // Verifica se é PicPay
    const isPicPay = 
      textLower.includes('picpay') && 
      !textLower.includes('nubank') &&
      !textLower.includes('cartão inter') &&
      !textLower.includes('banco inter') &&
      !textLower.includes('willbank')
    
    // Verifica indicadores específicos do PicPay
    const hasSpecificIndicators = 
      textLower.includes('pagamento de fatura pelo picpa') ||
      textLower.includes('picpay mastercard') ||
      (textLower.includes('mastercard') && textLower.includes('transações nacionais'))
    
    return isPicPay || hasSpecificIndicators
  }

  parse(text: string): ExtractedTransaction[] {
    console.log(`[${this.bankName} Parser] Iniciando parse...`)
    const transactions: ExtractedTransaction[] = []
    
    if (!text || text.trim().length === 0) {
      return transactions
    }

    const linhas = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    
    // Extrai ano do texto
    const yearMatch = text.match(/\b(20\d{2})\b/)
    const currentYear = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear()

    // Procura pela seção de transações
    // Padrões comuns: "Transações nacionais", "Despesas do mês", etc.
    let indiceInicio = -1
    for (let i = 0; i < linhas.length; i++) {
      const linhaLower = linhas[i].toLowerCase()
      if (linhaLower.includes('transações nacionais') || 
          linhaLower.includes('despesas do mês') ||
          (linhaLower.includes('data') && linhaLower.includes('estabelecimento'))) {
        indiceInicio = i + 1
        console.log(`[${this.bankName} Parser] Seção de transações encontrada na linha ${i}`)
        break
      }
    }

    // Se não encontrou seção específica, procura por linhas que começam com data
    if (indiceInicio === -1) {
      for (let i = 0; i < linhas.length; i++) {
        if (/^\d{2}\/\d{2}/.test(linhas[i]) && !this.deveIgnorarLinha(linhas[i])) {
          indiceInicio = i
          console.log(`[${this.bankName} Parser] Primeira transação encontrada na linha ${i}`)
          break
        }
      }
    }

    // Se ainda não encontrou, usa todas as linhas
    if (indiceInicio === -1) {
      indiceInicio = 0
    }

    const linhasProcessar = indiceInicio > 0 ? linhas.slice(indiceInicio) : linhas
    console.log(`[${this.bankName} Parser] Processando ${linhasProcessar.length} linhas`)

    // Padrões mais flexíveis para PicPay
    // IMPORTANTE: Usa lazy matching (.*?) para não capturar valores que fazem parte da descrição
    // O valor deve ser o ÚLTIMO número monetário na linha
    
    // Padrão 1: DD/MM DESCRIÇÃO VALOR (formato tradicional, com espaços)
    // Usa lookahead negativo para garantir que pega o último valor monetário
    const padraoPrincipal = /^(\d{2}\/\d{2})\s+(.+?)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/
    
    // Padrão 2: DD/MM DESCRIÇÃO VALOR (sem espaços, formato grudado)
    // Usa \s* no final para garantir que pega até o fim da linha
    const padraoGrudado = /^(\d{2}\/\d{2})(.+?)([-]?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/
    
    // Padrão 3: DD/MM/YYYY DESCRIÇÃO VALOR
    const padraoComAno = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/
    
    // Padrão 4: DD/MM/YYYY DESCRIÇÃO VALOR (sem espaços)
    const padraoComAnoGrudado = /^(\d{2}\/\d{2}\/\d{4})(.+?)([-]?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/

    for (let i = 0; i < linhasProcessar.length; i++) {
      const linha = linhasProcessar[i]
      
      if (linha.length < 10) continue
      if (this.deveIgnorarLinha(linha)) continue

      let match: RegExpMatchArray | null = null
      let dataStr: string = ''
      let descricao: string = ''
      let valorStr: string = ''

      // Tenta padrão com ano primeiro (com espaços)
      match = linha.match(padraoComAno)
      if (match) {
        dataStr = match[1]
        descricao = match[2].trim()
        valorStr = match[3]
      } else {
        // Tenta padrão com ano grudado
        match = linha.match(padraoComAnoGrudado)
        if (match) {
          dataStr = match[1]
          descricao = match[2].trim()
          valorStr = match[3]
        } else {
          // Tenta padrão sem ano (com espaços)
          match = linha.match(padraoPrincipal)
          if (match) {
            dataStr = match[1]
            descricao = match[2].trim()
            valorStr = match[3]
          } else {
            // Tenta padrão sem ano grudado
            match = linha.match(padraoGrudado)
            if (match) {
              dataStr = match[1]
              descricao = match[2].trim()
              valorStr = match[3]
            } else {
              // Padrão alternativo: procura pelo último valor monetário na linha
              // Útil para casos onde a descrição contém valores que não são o valor da transação
              const padraoAlternativo = /^(\d{2}\/\d{2})\s*(.+?)([-]?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/
              match = linha.match(padraoAlternativo)
              if (match) {
                // Verifica se há múltiplos valores monetários na linha
                const valoresEncontrados = linha.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g)
                if (valoresEncontrados && valoresEncontrados.length > 1) {
                  // Pega o ÚLTIMO valor (mais à direita)
                  valorStr = valoresEncontrados[valoresEncontrados.length - 1]
                  // Descrição é tudo entre a data e o último valor
                  const dataIndex = linha.indexOf(match[1])
                  const valorIndex = linha.lastIndexOf(valorStr)
                  descricao = linha.substring(dataIndex + match[1].length, valorIndex).trim()
                  dataStr = match[1]
                } else {
                  dataStr = match[1]
                  descricao = match[2].trim()
                  valorStr = match[3]
                }
              }
            }
          }
        }
      }

      if (!match || !dataStr || !descricao || !valorStr) continue

      // IMPORTANTE: Extrai parcelamento ANTES de qualquer processamento da descrição
      // O parcelamento pode estar grudado na descrição (ex: "SHEINPARC01/02")
      const descricaoOriginal = descricao
      
      // CRÍTICO: Extrai parcelamento da descrição, mas EVITA capturar números do valor
      // IMPORTANTE: O parcelamento deve estar na descrição, NÃO no valor
      // Para isso, extraímos parcelamento ANTES de processar o valor
      // NÃO INFERE PARCELAMENTO DO VALOR - apenas aceita padrões PARC explícitos
      let parcelamento = this.extractInstallmentsPicPay(descricaoOriginal, linha)
      
      // Se encontrou parcelamento parcial (termina com /0), tenta encontrar o dígito completo
      // MAS APENAS se houver padrão PARC explícito na descrição
      if (!parcelamento || parcelamento.total === 0) {
        const parcelaParcialMatch = descricaoOriginal.match(/PARC(\d{1,2})\/0/i)
        if (parcelaParcialMatch) {
          const parcelaAtual = parseInt(parcelaParcialMatch[1])
          
          // Tenta encontrar o dígito completo nas próximas linhas ou na própria linha
          // Procura por padrões como "05", "03", "02", etc. que podem estar separados
          let totalParcelas: number | null = null
          
          // Primeiro, verifica se há um dígito logo após "/0" na mesma linha
          const linhaCompleta = linha
          const indiceParcela = linhaCompleta.indexOf(parcelaParcialMatch[0])
          if (indiceParcela !== -1) {
            const depoisParcela = linhaCompleta.substring(indiceParcela + parcelaParcialMatch[0].length)
            const digitoMatch = depoisParcela.match(/^\s*(\d{1,2})/)
            if (digitoMatch) {
              totalParcelas = parseInt(digitoMatch[1])
            }
          }
          
          // Se não encontrou na mesma linha, verifica nas próximas 3 linhas
          if (!totalParcelas && i + 1 < linhasProcessar.length) {
            for (let j = i + 1; j < Math.min(i + 4, linhasProcessar.length); j++) {
              const linhaSeguinte = linhasProcessar[j].trim()
              // Procura por um dígito isolado (1-2 dígitos) que pode ser o total de parcelas
              const digitoMatch = linhaSeguinte.match(/^(\d{1,2})(?:\s|$|,|\.)/)
              if (digitoMatch) {
                const possivelTotal = parseInt(digitoMatch[1])
                // Valida: deve ser >= parcela atual e <= 99
                if (possivelTotal >= parcelaAtual && possivelTotal <= 99) {
                  totalParcelas = possivelTotal
                  console.log(`[${this.bankName} Parser] 🔍 Dígito do total encontrado na linha seguinte: ${totalParcelas}`)
                  break
                }
              }
            }
          }
          
          // CRÍTICO: NÃO INFERE PARCELAMENTO DO VALOR
          // Se não encontrou o total em linhas adjacentes, mantém como null
          // Isso evita criar parcelamento falso positivo a partir do valor
          
          if (totalParcelas && totalParcelas >= parcelaAtual) {
            parcelamento = { current: parcelaAtual, total: totalParcelas }
            console.log(`[${this.bankName} Parser] ✅ Parcelamento corrigido de PARC${parcelaAtual}/0 para ${parcelaAtual}/${totalParcelas}`)
          } else {
            console.log(`[${this.bankName} Parser] ⚠️ Parcelamento parcial PARC${parcelaAtual}/0 encontrado mas total não pôde ser determinado`)
            // Não cria parcelamento se não conseguir determinar o total
            parcelamento = null
          }
        }
      }
      
      // Log para debug
      if (parcelamento) {
        console.log(`[${this.bankName} Parser] 📦 Parcelamento encontrado: ${parcelamento.current}/${parcelamento.total} na descrição: "${descricaoOriginal.substring(0, 60)}"`)
      }

      // Remove parcelamento da descrição (mantém apenas a descrição base)
      // IMPORTANTE: Usa o parcelamento extraído para remover corretamente
      let descricaoLimpa = descricaoOriginal
      
      // CRÍTICO: Remove parcelamento mesmo que não tenha sido extraído corretamente
      // Isso garante que "PARC" solto seja removido (ex: "SHEIN *SHEIN.PARC", "GABRIELA PARC")
      if (parcelamento) {
        // Remove diferentes formatos de parcelamento usando o valor extraído
        // Primeiro tenta remover com o formato exato encontrado
        const parcelaStr = `PARC${parcelamento.current.toString().padStart(2, '0')}/${parcelamento.total.toString().padStart(2, '0')}`
        const parcelaStrAlt = `PARC${parcelamento.current}/${parcelamento.total}`
        
        descricaoLimpa = descricaoLimpa
          .replace(new RegExp(parcelaStr, 'gi'), '') // Remove formato exato (PARC01/02)
          .replace(new RegExp(parcelaStrAlt, 'gi'), '') // Remove formato alternativo (PARC1/2)
          .replace(/PARC\d{1,2}\/\d{1,2}/gi, '') // Remove qualquer formato PARCXX/YY como fallback
          .replace(/parcela\s*\d{1,2}\s*\/\s*\d{1,2}/gi, '') // Remove formato "Parcela X/Y"
          .trim()
      }
      
      // CRÍTICO: Remove qualquer ocorrência de "PARC" que possa ter sobrado
      // Isso resolve casos como "SHEIN *SHEIN.PARC", "GABRIELA PARC", "ANDERSONTEIXEIPARC", etc.
      // Remove "PARC" seguido de números (parcelamento completo)
      descricaoLimpa = descricaoLimpa
        .replace(/PARC\d{1,2}\/\d{1,2}/gi, '') // Remove PARCXX/YY
        .replace(/PARC\d{1,2}\/0/gi, '') // Remove PARCXX/0 (parcelamento parcial)
        .replace(/PARC\d{1,2}/gi, '') // Remove PARC seguido de apenas números
        .replace(/PARC\s*$/gi, '') // Remove "PARC" no final da string
        .replace(/\s+PARC\s*/gi, ' ') // Remove "PARC" isolado (com espaços)
        .replace(/PARC$/gi, '') // Remove "PARC" no final (sem espaço)
        .replace(/\s+/g, ' ') // Remove múltiplos espaços
        .trim()
      
      console.log(`[${this.bankName} Parser] Descrição após remoção de parcelamento: "${descricaoLimpa.substring(0, 50)}" (original: "${descricaoOriginal.substring(0, 50)}")`)

      // Formata data
      let data: string
      if (dataStr.includes('/')) {
        const partes = dataStr.split('/')
        if (partes.length === 3) {
          // DD/MM/YYYY
          data = `${partes[2]}-${partes[1]}-${partes[0]}`
        } else {
          // DD/MM
          data = this.formatDate(dataStr, currentYear)
        }
      } else {
        data = this.formatDate(dataStr, currentYear)
      }

      // Converte valor - CRÍTICO: garante que não está pegando valores concatenados
      // O valor deve ser o ÚLTIMO número monetário na linha (formato brasileiro)
      // Verifica se há múltiplos valores na linha e pega apenas o último
      let valor: number
      
      // Verifica se há múltiplos valores monetários na linha completa
      // Isso pode acontecer quando a descrição contém números
      const todosValoresNaLinha = linha.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g)
      if (todosValoresNaLinha && todosValoresNaLinha.length > 1) {
        // Pega o ÚLTIMO valor (mais à direita na linha)
        const ultimoValor = todosValoresNaLinha[todosValoresNaLinha.length - 1]
        console.log(`[${this.bankName} Parser] ⚠️ Múltiplos valores encontrados na linha ${i}: ${todosValoresNaLinha.join(', ')}. Usando último: ${ultimoValor}`)
        valorStr = ultimoValor
      }
      
      // Limpa o valorStr para garantir que não tem caracteres extras
      const valorStrLimpo = valorStr.trim().replace(/[^\d.,-]/g, '')
      valor = this.parseMonetaryValue(valorStrLimpo)
      
      if (isNaN(valor) || valor <= 0) {
        console.log(`[${this.bankName} Parser] ⚠️ Valor inválido na linha ${i}: "${valorStr}" (limpo: "${valorStrLimpo}")`)
        continue
      }

      // CORREÇÃO CRÍTICA: Se há parcelamento encontrado na descrição, SEMPRE verifica se o valor está concatenado
      // Quando o parcelamento é PARCXX/YY, o valor pode estar concatenado com o total de parcelas
      // Exemplos conhecidos:
      // - PARC02/05 com valor 576,00 -> deve ser 76,00 (5 do total + 76,00)
      // - PARC03/05 com valor 559,45 -> deve ser 59,45 (5 do total + 59,45)
      // - PARC01/05 com valor 511,89 -> deve ser 11,89 (5 do total + 11,89)
      // - PARC01/02 com valor 267,90 -> deve ser 67,90 (2 do total + 67,90)
      
      if (parcelamento && parcelamento.total > 0 && parcelamento.total <= 99) {
        const valorOriginal = valor
        const valorNumStr = Math.floor(valor).toString()
        const valorDecimal = valorStrLimpo.split(',')[1] || '00'
        
        // CRITÉRIO: Se o valor tem 3+ dígitos e o primeiro(s) dígito(s) corresponde(m) ao total de parcelas
        // Aplica correção SEMPRE que houver correspondência, independente do valor
        let valorCorrigido = false
        
        if (valorNumStr.length >= 3) {
          const primeiroDigito = parseInt(valorNumStr.substring(0, 1))
          const doisPrimeirosDigitos = parseInt(valorNumStr.substring(0, 2))
          
          // CRITÉRIO 1: Primeiro dígito corresponde ao total (1-9 parcelas)
          if (primeiroDigito === parcelamento.total && primeiroDigito <= 9) {
            const valorRestante = valorNumStr.substring(1)
            const novoValorStr = `${valorRestante},${valorDecimal}`
            const novoValor = this.parseMonetaryValue(novoValorStr)
            
            // Valida: novo valor deve ser razoável (< 1000) e menor que o original
            if (novoValor > 0 && novoValor < valor && novoValor < 1000) {
              console.log(`[${this.bankName} Parser] 🔧 Valor corrigido (PARC${parcelamento.current}/${parcelamento.total}): R$ ${valor.toFixed(2)} -> R$ ${novoValor.toFixed(2)} (removido dígito ${primeiroDigito})`)
              valor = novoValor
              valorStr = novoValorStr
              valorCorrigido = true
            }
          } 
          // CRITÉRIO 2: Dois primeiros dígitos correspondem ao total (10-99 parcelas)
          else if (doisPrimeirosDigitos === parcelamento.total && doisPrimeirosDigitos >= 10 && valorNumStr.length >= 4) {
            const valorRestante = valorNumStr.substring(2)
            const novoValorStr = `${valorRestante},${valorDecimal}`
            const novoValor = this.parseMonetaryValue(novoValorStr)
            
            // Valida: novo valor deve ser razoável (< 1000) e menor que o original
            if (novoValor > 0 && novoValor < valor && novoValor < 1000) {
              console.log(`[${this.bankName} Parser] 🔧 Valor corrigido (PARC${parcelamento.current}/${parcelamento.total}): R$ ${valor.toFixed(2)} -> R$ ${novoValor.toFixed(2)} (removidos dígitos ${doisPrimeirosDigitos})`)
              valor = novoValor
              valorStr = novoValorStr
              valorCorrigido = true
            }
          }
        }
        
        // Log se não foi possível corrigir mas o valor parece alto
        if (!valorCorrigido && valor > 500 && parcelamento.total > 1) {
          console.log(`[${this.bankName} Parser] ⚠️ Valor alto para parcela ${parcelamento.current}/${parcelamento.total}: R$ ${valor.toFixed(2)} (não foi possível corrigir automaticamente)`)
        }
      }

      // Validação adicional: valores muito altos podem indicar problema na extração
      // Se o valor for maior que 10.000, pode estar concatenando valores
      if (valor > 10000) {
        console.log(`[${this.bankName} Parser] ⚠️ Valor muito alto (possível erro): R$ ${valor.toFixed(2)} na linha ${i}. Verificando...`)
        // Tenta extrair novamente usando uma abordagem mais conservadora
        const valoresConservadores = linha.match(/\b\d{1,3}(?:\.\d{3})*,\d{2}\b/g)
        if (valoresConservadores && valoresConservadores.length > 0) {
          const ultimoValorConservador = valoresConservadores[valoresConservadores.length - 1]
          const valorConservador = this.parseMonetaryValue(ultimoValorConservador)
          if (valorConservador < valor && valorConservador > 0) {
            console.log(`[${this.bankName} Parser] 🔧 Valor corrigido: R$ ${valor.toFixed(2)} -> R$ ${valorConservador.toFixed(2)}`)
            valor = valorConservador
            valorStr = ultimoValorConservador
          }
        }
      }

      // Limpa descrição final - CRÍTICO: normaliza e valida antes de adicionar
      descricaoLimpa = this.normalizeText(descricaoLimpa)
      
      // Validação final: verifica se a descrição ainda contém "PARC" (não deveria)
      if (descricaoLimpa.toUpperCase().includes('PARC')) {
        console.log(`[${this.bankName} Parser] ⚠️ Descrição ainda contém PARC após limpeza: "${descricaoLimpa}"`)
        // Remove qualquer ocorrência restante de PARC
        descricaoLimpa = descricaoLimpa
          .replace(/PARC\d{0,2}\/?\d{0,2}/gi, '')
          .replace(/PARC\s*/gi, '')
          .replace(/\s+/g, ' ')
          .trim()
        console.log(`[${this.bankName} Parser] 🔧 Descrição após remoção adicional de PARC: "${descricaoLimpa.substring(0, 50)}"`)
      }
      
      if (descricaoLimpa.length < 3) {
        console.log(`[${this.bankName} Parser] ⚠️ Descrição muito curta após limpeza: "${descricaoLimpa}" (original: "${descricaoOriginal.substring(0, 50)}")`)
        continue
      }

      console.log(`[${this.bankName} Parser] ✅ Transação extraída: ${data} - ${descricaoLimpa.substring(0, 50)} - R$ ${valor.toFixed(2)} ${parcelamento ? `(Parcela ${parcelamento.current}/${parcelamento.total})` : ''}`)

      transactions.push({
        date: data,
        description: descricaoLimpa,
        amount: Math.abs(valor),
        installments: parcelamento,
      })
    }

    const uniqueTransactions = this.removeDuplicates(transactions)
    console.log(`[${this.bankName} Parser] ✅ ${uniqueTransactions.length} transações extraídas`)
    return uniqueTransactions
  }

  /**
   * Extrai parcelamento específico para PicPay, evitando capturar números do valor
   * CRÍTICO: Esta função deve capturar APENAS parcelamento explícito na descrição (PARCXX/YY)
   * NÃO usa método base nem padrões genéricos que podem capturar números do valor
   */
  private extractInstallmentsPicPay(description: string, linhaCompleta: string): { current: number; total: number } | null {
    // CRÍTICO: Para PicPay, APENAS aceita padrões explícitos PARCXX/YY
    // NÃO usa this.extractInstallments() que pode usar padrões genéricos
    const descricaoLimpa = description.trim().toUpperCase()
    
    // Padrão único e específico: PARC seguido de 1-2 dígitos, barra, 1-2 dígitos
    // Exemplo: "SHEINPARC01/02", "EC *LPARC03/05", "ANDERSONTEIXEIPARC02/05"
    // IMPORTANTE: Busca APENAS o padrão PARC, não aceita outros formatos
    const parcelaMatch = descricaoLimpa.match(/PARC(\d{1,2})\/(\d{1,2})/i)
    
    if (parcelaMatch) {
      const current = parseInt(parcelaMatch[1])
      const total = parseInt(parcelaMatch[2])
      
      // Validação rigorosa
      if (current > 0 && total > 0 && current <= total && total <= 99 && current <= 99) {
        // VALIDAÇÃO CRÍTICA: Verifica se não está capturando números do valor
        // Extrai o valor da linha completa para comparar
        const valoresNaLinha = linhaCompleta.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g)
        if (valoresNaLinha && valoresNaLinha.length > 0) {
          const ultimoValor = valoresNaLinha[valoresNaLinha.length - 1]
          const valorNumero = this.parseMonetaryValue(ultimoValor)
          const valorInteiro = Math.floor(valorNumero).toString()
          
          // CRÍTICO: Se o total ou current aparecem como número completo no início do valor, descarta
          // Exemplo: total=57 e valor=576,00 -> descarta (57 está no início de 576)
          // Exemplo: total=5 e valor=576,00 -> aceita (5 é parte normal de 576, mas pode ser correto)
          // Para ser mais seguro, só descarta se ambos os dígitos correspondem
          if (valorInteiro.length >= 3) {
            const doisPrimeirosDigitos = valorInteiro.substring(0, 2)
            const tresPrimeirosDigitos = valorInteiro.length >= 4 ? valorInteiro.substring(0, 3) : null
            
            // Se o total de 2 dígitos aparece no início do valor, é falso positivo
            if (total >= 10 && doisPrimeirosDigitos === total.toString().padStart(2, '0')) {
              console.log(`[${this.bankName} Parser] ❌ Parcelamento ${current}/${total} descartado: total ${total} aparece no início do valor ${valorNumero.toFixed(2)}`)
              return null
            }
            
            // Se o total de 3 dígitos aparece no início do valor, é falso positivo
            if (total >= 100 && tresPrimeirosDigitos && tresPrimeirosDigitos === total.toString().padStart(3, '0')) {
              console.log(`[${this.bankName} Parser] ❌ Parcelamento ${current}/${total} descartado: total ${total} aparece no início do valor ${valorNumero.toFixed(2)}`)
              return null
            }
            
            // Se o current de 2 dígitos aparece no início do valor, é falso positivo
            if (current >= 10 && doisPrimeirosDigitos === current.toString().padStart(2, '0')) {
              console.log(`[${this.bankName} Parser] ❌ Parcelamento ${current}/${total} descartado: current ${current} aparece no início do valor ${valorNumero.toFixed(2)}`)
              return null
            }
          }
        }
        
        console.log(`[${this.bankName} Parser] ✅ Parcelamento encontrado via PARC: ${current}/${total}`)
        return { current, total }
      }
    }
    
    // Se não encontrou padrão PARC explícito, retorna null
    // NÃO tenta padrões genéricos para evitar falsos positivos
    return null
  }

  private deveIgnorarLinha(linha: string): boolean {
    const linhaLower = linha.toLowerCase()
    return (
      linhaLower.includes('data') && linhaLower.includes('estabelecimento') ||
      linhaLower.includes('resumo da fatura') ||
      linhaLower.includes('total da fatura') ||
      linhaLower.includes('vencimento')
    )
  }
}

