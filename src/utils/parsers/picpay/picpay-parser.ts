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
      
      // CRÍTICO: Verifica se há parcelamento parcial (PARCXX/0) e tenta encontrar o dígito completo
      // Isso acontece quando o PDF corta o segundo dígito do total de parcelas
      let parcelamento = this.extractInstallments(descricaoOriginal)
      
      // Se encontrou parcelamento parcial (termina com /0), tenta encontrar o dígito completo
      // Verificando a linha atual e próximas linhas
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
          
          // Se ainda não encontrou, tenta inferir do valor concatenado
          // VALIDAÇÃO CRÍTICA: O valor pode estar concatenado com o total de parcelas
          // IMPORTANTE: Esta inferência só deve ser feita quando há EVIDÊNCIA CLARA (valor suspeitamente alto)
          // Padrão identificado nos logs do usuário:
          // - R$ 511.89 = 5 (total) + 11.89 (valor) para PARC01/05
          // - R$ 267.90 = 2 (total) + 67.90 (valor) para PARC01/02
          // - R$ 576.00 = 5 (total) + 76.00 (valor) para PARC02/05
          // - R$ 559.45 = 5 (total) + 59.45 (valor) para PARC03/05
          // - R$ 379.22 = 3 (total) + 79.22 (valor) para PARC03/03
          
          let totalFoiInferidoDoValor = false // Flag para rastrear se foi inferido
          
          if (!totalParcelas) {
            const valorExtraido = this.parseMonetaryValue(valorStr)
            const valorStrLimpo = valorStr.trim().replace(/[^\d.,-]/g, '')
            const valorInteiro = Math.floor(valorExtraido).toString()
            const valorDecimal = valorStrLimpo.split(',')[1] || '00'
            
            // CRITÉRIO RESTRITIVO: Só tenta inferir se o valor for suspeitamente alto (> 200)
            // Isso evita inferir incorretamente de valores normais
            if (valorInteiro.length >= 3 && valorExtraido > 200 && valorExtraido < 1000) {
              // Tenta primeiro dígito (1-9) como total de parcelas
              const primeiroDigito = parseInt(valorInteiro.substring(0, 1))
              if (primeiroDigito >= parcelaAtual && primeiroDigito <= 99) {
                // Reconstrói o valor removendo o primeiro dígito
                const valorRestanteStr = valorInteiro.substring(1) + ',' + valorDecimal
                const valorRestante = this.parseMonetaryValue(valorRestanteStr)
                
                // Valida: o valor restante deve ser razoável e significativamente menor
                if (valorRestante > 0 && valorRestante < valorExtraido && valorRestante < 500 && (valorExtraido - valorRestante) > 50) {
                  totalParcelas = primeiroDigito
                  totalFoiInferidoDoValor = true
                  console.log(`[${this.bankName} Parser] 🔍 Total inferido do valor (1 dígito): ${totalParcelas} (valor seria R$ ${valorRestante.toFixed(2)})`)
                }
              }
              
              // Se não funcionou, tenta dois dígitos (10-99) como total de parcelas
              if (!totalParcelas && valorInteiro.length >= 4) {
                const doisPrimeirosDigitos = parseInt(valorInteiro.substring(0, 2))
                if (doisPrimeirosDigitos >= parcelaAtual && doisPrimeirosDigitos <= 99) {
                  const valorRestanteStr = valorInteiro.substring(2) + ',' + valorDecimal
                  const valorRestante = this.parseMonetaryValue(valorRestanteStr)
                  
                  // Valida: o valor restante deve ser razoável e significativamente menor
                  if (valorRestante > 0 && valorRestante < valorExtraido && valorRestante < 500 && (valorExtraido - valorRestante) > 50) {
                    totalParcelas = doisPrimeirosDigitos
                    totalFoiInferidoDoValor = true
                    console.log(`[${this.bankName} Parser] 🔍 Total inferido do valor (2 dígitos): ${totalParcelas} (valor seria R$ ${valorRestante.toFixed(2)})`)
                  }
                }
              }
            }
          }
          
          if (totalParcelas && totalParcelas >= parcelaAtual) {
            parcelamento = { current: parcelaAtual, total: totalParcelas }
            console.log(`[${this.bankName} Parser] ✅ Parcelamento corrigido de PARC${parcelaAtual}/0 para ${parcelaAtual}/${totalParcelas}`)
            
            // CORREÇÃO CRÍTICA: Se o total foi INFERIDO DO VALOR, corrige o valor também
            // IMPORTANTE: Só corrige se o totalParcelas foi inferido do valor
            // Se foi encontrado em linha separada, NÃO corrige o valor (já está correto)
            
            if (totalFoiInferidoDoValor) {
              const valorExtraido = this.parseMonetaryValue(valorStr)
              const valorStrLimpo = valorStr.trim().replace(/[^\d.,-]/g, '')
              const valorInteiro = Math.floor(valorExtraido).toString()
              const valorDecimal = valorStrLimpo.split(',')[1] || '00'
              
              if (valorInteiro.length >= 3) {
                const primeiroDigito = parseInt(valorInteiro.substring(0, 1))
                const doisPrimeirosDigitos = parseInt(valorInteiro.substring(0, 2))
                
                // Se o primeiro dígito corresponde EXATAMENTE ao total
                if (primeiroDigito === totalParcelas) {
                  const valorRestanteStr = valorInteiro.substring(1) + ',' + valorDecimal
                  const valorRestante = this.parseMonetaryValue(valorRestanteStr)
                  
                  // Valida: diferença significativa e valor resultante razoável
                  if (valorRestante > 0 && valorRestante < valorExtraido && valorRestante < 500 && (valorExtraido - valorRestante) > 50) {
                    valorStr = valorRestanteStr
                    console.log(`[${this.bankName} Parser] 🔧 Valor corrigido junto com parcelamento (inferido do valor): R$ ${valorExtraido.toFixed(2)} -> R$ ${valorRestante.toFixed(2)}`)
                  }
                } 
                // Se os dois primeiros dígitos correspondem ao total (10-99)
                else if (doisPrimeirosDigitos === totalParcelas && doisPrimeirosDigitos >= 10 && valorInteiro.length >= 4) {
                  const valorRestanteStr = valorInteiro.substring(2) + ',' + valorDecimal
                  const valorRestante = this.parseMonetaryValue(valorRestanteStr)
                  
                  // Valida: diferença significativa e valor resultante razoável
                  if (valorRestante > 0 && valorRestante < valorExtraido && valorRestante < 500 && (valorExtraido - valorRestante) > 50) {
                    valorStr = valorRestanteStr
                    console.log(`[${this.bankName} Parser] 🔧 Valor corrigido junto com parcelamento (inferido do valor): R$ ${valorExtraido.toFixed(2)} -> R$ ${valorRestante.toFixed(2)}`)
                  }
                }
              }
            } else {
              console.log(`[${this.bankName} Parser] ℹ️ Total de parcelas encontrado em linha separada ou valor não suspeito, valor não será corrigido automaticamente`)
            }
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

      // CORREÇÃO CRÍTICA: Se há parcelamento e o valor parece estar concatenado,
      // tenta extrair o valor real da parcela
      // IMPORTANTE: Esta correção só deve ser aplicada quando há EVIDÊNCIA CLARA de concatenação
      // Exemplo: R$ 511.89 para PARC01/05 pode ser 5 (total) + 11.89 (valor real)
      // Mas NÃO deve ser aplicada para valores normais como R$ 67,90
      
      // A correção só é aplicada se:
      // 1. O valor é suspeitamente alto (> 200) para uma parcela comum
      // 2. OU o primeiro(s) dígito(s) corresponde(m) EXATAMENTE ao total de parcelas
      // 3. E o valor resultante após remoção é razoável
      
      if (parcelamento && parcelamento.total > 0 && parcelamento.total <= 99) {
        const valorOriginal = valor
        const valorNumStr = Math.floor(valor).toString()
        const valorDecimal = valorStrLimpo.split(',')[1] || '00'
        
        // CRITÉRIO 1: Valor suspeitamente alto (pode indicar concatenação)
        // Só aplica correção se o valor for > 200 e tiver pelo menos 3 dígitos
        const valorSuspeito = valor > 200 && valorNumStr.length >= 3
        
        if (valorSuspeito) {
          const primeiroDigito = parseInt(valorNumStr.substring(0, 1))
          const doisPrimeirosDigitos = parseInt(valorNumStr.substring(0, 2))
          
          // CRITÉRIO 2: Verifica se o primeiro dígito corresponde EXATAMENTE ao total de parcelas
          // E o valor resultante seria razoável
          if (primeiroDigito === parcelamento.total && valorNumStr.length >= 3) {
            const valorRestante = valorNumStr.substring(1)
            const novoValorStr = `${valorRestante},${valorDecimal}`
            const novoValor = this.parseMonetaryValue(novoValorStr)
            
            // CRITÉRIO 3: Valida que o novo valor é razoável e significativamente menor
            if (novoValor > 0 && novoValor < valor && novoValor < 500 && (valor - novoValor) > 50) {
              console.log(`[${this.bankName} Parser] 🔧 Valor corrigido (concatenação confirmada): R$ ${valor.toFixed(2)} -> R$ ${novoValor.toFixed(2)} (removido dígito ${primeiroDigito} = total ${parcelamento.total})`)
              valor = novoValor
              valorStr = novoValorStr
            }
          } 
          // CRITÉRIO 2B: Verifica se os dois primeiros dígitos correspondem ao total (10-99)
          else if (doisPrimeirosDigitos === parcelamento.total && doisPrimeirosDigitos >= 10 && valorNumStr.length >= 4) {
            const valorRestante = valorNumStr.substring(2)
            const novoValorStr = `${valorRestante},${valorDecimal}`
            const novoValor = this.parseMonetaryValue(novoValorStr)
            
            // CRITÉRIO 3: Valida que o novo valor é razoável e significativamente menor
            if (novoValor > 0 && novoValor < valor && novoValor < 500 && (valor - novoValor) > 50) {
              console.log(`[${this.bankName} Parser] 🔧 Valor corrigido (concatenação confirmada): R$ ${valor.toFixed(2)} -> R$ ${novoValor.toFixed(2)} (removidos dígitos ${doisPrimeirosDigitos} = total ${parcelamento.total})`)
              valor = novoValor
              valorStr = novoValorStr
            }
          } else {
            // Se não há correspondência exata, NÃO aplica correção automática
            // Isso evita remover dígitos de valores corretos
            console.log(`[${this.bankName} Parser] ℹ️ Valor ${valor.toFixed(2)} não parece estar concatenado (total parcelas: ${parcelamento.total}, primeiro dígito: ${primeiroDigito})`)
          }
        }
        
        // Validação: se o valor final parece muito alto para uma parcela, apenas loga
        // NÃO aplica correção automática sem evidência clara
        if (valor > 500 && parcelamento.total > 1) {
          console.log(`[${this.bankName} Parser] ⚠️ Valor alto para parcela ${parcelamento.current}/${parcelamento.total}: R$ ${valor.toFixed(2)} (valor original: R$ ${valorOriginal.toFixed(2)})`)
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

