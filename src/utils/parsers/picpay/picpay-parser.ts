/**
 * Parser para faturas do PicPay
 * Refatorado para usar a interface base
 */

import { BaseBankStatementParser, ExtractedTransaction } from '../base-parser-interface'

/** Remove cabeçalhos/rodapés de página e normaliza quebras antes do parse */
export function preprocessPicPayBillText(text: string): string {
  const linhas = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const limpas = linhas.filter((linha) => {
    const lower = linha.toLowerCase()

    if (/^p[aá]gina\s+\d+\s*(?:de|\/)\s*\d+/i.test(lower)) return false
    if (/^picpay\s*$/i.test(lower)) return false
    if (/^mastercard\s*[®]?\s*black/i.test(lower) && !/^\d{2}\/\d{2}/.test(linha)) return false
    if (/^vencimento\s*:/i.test(lower) && !/^\d{2}\/\d{2}/.test(linha)) return false
    if (/^limite\s+(total|dispon[ií]vel)/i.test(lower)) return false
    if (/^saldo\s+anterior/i.test(lower)) return false
    if (/^www\.picpay\.com/i.test(lower)) return false
    if (/^central\s+de\s+atendimento/i.test(lower)) return false
    if (/^ouvidoria/i.test(lower)) return false
    if (/^sac\s/i.test(lower)) return false
    if (/^\d{3,4}\s+\d{4}\s+\d{4}$/.test(linha)) return false

    return true
  })

  return limpas.join('\n')
}

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

    const textoPreparado = preprocessPicPayBillText(text)
    const linhas = textoPreparado.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    
    const vencimento = this.extrairMesAnoVencimento(textoPreparado)
    console.log(`[${this.bankName} Parser] Vencimento referência: ${vencimento.mes}/${vencimento.ano}`)

    // Processa TODAS as linhas (múltiplos blocos: Picpay Card, final 9024, final 9032, etc.)
    const linhasProcessar = linhas
    console.log(`[${this.bankName} Parser] Processando ${linhasProcessar.length} linhas (documento completo)`)

    // Padrão 0: DD/MM | Descrição | Valor (com pipes)
    const padraoComPipe = /^(\d{2}\/\d{2})\s*\|\s*(.+?)\s*\|\s*([-]?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/

    // Padrão 1: DD/MM DESCRIÇÃO VALOR (formato tradicional, com espaços)
    const padraoPrincipal = /^(\d{2}\/\d{2})\s+(.+?)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/
    
    // Padrão 2: DD/MM DESCRIÇÃO VALOR (sem espaços, formato grudado)
    // CRÍTICO: Precisa capturar PARC##/## completo antes do valor
    // Usa lookahead negativo para garantir que não captura dígitos do parcelamento como parte do valor
    const padraoGrudado = /^(\d{2}\/\d{2})(.+?)([-]?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/
    
    // Padrão 2B: DD/MM DESCRIÇÃO COM PARC grudado com valor (caso especial)
    // Exemplo: "28/10SHEIN *SHU FEPARC01/0267,90"
    // Este padrão captura especificamente quando há PARC##/## seguido imediatamente por dígitos
    // e separa corretamente o parcelamento do valor
    const padraoComParcGrudado = /^(\d{2}\/\d{2})(.+?PARC\d{1,2}\/)(\d{1,2})(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/
    
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

      // PRIORIDADE 0: formato com pipes (DD/MM | Descrição | Valor)
      match = linha.match(padraoComPipe)
      if (match) {
        dataStr = match[1]
        descricao = match[2].trim()
        valorStr = match[3]
      }

      // PRIORIDADE 1: Tenta padrão especial com PARC grudado com valor
      if (!match) {
        match = linha.match(padraoComParcGrudado)
        if (match) {
        dataStr = match[1] // "28/10"
        const descricaoComParc = match[2] // "SHEIN *SHU FEPARC01/"
        const digitoFinalParc = match[3] // "0" ou "2" (último dígito do total de parcelas)
        const valorComDigito = match[4] // "267,90" ou "67,90" (valor com possível dígito do parcelamento grudado)
        
        // Reconstrói a descrição completa com o parcelamento
        descricao = `${descricaoComParc}${digitoFinalParc}`.trim()
        
        // Verifica se o primeiro dígito do valor corresponde ao dígito do parcelamento
        const primeiroDigitoValor = valorComDigito.substring(0, 1)
        const segundoDigitoValor = valorComDigito.length > 1 ? valorComDigito.substring(1, 2) : ''
        
        // Se o valor começa com o dígito do parcelamento E tem mais dígitos depois, remove o primeiro
        if (primeiroDigitoValor === digitoFinalParc && segundoDigitoValor && /\d/.test(segundoDigitoValor)) {
          valorStr = valorComDigito.substring(1)
          console.log(`[${this.bankName} Parser] 🔧 Valor corrigido (removido dígito ${digitoFinalParc} do parcelamento): "${valorComDigito}" -> "${valorStr}"`)
        } else {
          const doisDigitosInicio = valorComDigito.substring(0, 2)
          const terceiroDigito = valorComDigito.length > 2 ? valorComDigito.substring(2, 3) : ''
          
          const parcelaMatch = descricao.match(/PARC(\d{1,2})\/(\d{1,2})/i)
          if (parcelaMatch) {
            const totalParcelas = parseInt(parcelaMatch[2])
            const totalParcelasStr = totalParcelas.toString().padStart(2, '0')
            
            if (doisDigitosInicio === totalParcelasStr && terceiroDigito && /\d/.test(terceiroDigito)) {
              valorStr = valorComDigito.substring(2)
              console.log(`[${this.bankName} Parser] 🔧 Valor corrigido (removidos dígitos ${totalParcelasStr} do parcelamento): "${valorComDigito}" -> "${valorStr}"`)
            } else {
              valorStr = valorComDigito
            }
          } else {
            valorStr = valorComDigito
          }
        }
        
        console.log(`[${this.bankName} Parser] ✅ Padrão PARC grudado detectado: descrição="${descricao.substring(0, 50)}", valor="${valorStr}"`)
        } else {
        // PRIORIDADE 2: Tenta padrão com ano primeiro (com espaços)
        match = linha.match(padraoComAno)
        if (match) {
          dataStr = match[1]
          descricao = match[2].trim()
          valorStr = match[3]
        } else {
          // PRIORIDADE 3: Tenta padrão com ano grudado
          match = linha.match(padraoComAnoGrudado)
          if (match) {
            dataStr = match[1]
            descricao = match[2].trim()
            valorStr = match[3]
          } else {
            // PRIORIDADE 4: Tenta padrão sem ano (com espaços)
            match = linha.match(padraoPrincipal)
            if (match) {
              dataStr = match[1]
              descricao = match[2].trim()
              valorStr = match[3]
            } else {
              // PRIORIDADE 5: Tenta padrão sem ano grudado
              match = linha.match(padraoGrudado)
              if (match) {
                dataStr = match[1]
                descricao = match[2].trim()
                valorStr = match[3]
                
                // VALIDAÇÃO: Se a descrição termina com números que parecem valor, pode estar capturando errado
                // Verifica se há múltiplos valores na linha e ajusta
                const valoresNaLinha = linha.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g)
                if (valoresNaLinha && valoresNaLinha.length > 1) {
                  // Se há múltiplos valores, garante que a descrição não termina com um deles
                  const ultimoValor = valoresNaLinha[valoresNaLinha.length - 1]
                  if (descricao.endsWith(ultimoValor)) {
                    // Descrição está capturando o valor, corrige
                    const indiceValor = descricao.lastIndexOf(ultimoValor)
                    descricao = descricao.substring(0, indiceValor).trim()
                    valorStr = ultimoValor
                    console.log(`[${this.bankName} Parser] 🔧 Descrição corrigida (removido valor do final): "${descricao.substring(0, 50)}"`)
                  }
                }
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
        }
      }
      
      // VALIDAÇÃO CRÍTICA: Garante que a descrição não contém o valor monetário
      // Remove qualquer valor monetário que possa ter sido capturado na descrição
      if (descricao && valorStr) {
        const valoresNaDescricao = descricao.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g)
        if (valoresNaDescricao && valoresNaDescricao.includes(valorStr)) {
          // Remove o valor da descrição se estiver presente
          const indiceValor = descricao.lastIndexOf(valorStr)
          if (indiceValor !== -1) {
            descricao = descricao.substring(0, indiceValor).trim()
            console.log(`[${this.bankName} Parser] 🔧 Valor removido da descrição: "${descricao.substring(0, 50)}"`)
          }
        }
        
        // Remove valores monetários que aparecem no final da descrição (mas não são o valor principal)
        descricao = descricao.replace(/\s+\d{1,3}(?:\.\d{3})*,\d{2}\s*$/, '').trim()
      }

      if (!match || !dataStr || !descricao || !valorStr) continue

      // LOG DETALHADO PARA DEBUG
      console.log(`[${this.bankName} Parser] 📋 Linha ${i} processada:`)
      console.log(`  - Linha completa: "${linha.substring(0, 100)}"`)
      console.log(`  - Data extraída: "${dataStr}"`)
      console.log(`  - Descrição extraída: "${descricao.substring(0, 80)}"`)
      console.log(`  - Valor extraído: "${valorStr}"`)

      // IMPORTANTE: Extrai parcelamento ANTES de qualquer processamento da descrição
      // O parcelamento pode estar grudado na descrição (ex: "SHEINPARC01/02", "ANDERSONTEIXEIPARC02/05")
      const descricaoOriginal = descricao
      
      // CRÍTICO: Extrai parcelamento da descrição, mas EVITA capturar números do valor
      // IMPORTANTE: O parcelamento deve estar na descrição, NÃO no valor
      // Para isso, extraímos parcelamento ANTES de processar o valor
      // NÃO INFERE PARCELAMENTO DO VALOR - apenas aceita padrões PARC explícitos
      let parcelamento = this.extractInstallmentsPicPay(descricaoOriginal, linha)
      
      console.log(`[${this.bankName} Parser] 📦 Parcelamento após extractInstallmentsPicPay: ${parcelamento ? `${parcelamento.current}/${parcelamento.total}` : 'null'}`)
      
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

      // CORREÇÃO CRÍTICA: NÃO remover o padrão PARC da descrição
      // O padrão PARC##/## faz parte do nome do estabelecimento e deve ser preservado
      // Exemplo: "ANDERSONTEIXEIPARC02/05" deve permanecer "ANDERSONTEIXEIPARC02/05"
      // O sufixo (X/Y) será adicionado na API route, não aqui no parser
      let descricaoLimpa = descricaoOriginal
      
      // Apenas normaliza espaços e converte para maiúsculas
      // NÃO remove parcelamento da descrição
      descricaoLimpa = descricaoLimpa
        .replace(/\s+/g, ' ') // Remove múltiplos espaços
        .trim()
        .toUpperCase()
      
      console.log(`[${this.bankName} Parser] Descrição preservada (com PARC): "${descricaoLimpa.substring(0, 50)}" (original: "${descricaoOriginal.substring(0, 50)}")`)

      // Formata data (YYYY-MM-DD literal, com ano incoerente para DD/MM)
      let data: string
      if (dataStr.includes('/')) {
        const partes = dataStr.split('/')
        if (partes.length === 3) {
          data = this.toIsoDate(parseInt(partes[2], 10), partes[1], partes[0])
        } else {
          data = this.formatDateWithBillDue(dataStr, vencimento.mesNum, vencimento.anoNum)
        }
      } else {
        data = this.formatDateWithBillDue(dataStr, vencimento.mesNum, vencimento.anoNum)
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
        
        console.log(`[${this.bankName} Parser] 🔍 Verificando correção de valor concatenado:`)
        console.log(`  - Parcelamento: ${parcelamento.current}/${parcelamento.total}`)
        console.log(`  - Valor original: R$ ${valor.toFixed(2)}`)
        console.log(`  - Valor inteiro: ${valorNumStr}`)
        console.log(`  - Valor decimal: ${valorDecimal}`)
        
        // CRITÉRIO: Se o valor tem 3+ dígitos e o primeiro(s) dígito(s) corresponde(m) ao total de parcelas
        // Aplica correção SEMPRE que houver correspondência, independente do valor
        let valorCorrigido = false
        
        if (valorNumStr.length >= 3) {
          const primeiroDigito = parseInt(valorNumStr.substring(0, 1))
          const doisPrimeirosDigitos = parseInt(valorNumStr.substring(0, 2))
          
          console.log(`  - Primeiro dígito: ${primeiroDigito}, Total parcelas: ${parcelamento.total}`)
          console.log(`  - Dois primeiros dígitos: ${doisPrimeirosDigitos}`)
          
          // CRITÉRIO 1: Primeiro dígito corresponde ao total (1-9 parcelas)
          if (primeiroDigito === parcelamento.total && primeiroDigito <= 9) {
            const valorRestante = valorNumStr.substring(1)
            const novoValorStr = `${valorRestante},${valorDecimal}`
            const novoValor = this.parseMonetaryValue(novoValorStr)
            
            console.log(`  - Tentativa correção 1 dígito: "${valorRestante},${valorDecimal}" = R$ ${novoValor.toFixed(2)}`)
            
            // Valida: novo valor deve ser razoável (< 1000) e menor que o original
            if (novoValor > 0 && novoValor < valor && novoValor < 1000) {
              console.log(`[${this.bankName} Parser] ✅ Valor corrigido (PARC${parcelamento.current}/${parcelamento.total}): R$ ${valor.toFixed(2)} -> R$ ${novoValor.toFixed(2)} (removido dígito ${primeiroDigito})`)
              valor = novoValor
              valorStr = novoValorStr
              valorCorrigido = true
            } else {
              console.log(`  - Correção rejeitada: novo valor ${novoValor.toFixed(2)} não atende critérios`)
            }
          } 
          // CRITÉRIO 2: Dois primeiros dígitos correspondem ao total (10-99 parcelas)
          else if (doisPrimeirosDigitos === parcelamento.total && doisPrimeirosDigitos >= 10 && valorNumStr.length >= 4) {
            const valorRestante = valorNumStr.substring(2)
            const novoValorStr = `${valorRestante},${valorDecimal}`
            const novoValor = this.parseMonetaryValue(novoValorStr)
            
            console.log(`  - Tentativa correção 2 dígitos: "${valorRestante},${valorDecimal}" = R$ ${novoValor.toFixed(2)}`)
            
            // Valida: novo valor deve ser razoável (< 1000) e menor que o original
            if (novoValor > 0 && novoValor < valor && novoValor < 1000) {
              console.log(`[${this.bankName} Parser] ✅ Valor corrigido (PARC${parcelamento.current}/${parcelamento.total}): R$ ${valor.toFixed(2)} -> R$ ${novoValor.toFixed(2)} (removidos dígitos ${doisPrimeirosDigitos})`)
              valor = novoValor
              valorStr = novoValorStr
              valorCorrigido = true
            } else {
              console.log(`  - Correção rejeitada: novo valor ${novoValor.toFixed(2)} não atende critérios`)
            }
          } else {
            console.log(`  - Não há correspondência: primeiro dígito=${primeiroDigito}, dois primeiros=${doisPrimeirosDigitos}, total=${parcelamento.total}`)
          }
        }
        
        // Log se não foi possível corrigir mas o valor parece alto
        if (!valorCorrigido && valor > 500 && parcelamento.total > 1) {
          console.log(`[${this.bankName} Parser] ⚠️ Valor alto para parcela ${parcelamento.current}/${parcelamento.total}: R$ ${valor.toFixed(2)} (não foi possível corrigir automaticamente)`)
        }
      } else {
        console.log(`[${this.bankName} Parser] ℹ️ Sem parcelamento encontrado, valor não será corrigido`)
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

      // Normaliza texto final (remove acentos, etc) mas mantém PARC na descrição
      descricaoLimpa = this.normalizeText(descricaoLimpa)
      
      // Validação final: descrição deve ter pelo menos 3 caracteres
      if (descricaoLimpa.length < 3) {
        console.log(`[${this.bankName} Parser] ⚠️ Descrição muito curta: "${descricaoLimpa}" (original: "${descricaoOriginal.substring(0, 50)}")`)
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
    console.log(`[${this.bankName} Parser] 🔍 extractInstallmentsPicPay chamado:`)
    console.log(`  - Descrição recebida: "${description.substring(0, 80)}"`)
    console.log(`  - Linha completa: "${linhaCompleta.substring(0, 100)}"`)
    
    // CRÍTICO: Para PicPay, APENAS aceita padrões explícitos PARCXX/YY
    // NÃO usa this.extractInstallments() que pode usar padrões genéricos
    
    // PRIMEIRO: Identifica o valor na linha completa para excluir da busca de parcelamento
    const valoresNaLinha = linhaCompleta.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g)
    let descricaoParaBuscar = description.trim()
    
    // Remove o valor da descrição se estiver presente
    if (valoresNaLinha && valoresNaLinha.length > 0) {
      const ultimoValor = valoresNaLinha[valoresNaLinha.length - 1]
      
      // Se a descrição termina com o valor, remove-o
      if (descricaoParaBuscar.endsWith(ultimoValor)) {
        descricaoParaBuscar = descricaoParaBuscar.substring(0, descricaoParaBuscar.length - ultimoValor.length).trim()
        console.log(`  - Valor removido da descrição: "${descricaoParaBuscar.substring(0, 80)}"`)
      }
      
      // Remove qualquer valor monetário do final da descrição
      descricaoParaBuscar = descricaoParaBuscar.replace(/\s+\d{1,3}(?:\.\d{3})*,\d{2}\s*$/, '').trim()
    }
    
    const descricaoLimpa = descricaoParaBuscar.toUpperCase()
    console.log(`  - Descrição limpa para busca: "${descricaoLimpa.substring(0, 80)}"`)
    
    // Padrão único e específico: PARC seguido de 1-2 dígitos, barra, 1-2 dígitos
    // Exemplo: "SHEINPARC01/02", "EC *LPARC03/05", "ANDERSONTEIXEIPARC02/05"
    // IMPORTANTE: Busca APENAS o padrão PARC, não aceita outros formatos
    // Busca case-insensitive para garantir que encontra mesmo se estiver em minúsculas
    // CRÍTICO: Tenta primeiro com word boundary, depois sem (para casos grudados)
    let parcelaMatch = descricaoLimpa.match(/\bPARC(\d{1,2})\/(\d{1,2})\b/i)
    
    // Se não encontrou com word boundary, tenta sem (para casos como "ANDERSONTEIXEIPARC02/05")
    if (!parcelaMatch) {
      parcelaMatch = descricaoLimpa.match(/PARC(\d{1,2})\/(\d{1,2})/i)
      if (parcelaMatch) {
        console.log(`  - Match encontrado sem word boundary: PARC${parcelaMatch[1]}/${parcelaMatch[2]}`)
      }
    }
    
    if (parcelaMatch) {
      const current = parseInt(parcelaMatch[1])
      const total = parseInt(parcelaMatch[2])
      
      console.log(`  - Match encontrado: PARC${current}/${total}`)
      
      // Validação rigorosa
      if (current > 0 && total > 0 && current <= total && total <= 99 && current <= 99) {
        // VALIDAÇÃO CRÍTICA: Verifica se não está capturando números do valor
        // Extrai o valor da linha completa para comparar
        if (valoresNaLinha && valoresNaLinha.length > 0) {
          const ultimoValor = valoresNaLinha[valoresNaLinha.length - 1]
          const valorNumero = this.parseMonetaryValue(ultimoValor)
          const valorInteiro = Math.floor(valorNumero).toString()
          
          console.log(`  - Valor da linha: R$ ${valorNumero.toFixed(2)} (inteiro: ${valorInteiro})`)
          
          // CRÍTICO: Validação rigorosa para evitar falsos positivos
          // Se o total ou current aparecem como número completo no início do valor, descarta
          // Exemplo: total=57 e valor=576,00 -> descarta (57 está no início de 576)
          // Exemplo: total=5 e valor=576,00 -> pode ser válido (5 é parte normal de 576)
          // VALIDAÇÃO ADICIONAL: Se current == total, é suspeito (ex: 57/57)
          if (current === total && current >= 10) {
            console.log(`[${this.bankName} Parser] ❌ Parcelamento ${current}/${total} DESCARTADO: current igual ao total (suspeito de ser falso positivo)`)
            return null
          }
          
          if (valorInteiro.length >= 3) {
            const doisPrimeirosDigitos = valorInteiro.substring(0, 2)
            const tresPrimeirosDigitos = valorInteiro.length >= 4 ? valorInteiro.substring(0, 3) : null
            
            // VALIDAÇÃO CRÍTICA: Se o total de 2 dígitos aparece no início do valor, é falso positivo
            // Exemplo: total=57 aparece no início de 576,00
            if (total >= 10 && doisPrimeirosDigitos === total.toString().padStart(2, '0')) {
              console.log(`[${this.bankName} Parser] ❌ Parcelamento ${current}/${total} DESCARTADO: total ${total} aparece no início do valor ${valorNumero.toFixed(2)}`)
              return null
            }
            
            // VALIDAÇÃO CRÍTICA: Se o current de 2 dígitos aparece no início do valor, é falso positivo
            // Exemplo: current=57 aparece no início de 576,00
            if (current >= 10 && doisPrimeirosDigitos === current.toString().padStart(2, '0')) {
              console.log(`[${this.bankName} Parser] ❌ Parcelamento ${current}/${total} DESCARTADO: current ${current} aparece no início do valor ${valorNumero.toFixed(2)}`)
              return null
            }
            
            // VALIDAÇÃO CRÍTICA: Se ambos current e total aparecem no valor (ex: 57/57 de 576,00)
            // Isso é um forte indicador de falso positivo
            if (current >= 10 && total >= 10 && 
                doisPrimeirosDigitos === current.toString().padStart(2, '0') &&
                doisPrimeirosDigitos === total.toString().padStart(2, '0')) {
              console.log(`[${this.bankName} Parser] ❌ Parcelamento ${current}/${total} DESCARTADO: ambos current e total aparecem no valor ${valorNumero.toFixed(2)}`)
              return null
            }
            
            // Se o total de 3 dígitos aparece no início do valor, é falso positivo
            if (total >= 100 && tresPrimeirosDigitos && tresPrimeirosDigitos === total.toString().padStart(3, '0')) {
              console.log(`[${this.bankName} Parser] ❌ Parcelamento ${current}/${total} DESCARTADO: total ${total} aparece no início do valor ${valorNumero.toFixed(2)}`)
              return null
            }
          }
          
          // VALIDAÇÃO ADICIONAL: Parcelamento muito alto (ex: 57/57) é suspeito
          // Parcelamentos normais geralmente não passam de 24 parcelas
          if (total > 24) {
            console.log(`[${this.bankName} Parser] ⚠️ Parcelamento ${current}/${total} suspeito: total muito alto (acima de 24 parcelas)`)
            // Não descarta automaticamente, mas loga como suspeito
          }
        }
        
        console.log(`[${this.bankName} Parser] ✅ Parcelamento VÁLIDO encontrado via PARC: ${current}/${total}`)
        return { current, total }
      } else {
        console.log(`[${this.bankName} Parser] ❌ Parcelamento ${current}/${total} INVÁLIDO (validação falhou)`)
      }
    } else {
      console.log(`[${this.bankName} Parser] ❌ Nenhum padrão PARC encontrado na descrição`)
    }
    
    // Se não encontrou padrão PARC explícito, retorna null
    // NÃO tenta padrões genéricos para evitar falsos positivos
    return null
  }

  private extrairMesAnoVencimento(text: string): {
    mes: string
    ano: string
    mesNum: number
    anoNum: number
  } {
    const vencimentoMatch = text.match(/vencimento[:\s]*(\d{2})\/(\d{2})\/(\d{4})/i)
    if (vencimentoMatch) {
      return {
        mes: vencimentoMatch[2],
        ano: vencimentoMatch[3],
        mesNum: parseInt(vencimentoMatch[2], 10),
        anoNum: parseInt(vencimentoMatch[3], 10),
      }
    }

    const yearMatch = text.match(/\b(20\d{2})\b/)
    const anoNum = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear()
    const mesNum = new Date().getMonth() + 1

    return {
      mes: String(mesNum).padStart(2, '0'),
      ano: String(anoNum),
      mesNum,
      anoNum,
    }
  }

  private deveIgnorarLinha(linha: string): boolean {
    if (/^\d{2}\/\d{2}/.test(linha)) {
      return false
    }

    const linhaLower = linha.toLowerCase().trim()

    if (
      (linhaLower.includes('data') && linhaLower.includes('estabelecimento')) ||
      linhaLower.includes('resumo da fatura') ||
      /^total da fatura\b/.test(linhaLower) ||
      /^vencimento\s*:/.test(linhaLower) ||
      /^picpay card\b/.test(linhaLower) ||
      /^transa[cç][oõ]es\s+(nacionais|internacionais)\b/.test(linhaLower) ||
      /^despesas do m[eê]s\b/.test(linhaLower) ||
      /^pagamento de fatura\b/.test(linhaLower) ||
      /^cr[eé]ditos\b/.test(linhaLower)
    ) {
      return true
    }

    return false
  }
}

