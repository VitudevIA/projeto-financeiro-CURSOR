/**
 * Parser otimizado para faturas de cartão PicPay
 * Suporta múltiplos cartões e diferentes formatos
 * Versão TypeScript adaptada para Next.js
 */

import { ExtractedTransaction } from './pdf-parser'

export interface PicPayTransaction {
  data: string // YYYY-MM-DD
  descricao: string
  valor: number
  tipo: 'despesa' | 'receita'
  categoria: string
  parcelamento: {
    parcelaAtual: number
    totalParcelas: number
  } | null
  observacao: string | null
}

export class PicPayPDFParser {
  /**
   * Valida se o PDF é uma fatura do PicPay
   */
  validarFaturaPicPay(texto: string): boolean {
    const indicadores = [
      'picpay',
      'mastercard',
      'transações nacionais',
      'estabelecimento',
      'total da fatura',
      'resumo da fatura',
      'extrato',
    ]

    const textoLower = texto.toLowerCase()
    return indicadores.some((indicador) => textoLower.includes(indicador))
  }

  /**
   * Extrai todas as transações do texto do PDF
   * Formatos suportados:
   * - 07/10 PAGAMENTO DE FATURA PELO PICPA -2.377,77
   * - 30/10 JUROS CREDITO ROTATIVO 29,64
   * - 01/10 WELLHUB GYMPASS BR GYM 89,90
   * - 15/10 SHEIN PARC01/05 150,50
   */
  extrairTransacoes(texto: string): ExtractedTransaction[] {
    const transacoes: ExtractedTransaction[] = []
    const linhas = texto.split('\n').filter((linha) => linha.trim().length > 0)

    console.log(`[PicPay Parser] Processando ${linhas.length} linhas do PDF`)
    
    // Log de amostras de linhas para debug
    console.log('[PicPay Parser] Primeiras 20 linhas do texto:')
    linhas.slice(0, 20).forEach((linha, idx) => {
      console.log(`[PicPay Parser] Linha ${idx}: "${linha.substring(0, 100)}"`)
    })
    
    // Procurar por linhas que parecem transações
    console.log('[PicPay Parser] Procurando linhas que parecem transações (formato DD/MM)...')
    const linhasComData = linhas.filter(linha => /^\d{2}\/\d{2}/.test(linha.trim()))
    console.log(`[PicPay Parser] Encontradas ${linhasComData.length} linhas que começam com data (DD/MM)`)
    if (linhasComData.length > 0) {
      console.log('[PicPay Parser] Primeiras 10 linhas com data:')
      linhasComData.slice(0, 10).forEach((linha, idx) => {
        console.log(`[PicPay Parser] Linha com data ${idx + 1}: "${linha.substring(0, 100)}"`)
      })
    }

    // Padrão PRINCIPAL otimizado para PicPay
    // Formato: DD/MM DESCRIÇÃO VALOR
    // Suporta valores negativos, espaços variáveis (incluindo múltiplos), e parcelamento
    // Exemplo: "07/10 PAGAMENTO DE FATURA PELO PICPA -2.377,77"
    // Usa \s* para aceitar zero ou mais espaços entre campos (suporta formatos grudados)
    const padraoPrincipal = /^(\d{2}\/\d{2})\s*(.+?)\s+([-]?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/

    // Padrão com parcelamento explícito
    // Exemplo: "15/10 SHEIN PARC01/05 150,50" ou "15/10SHEINPARC01/05150,50"
    const padraoComParcela = /^(\d{2}\/\d{2})\s*(.+?PARC\d{1,2}\/\d{1,2})\s*([-]?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/

    // Padrão mais flexível: aceita formatos grudados (sem espaços)
    // Exemplo: "30/10JUROS CREDITO ROTATIVO29,64" ou "07/10PAGAMENTO-2.377,77"
    const padraoAlternativo = /^(\d{2}\/\d{2})\s*(.+?)([-]?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/
    
    // Padrão de fallback: mais permissivo, tenta encontrar data no início e valor no final
    // Aceita formatos sem espaços entre campos
    const padraoFallback = /^(\d{2}\/\d{2})\s*(.+?)([-]?[\d.,]+)\s*$/

    for (let i = 0; i < linhas.length; i++) {
      let linha = linhas[i].trim()

      // Ignorar linhas vazias e muito curtas
      if (!linha || linha.length < 10) continue

      // Ignorar cabeçalhos e rodapés
      if (
        linha.includes('Data') &&
        (linha.includes('Estabelecimento') || linha.includes('Descrição') || linha.includes('Valor'))
      ) {
        console.log(`[PicPay Parser] Pulando cabeçalho: ${linha.substring(0, 50)}`)
        continue
      }
      
      if (
        linha.match(/^(FATURA|RESUMO|CARTÃO|VENCIMENTO|TOTAL|SALDO|PÁGINA|SUBTOTAL)/i)
      ) {
        continue
      }

      // Normalizar espaços múltiplos para facilitar parsing
      // MAS preserva a linha original para parsing manual (que precisa detectar formatos sem espaços)
      const linhaOriginal = linha
      linha = linha.replace(/\s+/g, ' ').trim()

      // Método manual SEMPRE PRIMEIRO (mais confiável que regex para descrições)
      // Este método garante que capturamos a descrição completa sem truncamento
      // Funciona mesmo quando regex falha por causa de espaços variáveis ou formatos grudados
      let match: RegExpMatchArray | null = null
      let data = ''
      let descricao = ''
      let valorStr = ''
      
      // Método manual: busca data no início e valor no final
      // IMPORTANTE: Aceita data COM ou SEM espaço após ela (formato grudado)
      // Exemplos: "07/10PAGAMENTO" ou "07/10 PAGAMENTO"
      const dataMatchManual = linhaOriginal.match(/^(\d{2}\/\d{2})(\s*)/)
      if (dataMatchManual) {
        const dataTemp = dataMatchManual[1]
        
        // Encontra valor no final da linha (pode ter sinal negativo e pode estar grudado)
        // IMPORTANTE: Precisa evitar capturar números que fazem parte do parcelamento (ex: "05" em "PARC01/05")
        // Procura por padrões de valor monetário:
        // - No final da linha: "29,64" ou "-2.377,77"
        // - Grudado à descrição: "ROTATIVO29,64" ou "PICPA-2.377,77"
        // - Com ou sem espaço antes: "ROTATIVO 29,64" ou "ROTATIVO29,64"
        
        // CRÍTICO: Primeiro, identifica se há parcelamento na linha para evitar confusão
        // Procura por padrão PARC seguido de números (ex: PARC01/05)
        const parcelamentoMatch = linhaOriginal.match(/PARC\s*(\d{1,2})\s*\/\s*(\d{1,2})/i)
        const posicaoParcelamento = parcelamentoMatch ? (parcelamentoMatch.index || 0) + parcelamentoMatch[0].length : -1
        
        // Primeiro tenta encontrar valor no final da linha (com ou sem espaço)
        // Garante que não está capturando parte do parcelamento
        let valorMatch = linhaOriginal.match(/([-]?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/)
        
        // Valida se o valor encontrado não está dentro do parcelamento
        if (valorMatch && valorMatch.index !== undefined) {
          // Se o parcelamento existe e o valor está antes ou dentro dele, descarta
          if (posicaoParcelamento > 0 && valorMatch.index < posicaoParcelamento + 10) {
            valorMatch = null
          }
        }
        
        // Se não encontrar no final, procura por qualquer valor monetário na linha
        // Mas evita valores que estejam dentro ou próximos do parcelamento
        if (!valorMatch) {
          const valoresNaLinha = [...linhaOriginal.matchAll(/([-]?\d{1,3}(?:\.\d{3})*,\d{2})/g)]
          if (valoresNaLinha && valoresNaLinha.length > 0) {
            // Procura do final para o início, pegando o primeiro que não seja parte do parcelamento
            for (let j = valoresNaLinha.length - 1; j >= 0; j--) {
              const match = valoresNaLinha[j]
              if (match && match.index !== undefined) {
                // Se não há parcelamento ou o valor está bem depois do parcelamento, usa este
                if (posicaoParcelamento < 0 || match.index > posicaoParcelamento + 15) {
                  // Verifica se está no final da linha (com margem de até 5 caracteres)
                  const posicaoFinal = linhaOriginal.length - match[0].length
                  if (match.index >= posicaoFinal - 5) {
                    valorMatch = [match[0]]
                    break
                  }
                }
              }
            }
          }
        }
        
        // Se ainda não encontrou, tenta padrão mais flexível: qualquer valor monetário no final
        if (!valorMatch) {
          const valoresNaLinha = linhaOriginal.match(/([-]?\d{1,3}(?:\.\d{3})*,\d{2})/g)
          if (valoresNaLinha && valoresNaLinha.length > 0) {
            const ultimoValor = valoresNaLinha[valoresNaLinha.length - 1]
            // Valida que não está dentro do parcelamento
            const ultimoIndex = linhaOriginal.lastIndexOf(ultimoValor)
            if (posicaoParcelamento < 0 || ultimoIndex > posicaoParcelamento + 15) {
              valorMatch = [ultimoValor]
            }
          }
        }
        
        if (valorMatch) {
          const valorStrTemp = valorMatch[0] // Pega o valor encontrado
          
          // Descrição é TUDO entre a data e o valor (incluindo parcelamento COMPLETO)
          // Calcula o início: data + espaço opcional
          const inicioData = dataMatchManual[0].length // Tamanho de "DD/MM" + espaço opcional
          
          // Encontra a posição do valor na linha ORIGINAL (não normalizada)
          // IMPORTANTE: Usa lastIndexOf para pegar a última ocorrência (caso o valor apareça na descrição também)
          // Mas precisa garantir que não está pegando um valor que faz parte do parcelamento
          let valorIndex = -1
          
          // Procura o valor do final para o início, garantindo que não seja parte do parcelamento
          let posicaoBusca = linhaOriginal.length
          while (true) {
            const indexEncontrado = linhaOriginal.lastIndexOf(valorStrTemp, posicaoBusca)
            if (indexEncontrado < 0) break
            
            // Verifica se não está dentro ou muito próximo do parcelamento
            if (posicaoParcelamento < 0 || indexEncontrado > posicaoParcelamento + 10) {
              valorIndex = indexEncontrado
              break
            }
            
            // Continua procurando antes desta posição
            posicaoBusca = indexEncontrado - 1
            if (posicaoBusca < inicioData) break
          }
          
          // Se não encontrou valor válido, usa o último índice encontrado como fallback
          if (valorIndex < 0) {
            valorIndex = linhaOriginal.lastIndexOf(valorStrTemp)
          }
          
          // Se o valor está grudado (sem espaço antes), precisa remover o valor da descrição
          // Exemplo: "ROTATIVO29,64" -> descrição deve ser "ROTATIVO" (sem o "29,64")
          // Verifica se há caractere alfanumérico antes do valor (indicando que está grudado)
          if (valorIndex > 0) {
            const charAntes = linhaOriginal[valorIndex - 1]
            // Se não é espaço e não é sinal de menos, o valor está grudado à descrição
            if (charAntes && charAntes !== ' ' && charAntes !== '-' && /[A-Za-z0-9]/.test(charAntes)) {
              // Remove o valor da descrição (já está grudado, então o índice é o início do valor)
              // Não precisa ajustar, pois valorIndex já aponta para o início do valor
            }
          }
          
          const fimValor = valorIndex >= 0 ? valorIndex : linhaOriginal.length
          
          // Extrai descrição da linha ORIGINAL para preservar formatação COMPLETA
          // IMPORTANTE: Preserva o parcelamento completo (ex: PARC01/05, não PARC01/0)
          let descricaoTemp = linhaOriginal.substring(inicioData, fimValor)
            .replace(/^\s+/, '') // Remove espaços iniciais
            .replace(/\s+$/, '') // Remove espaços finais
            .replace(/\s+/g, ' ') // Normaliza espaços múltiplos
            .trim()
          
          // Se a descrição termina com o valor grudado, remove-o
          // Isso pode acontecer se o lastIndexOf não funcionou corretamente
          if (descricaoTemp.endsWith(valorStrTemp)) {
            descricaoTemp = descricaoTemp.substring(0, descricaoTemp.length - valorStrTemp.length).trim()
          }
          
          // VALIDAÇÃO CRÍTICA: Garante que parcelamento completo está preservado
          // Se a descrição contém "PARC" mas termina com "/0" ou "/", pode estar incompleta
          if (descricaoTemp.match(/PARC.*\/\d?\s*$/i) && !descricaoTemp.match(/PARC.*\/\d{1,2}\s*$/i)) {
            // Tenta encontrar o parcelamento completo na linha original
            const parcelamentoCompleto = linhaOriginal.match(/PARC\s*(\d{1,2})\s*\/\s*(\d{1,2})/i)
            if (parcelamentoCompleto) {
              // Substitui o parcelamento incompleto pelo completo na descrição
              descricaoTemp = descricaoTemp.replace(/PARC.*\/\d?\s*$/i, parcelamentoCompleto[0])
            }
          }
          
          // Só considera válido se temos os 3 componentes e descrição tem tamanho mínimo
          if (dataTemp && descricaoTemp && descricaoTemp.length >= 3 && valorStrTemp) {
            // Método manual sempre tem prioridade sobre regex (mais confiável)
            data = dataTemp
            descricao = descricaoTemp
            valorStr = valorStrTemp
            match = [linhaOriginal, data, descricao, valorStr] as any
            console.log(`[PicPay Parser] ✅ Extraído via método manual (linha ${i}): "${descricao.substring(0, 60)}..." | Valor: ${valorStrTemp}`)
          } else {
            // Debug: mostrar por que não extraiu
            if (i < 20) {
              console.log(`[PicPay Parser] ⚠️ Método manual não extraiu (linha ${i}): data="${dataTemp}", desc="${descricaoTemp?.substring(0, 40)}" (${descricaoTemp?.length} chars), valor="${valorStrTemp}"`)
            }
          }
        } else {
          // Debug: mostrar linhas com data mas sem valor
          if (i < 20) {
            console.log(`[PicPay Parser] ⚠️ Linha ${i} tem data mas não tem valor válido: "${linhaOriginal.substring(0, 100)}"`)
          }
        }
      }
      
      // Fallback: Tentar match com diferentes padrões regex (apenas se método manual falhou)
      if (!match) {
        // 1. Tenta padrão com parcelamento primeiro
        match = linha.match(padraoComParcela)
        
        // 2. Tenta padrão principal (mais comum - formato padrão PicPay)
        if (!match) {
          match = linha.match(padraoPrincipal)
        }
        
        // 3. Tenta padrão alternativo (mais flexível com formatos de valor)
        if (!match) {
          match = linha.match(padraoAlternativo)
        }
        
        // 4. Última tentativa: padrão fallback muito permissivo
        if (!match) {
          match = linha.match(padraoFallback)
        }
        
        if (match) {
          console.log(`[PicPay Parser] ✅ Extraído via regex (linha ${i}): "${match[2]?.substring(0, 50)}..."`)
        }
      }

      if (match && match.length >= 4) {
        // Usar valores do match ou valores extraídos manualmente
        if (!data) data = match[1]
        if (!descricao) descricao = match[2]
        if (!valorStr) valorStr = match[3]
        
        // Log da descrição completa antes de qualquer processamento
        console.log(`[PicPay Parser] Descrição completa capturada: "${descricao}"`)

        // Validar data
        if (!data || !data.match(/^\d{2}\/\d{2}$/)) {
          continue
        }

        // Converter valor para número
        const valor = this.converterValor(valorStr)

        // Ignorar valores inválidos (zero é válido, mas NaN não)
        if (isNaN(valor)) {
          console.log(`[PicPay Parser] Valor inválido (NaN) na linha ${i}: "${valorStr}" da linha: "${linha.substring(0, 80)}"`)
          continue
        }
        
        // Valores podem ser negativos (pagamentos) ou zero (raramente, mas possível)
        // Aceita qualquer valor não-NaN

        // IMPORTANTE: Extrair parcelamento ANTES de limpar a descrição
        // Isso garante que capturamos o parcelamento mesmo se estiver grudado (ex: "SHEINPARC01/05")
        const parcelamento = this.extrairParcelamento(descricao)
        
        console.log(`[PicPay Parser] Parcelamento extraído:`, parcelamento ? `${parcelamento.current}/${parcelamento.total}` : 'nenhum')

        // Formatar data
        const dataFormatada = this.formatarData(data)

        // NÃO limpar descrição removendo parcelamento - manter descrição original
        // Apenas normalizar espaços múltiplos e trim
        const descricaoLimpa = descricao
          .replace(/\s+/g, ' ') // Remove espaços múltiplos
          .trim()

        // Validar que tem descrição mínima
        if (!descricaoLimpa || descricaoLimpa.length < 3) {
          console.log(`[PicPay Parser] Descrição muito curta na linha ${i}: ${descricao}`)
          continue
        }

        // Criar objeto de transação no formato esperado
        const transacao: ExtractedTransaction = {
          date: dataFormatada,
          description: descricaoLimpa,
          amount: Math.abs(valor), // Sempre positivo (sinal já foi tratado na conversão)
          installments: parcelamento,
        }

        transacoes.push(transacao)
        console.log(`[PicPay Parser] ✅ Transação extraída: ${dataFormatada} - ${descricaoLimpa.substring(0, 40)} - R$ ${Math.abs(valor).toFixed(2)}`)
      } else {
        // Debug: mostrar linhas que não fizeram match (apenas algumas)
        if (i < 5 || (i > 10 && i < 15)) {
          console.log(`[PicPay Parser] ⚠️ Linha sem match (linha ${i}): ${linha.substring(0, 80)}`)
        }
      }
    }

    // Remove duplicatas baseado em data, descrição e valor
    const transacoesUnicas = transacoes.filter(
      (trans, index, self) =>
        index ===
        self.findIndex(
          (t) =>
            t.date === trans.date &&
            t.description === trans.description &&
            Math.abs(t.amount - trans.amount) < 0.01
        )
    )

    return transacoesUnicas
  }

  /**
   * Converte string de valor para número
   * Suporta formatos:
   * - 2.377,77 (formato brasileiro com pontos de milhar)
   * - -2.377,77 (negativo)
   * - 29,64 (sem milhar)
   * - 89,90 (sem milhar)
   */
  converterValor(valorStr: string): number {
    // Remove espaços
    let valor = valorStr.trim()
    
    // Detecta se é negativo (pode estar no início ou no meio)
    const ehNegativo = valor.startsWith('-')
    if (ehNegativo) {
      valor = valor.substring(1).trim()
    }

    // Remove pontos de milhar (ex: 2.377,77 -> 2377,77)
    valor = valor.replace(/\./g, '')
    
    // Substitui vírgula decimal por ponto (ex: 2377,77 -> 2377.77)
    valor = valor.replace(',', '.')

    const numero = parseFloat(valor)
    
    if (isNaN(numero)) {
      console.warn(`[PicPay Parser] Erro ao converter valor: "${valorStr}" -> NaN`)
      return 0
    }

    return ehNegativo ? -numero : numero
  }

  /**
   * Formata data DD/MM para YYYY-MM-DD
   */
  formatarData(data: string): string {
    const [dia, mes] = data.split('/')
    if (!dia || !mes) {
      // Fallback para data atual se não conseguir parsear
      return new Date().toISOString().split('T')[0]
    }

    const ano = new Date().getFullYear()

    // Ajusta o ano se necessário (considera fatura do ano atual ou anterior)
    const mesAtual = new Date().getMonth() + 1
    const mesNum = parseInt(mes)
    const diaNum = parseInt(dia)

    // Se o mês da transação é maior que o mês atual, provavelmente é do ano passado
    // Ou se for janeiro e a transação for dezembro do ano passado
    let anoFinal = ano
    if (mesNum > mesAtual) {
      anoFinal = ano - 1
    } else if (mesNum === mesAtual) {
      // Se for do mesmo mês, verifica o dia
      const diaAtual = new Date().getDate()
      if (diaNum > diaAtual + 7) {
        // Se o dia for muito à frente, pode ser do mês passado
        anoFinal = ano - 1
      }
    }

    return `${anoFinal}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
  }

  /**
   * Extrai informações de parcelamento da descrição
   * Suporta múltiplos formatos:
   * - SHEIN PARC01/05 (com espaço antes de PARC)
   * - SHEINPARC01/05 (sem espaço, grudado)
   * - DIGITAL COLLEGPARC01/12 (grudado após palavra)
   * - GABRIELA PARC01/02 (com espaço antes de PARC)
   * - PARC01/05 (sem contexto, apenas PARC)
   */
  extrairParcelamento(
    descricao: string
  ): { current: number; total: number } | null {
    // Normaliza a descrição para facilitar busca (remove espaços múltiplos mas preserva estrutura)
    const descricaoNormalizada = descricao.trim()
    
    // Padrão 1: PARC seguido de números (mais comum)
    // Aceita: PARC01/05, PARC 01/05, PARC1/5, PARC 1/5
    // Case-insensitive e aceita espaços opcionais após PARC
    const match1 = descricaoNormalizada.match(/PARC\s*(\d{1,2})\s*\/\s*(\d{1,2})/i)
    if (match1) {
      const current = parseInt(match1[1])
      const total = parseInt(match1[2])
      if (current > 0 && total > 0 && current <= total && total <= 999) {
        console.log(`[PicPay Parser] Parcelamento encontrado (padrão 1 - PARC): ${current}/${total} em "${descricaoNormalizada}"`)
        return { current, total }
      }
    }

    // Padrão 2: PARC grudado após palavra (sem espaço antes de PARC)
    // Exemplos: SHEINPARC01/05, GABRIELAPARC01/02, DIGITAL COLLEGPARC01/12
    // Procura por: letra/dígito seguido diretamente de PARC (case-insensitive)
    const match2 = descricaoNormalizada.match(/([A-Za-z0-9])PARC\s*(\d{1,2})\s*\/\s*(\d{1,2})/i)
    if (match2) {
      const current = parseInt(match2[2])
      const total = parseInt(match2[3])
      if (current > 0 && total > 0 && current <= total && total <= 999) {
        console.log(`[PicPay Parser] Parcelamento encontrado (padrão 2 - grudado): ${current}/${total} em "${descricaoNormalizada}"`)
        return { current, total }
      }
    }

    // Padrão 3: PARC no final da descrição, grudado ou não
    // Útil para garantir que pegamos mesmo se estiver no final
    const match3 = descricaoNormalizada.match(/([A-Za-z0-9\s])PARC\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*$/i)
    if (match3) {
      const current = parseInt(match3[2])
      const total = parseInt(match3[3])
      if (current > 0 && total > 0 && current <= total && total <= 999) {
        console.log(`[PicPay Parser] Parcelamento encontrado (padrão 3 - final): ${current}/${total} em "${descricaoNormalizada}"`)
        return { current, total }
      }
    }

    // Padrão 4: Apenas números no formato 01/05 no final da descrição
    // Útil para casos onde PARC foi removido ou não está presente
    // Mas só aceita se estiver no final (para evitar confundir com datas)
    const match4 = descricaoNormalizada.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*$/)
    if (match4 && match4.index !== undefined) {
      const current = parseInt(match4[1])
      const total = parseInt(match4[2])
      // Só aceita se parecer parcelamento (números razoáveis, parcela atual <= total)
      // E não for uma data (evita confundir DD/MM com parcelamento)
      if (
        current > 0 &&
        total > 0 &&
        current <= total &&
        total <= 999 &&
        current <= 999 &&
        // Evita confundir com datas: se total > 12, provavelmente não é data
        (total > 12 || current <= 12)
      ) {
        // Verifica se não há contexto de PARC antes (para evitar duplicatas)
        const antesDoMatch = descricaoNormalizada.substring(0, match4.index)
        if (!antesDoMatch.match(/PARC/i)) {
          console.log(`[PicPay Parser] Parcelamento encontrado (padrão 4 - apenas números): ${current}/${total} em "${descricaoNormalizada}"`)
          return { current, total }
        }
      }
    }

    return null
  }

  /**
   * Limpa a descrição - NÃO remove parcelamento!
   * Apenas normaliza espaços e remove caracteres estranhos
   * Mantém a descrição completa incluindo informações de parcelamento
   */
  limparDescricao(descricao: string): string {
    // Apenas normalizar espaços múltiplos e trim
    // NÃO remover parcelamento - isso será tratado separadamente
    return descricao
      .replace(/\s+/g, ' ') // Remove espaços múltiplos
      .trim()
  }

  /**
   * Processa o texto extraído do PDF e retorna transações no formato esperado
   */
  processarTextoPDF(texto: string): ExtractedTransaction[] {
    console.log('[PicPay Parser] Iniciando processamento do texto PDF')
    console.log(`[PicPay Parser] Tamanho do texto: ${texto.length} caracteres`)
    
    // Mostrar primeiras 500 caracteres para debug
    if (texto.length > 0) {
      console.log(`[PicPay Parser] Primeiras 500 caracteres do texto:`, texto.substring(0, 500))
    }
    
    // Validar se é uma fatura válida
    const isValid = this.validarFaturaPicPay(texto)
    console.log(`[PicPay Parser] Validação de fatura PicPay: ${isValid ? 'VÁLIDA' : 'NÃO VÁLIDA (mas tentando mesmo assim)'}`)
    
    if (!isValid) {
      // Tenta mesmo assim (pode ser outra fatura compatível)
      console.warn(
        '[PicPay Parser] Arquivo pode não ser fatura PicPay, mas tentando processar...'
      )
    }

    // Extrair transações
    console.log('[PicPay Parser] Iniciando extração de transações...')
    const transacoes = this.extrairTransacoes(texto)

    if (transacoes.length === 0) {
      console.warn('[PicPay Parser] ⚠️ NENHUMA TRANSAÇÃO ENCONTRADA!')
      console.warn('[PicPay Parser] Isso pode indicar:')
      console.warn('[PicPay Parser] 1. Formato do PDF diferente do esperado')
      console.warn('[PicPay Parser] 2. Problema na extração de texto')
      console.warn('[PicPay Parser] 3. Padrões de regex não estão correspondendo')
      console.warn(`[PicPay Parser] Primeiras 1000 caracteres para análise:`, texto.substring(0, 1000))
    } else {
      console.log(
        `[PicPay Parser] ✅ ${transacoes.length} transações encontradas no PDF`
      )
      // Mostrar primeiras 3 transações como exemplo
      transacoes.slice(0, 3).forEach((trans, idx) => {
        console.log(`[PicPay Parser] Transação ${idx + 1}: ${trans.date} - ${trans.description.substring(0, 40)} - R$ ${trans.amount.toFixed(2)}`)
      })
    }

    return transacoes
  }
}

/**
 * Função helper para processar texto de PDF usando parser PicPay
 */
export function parsePicPayBill(text: string): ExtractedTransaction[] {
  const parser = new PicPayPDFParser()
  return parser.processarTextoPDF(text)
}

