/**
 * API: Importação de Transações
 * POST /api/transactions/import
 * 
 * Importa transações de um arquivo CSV, XLSX ou PDF (fatura de cartão)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { extractTextFromPDF, parseCreditCardBill, ExtractedTransaction } from '@/utils/pdf-parser'
import { recognizeCategory, recognizeCategoryLegacy, type Category } from '@/utils/category-recognition'
import { TransactionDeduplicationService, type TransactionForDeduplication } from '@/services/transaction-deduplication-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const paymentMethodFromForm = formData.get('paymentMethod') as string
    const cardIdFromForm = formData.get('cardId') as string
    
    // Opções de deduplicação (padrão: apenas parcela atual)
    const importarApenasParcelaAtual = formData.get('importarApenasParcelaAtual') !== 'false'
    const permitirDuplicatasExatas = formData.get('permitirDuplicatasExatas') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo fornecido' }, { status: 400 })
    }

    // Valida método de pagamento obrigatório
    if (!paymentMethodFromForm) {
      return NextResponse.json({ error: 'Método de pagamento é obrigatório' }, { status: 400 })
    }

    // Valida cartão obrigatório para crédito/débito
    if ((paymentMethodFromForm === 'credit' || paymentMethodFromForm === 'debit') && !cardIdFromForm) {
      return NextResponse.json({ error: 'Cartão é obrigatório para pagamentos com cartão' }, { status: 400 })
    }

    // Valida se o cartão existe e pertence ao usuário
    let validatedCardId: string | null = null
    if (cardIdFromForm) {
      const { data: cardData, error: cardError } = await supabase
        .from('cards')
        .select('id, type, user_id')
        .eq('id', cardIdFromForm)
        .eq('user_id', user.id)
        .single()

      if (cardError || !cardData) {
        return NextResponse.json({ error: 'Cartão não encontrado ou inválido' }, { status: 400 })
      }

      // Valida se o tipo do cartão corresponde ao método de pagamento
      if (cardData.type !== paymentMethodFromForm) {
        return NextResponse.json({ 
          error: `Cartão selecionado é de ${cardData.type === 'credit' ? 'crédito' : 'débito'}, mas o método selecionado é ${paymentMethodFromForm === 'credit' ? 'crédito' : 'débito'}` 
        }, { status: 400 })
      }

      validatedCardId = cardData.id
    }

    const fileName = file.name.toLowerCase()
    let transactions: any[] = []
    
    // Variável para uso no processamento das transações
    const finalCardId = validatedCardId

    // Busca categorias do usuário e histórico ANTES de processar arquivo
    // Necessário para reconhecimento inteligente de categorias
    const { data: userCategories } = await supabase
      .from('categories')
      .select('id, name, type')
      .eq('user_id', user.id)

    const categoryMap = new Map<string, string>()
    userCategories?.forEach((cat) => {
      categoryMap.set(cat.name.toLowerCase(), cat.id)
    })

    // Busca histórico de transações para melhorar reconhecimento de categorias
    // Últimas 500 transações para análise de padrões
    const { data: transactionHistory } = await supabase
      .from('transactions')
      .select(`
        description,
        category_id,
        categories:categories(id, name)
      `)
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .not('category_id', 'is', null)
      .order('transaction_date', { ascending: false })
      .limit(500)

    // Prepara histórico formatado para o reconhecimento
    const formattedHistory = transactionHistory?.map(t => ({
      description: t.description,
      category_id: t.category_id,
      category_name: (t.categories as any)?.name || ''
    })).filter(h => h.category_name) || []

    try {
      if (fileName.endsWith('.pdf')) {
        // Processa PDF (fatura de cartão)
        try {
          // Valida arquivo antes de processar
          if (!file || file.size === 0) {
            return NextResponse.json(
              { error: 'Arquivo PDF inválido ou vazio' },
              { status: 400 }
            )
          }

          const extractedTransactions = await parsePDFFile(file)
          
          if (!extractedTransactions || extractedTransactions.length === 0) {
            return NextResponse.json(
              { error: 'Nenhuma transação encontrada no PDF. Verifique se o arquivo é uma fatura de cartão válida.' },
              { status: 400 }
            )
          }
          
          // Converte transações extraídas para o formato esperado
          // IMPORTANTE: Quando vem de PDF, o valor já é da parcela individual, não deve ser dividido
          // Reconhece categorias de forma inteligente usando histórico e categorias reais
          // Converte userCategories para o formato esperado pela função
          const formattedCategories: Category[] = (userCategories || []).map(cat => ({
            id: cat.id,
            name: cat.name,
            type: (cat.type === 'income' || cat.type === 'expense') ? (cat.type as 'income' | 'expense') : null
          }))
          
          const categoryResults = await Promise.all(
            extractedTransactions.map(trans => 
              recognizeCategory(
                trans.description,
                formattedCategories,
                formattedHistory
              )
            )
          )

          transactions = extractedTransactions.map((trans, index) => {
            const categoryResult = categoryResults[index]
            return {
              data: trans.date,
              descricao: trans.description,
              valor: trans.amount.toFixed(2), // Valor já é da parcela individual, não dividir!
              metodo_pagamento: paymentMethodFromForm, // Usa método selecionado pelo usuário
              categoria: categoryResult.categoryName || recognizeCategoryLegacy(trans.description),
              categoria_id: categoryResult.categoryId || null, // ID direto se encontrado
              _categoriaNome: categoryResult.categoryName || recognizeCategoryLegacy(trans.description), // Nome para busca posterior
              cartao: finalCardId || '', // ID do cartão selecionado
              natureza_despesa: trans.installments ? 'installment' : 'variable',
              total_parcelas: trans.installments?.total || '',
              parcela_atual: trans.installments?.current || '',
              observacoes: trans.installments 
                ? `Importado de PDF. Parcela ${trans.installments.current}/${trans.installments.total}`
                : 'Importado de PDF',
              _fromPDF: true, // Flag para indicar que vem de PDF (não gerar parcelas automaticamente)
              _paymentMethod: paymentMethodFromForm, // Método de pagamento para uso na inserção
              _cardId: finalCardId, // ID do cartão para uso na inserção
            }
          })
        } catch (pdfError) {
          // Extrai mensagem de erro sem encadear múltiplas vezes
          let errorMessage = 'Erro desconhecido ao processar PDF'
          
          if (pdfError instanceof Error) {
            errorMessage = pdfError.message
            // Remove prefixos duplicados
            errorMessage = errorMessage.replace(/^Erro ao processar PDF:\s*/gi, '')
          }
          
          console.error('Erro ao processar PDF:', {
            message: errorMessage,
            fileName: file.name,
            fileSize: file.size,
            error: pdfError
          })
          
          return NextResponse.json(
            { 
              error: `Erro ao processar PDF: ${errorMessage}. Verifique se o arquivo é uma fatura de cartão válida e não está protegido por senha.` 
            },
            { status: 400 }
          )
        }
      } else if (fileName.endsWith('.csv')) {
        // Processa CSV
        const fileContent = await file.text()
        transactions = parseCSV(fileContent)
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Processa XLSX/XLS
        const arrayBuffer = await file.arrayBuffer()
        transactions = parseXLSX(arrayBuffer)
      } else {
        return NextResponse.json({ error: 'Formato de arquivo não suportado. Use CSV, XLSX ou PDF.' }, { status: 400 })
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error)
      return NextResponse.json(
        { error: `Erro ao processar arquivo: ${(error as Error).message}` },
        { status: 400 }
      )
    }

    if (transactions.length === 0) {
      return NextResponse.json({ error: 'Nenhuma transação encontrada no arquivo' }, { status: 400 })
    }

    // ========================================
    // DEDUPLICAÇÃO: Buscar transações existentes e filtrar duplicatas
    // ========================================
    console.log('[API Import] 🔍 Iniciando deduplicação de transações...')
    
    // Busca transações existentes do usuário (últimos 2 anos para performance)
    const doisAnosAtras = new Date()
    doisAnosAtras.setFullYear(doisAnosAtras.getFullYear() - 2)
    
    const { data: transacoesExistentesRaw, error: errorBuscarExistentes } = await supabase
      .from('transactions')
      .select('description, amount, transaction_date, type, installment_number, total_installments')
      .eq('user_id', user.id)
      .gte('transaction_date', doisAnosAtras.toISOString().split('T')[0])
      .order('transaction_date', { ascending: false })

    if (errorBuscarExistentes) {
      console.error('[API Import] ⚠️ Erro ao buscar transações existentes:', errorBuscarExistentes)
      // Continua sem deduplicação se houver erro
    }

    // Converte transações existentes para formato do serviço de deduplicação
    const transacoesExistentes: TransactionForDeduplication[] = (transacoesExistentesRaw || []).map(t => ({
      data: t.transaction_date,
      descricao: t.description,
      descricaoOriginal: t.description,
      valor: parseFloat(String(t.amount)),
      tipo: (t.type === 'income' || t.type === 'expense') ? t.type : 'expense',
      parcelamento: (t.installment_number && t.total_installments) ? {
        parcelaAtual: t.installment_number,
        totalParcelas: t.total_installments
      } : undefined
    }))

    // Converte transações extraídas para formato do serviço de deduplicação
    const transacoesParaDeduplicacao: TransactionForDeduplication[] = transactions.map(t => {
      const totalParcelas = t.total_parcelas ? parseInt(String(t.total_parcelas).trim()) : null
      const parcelaAtual = t.parcela_atual ? parseInt(String(t.parcela_atual).trim()) : null

      // Processa valor
      let valorStr = String(t.valor).trim()
      if (valorStr.includes(',') && valorStr.includes('.')) {
        valorStr = valorStr.replace(/\./g, '').replace(',', '.')
      } else if (valorStr.includes(',')) {
        valorStr = valorStr.replace(',', '.')
      }
      const valor = parseFloat(valorStr)

      return {
        data: t.data,
        descricao: t.descricao,
        descricaoOriginal: t.descricao,
        valor: valor,
        tipo: 'expense',
        parcelamento: (totalParcelas && totalParcelas > 1 && parcelaAtual) ? {
          parcelaAtual: parcelaAtual,
          totalParcelas: totalParcelas
        } : undefined
      }
    })

    // Aplica deduplicação
    const deduplicationService = new TransactionDeduplicationService()
    const resultadoDeduplicacao = await deduplicationService.filtrarDuplicatas(
      transacoesParaDeduplicacao,
      transacoesExistentes,
      {
        importarApenasParcelaAtual,
        permitirDuplicatasExatas,
        dataFaturaReferencia: new Date()
      }
    )

    console.log('[API Import] 📊 Resultado da deduplicação:')
    console.log(`  - Total analisadas: ${resultadoDeduplicacao.estatisticas.totalAnalisadas}`)
    console.log(`  - Para importar: ${resultadoDeduplicacao.estatisticas.paraImportar}`)
    console.log(`  - Duplicatas bloqueadas: ${resultadoDeduplicacao.estatisticas.duplicatas}`)
    console.log(`  - Avisos: ${resultadoDeduplicacao.estatisticas.avisos}`)

    // Filtra transações para processar apenas as que passaram na deduplicação
    // Cria um mapa usando hash das transações para deduplicação como chave
    const mapaDeduplicacao = new Map<string, number>()
    transacoesParaDeduplicacao.forEach((t, index) => {
      const hash = deduplicationService.gerarHashTransacao(t)
      mapaDeduplicacao.set(hash, index)
    })

    // Filtra transações originais que passaram na deduplicação
    const transacoesParaImportar = transactions.filter((orig, index) => {
      // Converte transação original para formato de deduplicação
      const totalParcelas = orig.total_parcelas ? parseInt(String(orig.total_parcelas).trim()) : null
      const parcelaAtual = orig.parcela_atual ? parseInt(String(orig.parcela_atual).trim()) : null

      // Processa valor
      let valorStr = String(orig.valor).trim()
      if (valorStr.includes(',') && valorStr.includes('.')) {
        valorStr = valorStr.replace(/\./g, '').replace(',', '.')
      } else if (valorStr.includes(',')) {
        valorStr = valorStr.replace(',', '.')
      }
      const valor = parseFloat(valorStr)

      const transacaoParaDedup: TransactionForDeduplication = {
        data: orig.data,
        descricao: orig.descricao,
        descricaoOriginal: orig.descricao,
        valor: valor,
        tipo: 'expense',
        parcelamento: (totalParcelas && totalParcelas > 1 && parcelaAtual) ? {
          parcelaAtual: parcelaAtual,
          totalParcelas: totalParcelas
        } : undefined
      }

      // Verifica se está na lista de transações a importar
      const hash = deduplicationService.gerarHashTransacao(transacaoParaDedup)
      return resultadoDeduplicacao.paraImportar.some(t => 
        deduplicationService.gerarHashTransacao(t) === hash
      )
    })

    // Se não há transações para importar, retorna com informações sobre duplicatas
    if (transacoesParaImportar.length === 0) {
      return NextResponse.json({
        count: 0,
        errors: 0,
        errorMessages: [],
        message: 'Nenhuma transação nova para importar. Todas já existem no sistema.',
        deduplicacao: {
          totalAnalisadas: resultadoDeduplicacao.estatisticas.totalAnalisadas,
          duplicatasBloqueadas: resultadoDeduplicacao.estatisticas.duplicatas,
          duplicatas: resultadoDeduplicacao.duplicatas.map(d => ({
            descricao: d.transacao.descricao,
            valor: d.transacao.valor,
            data: d.transacao.data,
            motivo: d.motivo
          }))
        }
      }, { status: 200 })
    }

    // Atualiza a lista de transações para processar apenas as não-duplicadas
    transactions = transacoesParaImportar

    // Processa e insere transações
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const transaction of transactions) {
      try {
        // Valida e processa transação
        if (!transaction.data || !transaction.descricao || !transaction.valor) {
          errorCount++
          errors.push(`Linha inválida: ${transaction.descricao || 'sem descrição'}`)
          continue
        }

        // Processa valor - suporta formatos brasileiros e internacionais
        let valorStr = String(transaction.valor).trim()
        
        // Se tem vírgula e ponto, assume formato brasileiro (1.500,50)
        // Remove pontos (separadores de milhar) e substitui vírgula por ponto (decimal)
        if (valorStr.includes(',') && valorStr.includes('.')) {
          valorStr = valorStr.replace(/\./g, '').replace(',', '.')
        } else if (valorStr.includes(',')) {
          // Só vírgula - pode ser formato brasileiro ou europeu
          valorStr = valorStr.replace(',', '.')
        }
        // Se só tem ponto, mantém como está (formato internacional)
        
        const amount = parseFloat(valorStr)
        if (isNaN(amount) || amount <= 0) {
          errorCount++
          errors.push(`Valor inválido para: ${transaction.descricao}`)
          continue
        }

        // Busca ou cria categoria
        let categoryId: string | null = null
        
        // Prioridade 1: Se já tem categoria_id (reconhecimento inteligente funcionou)
        if ((transaction as any).categoria_id) {
          categoryId = (transaction as any).categoria_id
        }
        // Prioridade 2: Busca por nome da categoria (incluindo nome do reconhecimento)
        else {
          // Tenta usar o nome do reconhecimento inteligente primeiro
          const categoriaNomeBusca = (transaction as any)._categoriaNome || transaction.categoria
          if (categoriaNomeBusca) {
            const catName = String(categoriaNomeBusca).toLowerCase().trim()
            
            // Busca exata no map
            categoryId = categoryMap.get(catName) || null
            
            // Se não encontrou exato, busca por similaridade (case-insensitive, acentos, etc.)
            if (!categoryId && userCategories) {
              const normalizedSearch = catName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
              for (const cat of userCategories) {
                const normalizedCat = cat.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
                if (normalizedCat === normalizedSearch || normalizedCat.includes(normalizedSearch) || normalizedSearch.includes(normalizedCat)) {
                  categoryId = cat.id
                  categoryMap.set(catName, categoryId) // Cache para próximas buscas
                  break
                }
              }
            }
            
            // Se ainda não encontrou, tenta reconhecimento inteligente novamente
            if (!categoryId) {
              const formattedCategories: Category[] = (userCategories || []).map(cat => ({
                id: cat.id,
                name: cat.name,
                type: (cat.type === 'income' || cat.type === 'expense') ? (cat.type as 'income' | 'expense') : null
              }))
              
              const categoryResult = await recognizeCategory(
                String(transaction.descricao),
                formattedCategories,
                formattedHistory
              )
              
              if (categoryResult.categoryId) {
                categoryId = categoryResult.categoryId
                categoryMap.set(catName, categoryId) // Cache
              }
            }
            
            // Se ainda não encontrou e o nome é válido, cria nova categoria
            if (!categoryId) {
              const catNameToCreate = String(categoriaNomeBusca).trim()
              if (catNameToCreate && 
                  catNameToCreate !== 'Categoria não encontrada' && 
                  catNameToCreate !== 'Outros' &&
                  catNameToCreate.length > 0) {
                const { data: newCat } = await supabase
                  .from('categories')
                  .insert([
                    {
                      name: catNameToCreate,
                      type: 'expense',
                      user_id: user.id,
                    },
                  ])
                  .select('id')
                  .single()

                if (newCat) {
                  categoryId = newCat.id
                  categoryMap.set(catName, categoryId)
                }
              }
            }
          }
        }

        // Se ainda não tem categoria, busca primeira disponível ou cria padrão
        if (!categoryId) {
          const { data: defaultCat } = await supabase
            .from('categories')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)
            .single()

          if (defaultCat) {
            categoryId = defaultCat.id
          } else {
            // Cria categoria padrão
            const { data: newCat } = await supabase
              .from('categories')
              .insert([
                {
                  name: 'Despesa',
                  type: 'expense',
                  user_id: user.id,
                },
              ])
              .select('id')
              .single()

            if (newCat) {
              categoryId = newCat.id
            }
          }
        }

        // Garante que categoryId não é null antes de inserir
        if (!categoryId) {
          errorCount++
          errors.push(`Não foi possível criar categoria para: ${transaction.descricao}`)
          continue
        }

        // Valida método de pagamento
        // Prioriza método passado via FormData (para PDFs), senão usa o do transaction
        const paymentMethodFromTransaction = (transaction as any)._paymentMethod || transaction.metodo_pagamento
        const paymentMethod = String(paymentMethodFromTransaction || 'cash').toLowerCase()
        const validMethods = ['credit', 'debit', 'cash', 'pix', 'boleto']
        const validatedMethod = validMethods.includes(paymentMethod) ? paymentMethod : 'cash'

        // Processa campos de parcelamento
        const totalInstallments = transaction.total_parcelas 
          ? parseInt(String(transaction.total_parcelas).trim()) 
          : null
        const installmentNumber = transaction.parcela_atual 
          ? parseInt(String(transaction.parcela_atual).trim()) 
          : null

        // NOVA LÓGICA: Se total_parcelas > 1, cria automaticamente as parcelas futuras
        // IMPORTANTE: Mesmo para PDFs, se identificar parcelamento (ex: PARC01/05 ou PARC03/05), 
        // deve gerar as parcelas FUTURAS a partir da parcela atual
        // Exemplo: Se parcela atual é 3/05, cria a parcela 3 + as futuras (4/05, 5/05)
        const isFromPDF = (transaction as any)._fromPDF === true
        const currentInstallment = installmentNumber || 1 // Se não especificado, assume parcela 1
        const shouldAutoGenerateInstallments = 
          totalInstallments && 
          totalInstallments > 1 && 
          currentInstallment <= totalInstallments // Se tem parcelamento válido

        // Valida se parcela_atual é válida (se especificada)
        if (totalInstallments && totalInstallments > 1 && installmentNumber) {
          if (installmentNumber < 1 || installmentNumber > totalInstallments) {
            errorCount++
            errors.push(`Parcela atual (${installmentNumber}) inválida para total de ${totalInstallments} parcelas: ${transaction.descricao}`)
            continue
          }
        }

        // Valida valores de parcelamento
        if (totalInstallments !== null && (totalInstallments < 1 || totalInstallments > 999)) {
          errorCount++
          errors.push(`Número total de parcelas inválido (deve ser entre 1 e 999) para: ${transaction.descricao}`)
          continue
        }

        // Valida parcela_atual apenas se não for geração automática
        if (!shouldAutoGenerateInstallments && installmentNumber !== null && (installmentNumber < 1 || installmentNumber > 999)) {
          errorCount++
          errors.push(`Número da parcela atual inválido (deve ser entre 1 e 999) para: ${transaction.descricao}`)
          continue
        }

        // Valida natureza da despesa
        const expenseNature = transaction.natureza_despesa 
          ? String(transaction.natureza_despesa).toLowerCase().trim()
          : null
        
        const validExpenseNatures = ['fixed', 'variable', 'installment']
        let validatedExpenseNature = expenseNature && validExpenseNatures.includes(expenseNature) 
          ? expenseNature 
          : null

        // Se tem parcelamento, natureza deve ser 'installment'
        if (totalInstallments && totalInstallments > 1) {
          // Auto-corrige para installment se não foi especificado
          validatedExpenseNature = 'installment'
        }

        // Busca cartão se especificado (apenas para crédito/débito)
        // Prioriza cardId passado via FormData (para PDFs), senão busca pelo nome
        let cardId: string | null = null
        
        // Prioridade 1: CardId passado diretamente via FormData (para PDFs)
        if ((transaction as any)._cardId) {
          cardId = (transaction as any)._cardId
        }
        // Prioridade 2: Busca pelo nome do cartão (para CSV/XLSX)
        else if ((validatedMethod === 'credit' || validatedMethod === 'debit') && transaction.cartao) {
          const cardName = String(transaction.cartao).trim()
          if (cardName) {
            const { data: userCards } = await supabase
              .from('cards')
              .select('id, name, type')
              .eq('user_id', user.id)
              .eq('type', validatedMethod) // Filtra pelo tipo correto

            const matchedCard = userCards?.find(
              (card) => card.name.toLowerCase() === cardName.toLowerCase()
            )

            if (matchedCard) {
              cardId = matchedCard.id
            } else {
              // Se não encontrar, pode criar ou deixar null (depende da lógica de negócio)
              // Por enquanto, deixa null e continua
            }
          }
        }
        // Prioridade 3: Se é crédito/débito mas não tem cartão, usa o validado do FormData
        else if ((validatedMethod === 'credit' || validatedMethod === 'debit') && finalCardId) {
          cardId = finalCardId
        }

        // Se deve gerar automaticamente as parcelas futuras
        if (shouldAutoGenerateInstallments) {
          // Calcula o valor de cada parcela
          // IMPORTANTE: Para PDFs, o valor já é da parcela individual, então usa esse valor
          // Para outros formatos, divide o valor total pelo número de parcelas
          const installmentAmount = isFromPDF ? amount : (amount / totalInstallments!)
          const baseDate = new Date(formatDate(String(transaction.data)))
          let installmentsCreated = 0
          const installmentErrors: string[] = []

          // LÓGICA: 
          // - Se é PDF: a parcela atual já está sendo criada abaixo (no else), então só cria as FUTURAS
          //   Exemplo: Se parcela atual é 3/05, cria apenas 4/05 e 5/05 (começa do currentInstallment + 1)
          // - Se não é PDF e parcela atual é 1: cria todas as parcelas (1, 2, 3, ...)
          // - Se não é PDF e parcela atual > 1: cria a parcela atual + futuras
          const startIndex = isFromPDF 
            ? currentInstallment // Para PDFs, começa da parcela seguinte (a atual já será criada abaixo)
            : (currentInstallment === 1 ? 0 : currentInstallment - 1) // Para outros formatos, inclui a atual se não for 1
          const endIndex = totalInstallments!
          
          // Para PDFs, só cria parcelas FUTURAS (não inclui a atual)
          // Para outros formatos, cria a partir da atual
          const actualStartIndex = isFromPDF ? currentInstallment : startIndex

          // Cria as parcelas automaticamente
          // Para PDFs: começa da parcela seguinte (currentInstallment), então cria apenas as FUTURAS
          //   Exemplo: Se parcela atual é 3/05, currentInstallment = 3, então:
          //   - Loop começa de i = 3 (mas pula para 4, 5)
          //   - Parcela 4 = baseDate + (4 - 3) meses = baseDate + 1 mês
          //   - Parcela 5 = baseDate + (5 - 3) meses = baseDate + 2 meses
          // Para outros formatos: cria a partir da parcela atual
          for (let i = actualStartIndex; i < endIndex; i++) {
            const installmentDate = new Date(baseDate)
            const currentInstallmentNumber = i + 1
            
            // Para PDFs: calcula a diferença de meses a partir da parcela atual
            // Para outros formatos: calcula a partir do índice (0 = mês atual, 1 = próximo mês, etc.)
            if (isFromPDF) {
              // Se parcela atual é 3, e estamos criando parcela 4:
              // - Diferença = 4 - 3 = 1 mês
              // - Diferença = 5 - 3 = 2 meses
              const monthsDiff = currentInstallmentNumber - currentInstallment
              installmentDate.setMonth(installmentDate.getMonth() + monthsDiff)
            } else {
              // Para outros formatos: se parcela atual é 1, i começa de 0 (mês atual)
              // Se parcela atual é 3, i começa de 2 (mês atual + 2 = parcela 3)
              const monthsDiff = i - (currentInstallment === 1 ? 0 : currentInstallment - 1)
              installmentDate.setMonth(installmentDate.getMonth() + monthsDiff)
            }

            const installmentDescription = `${String(transaction.descricao)} (${currentInstallmentNumber}/${totalInstallments})`

            // IMPORTANTE: card_id deve ser null para métodos que não são crédito/débito
            const finalCardIdForInstallment = (validatedMethod === 'credit' || validatedMethod === 'debit') ? cardId : null
            
            const { error: insertError } = await supabase.from('transactions').insert([
              {
                user_id: user.id,
                description: installmentDescription,
                amount: installmentAmount,
                type: 'expense',
                category_id: categoryId,
                transaction_date: installmentDate.toISOString().split('T')[0],
                payment_method: validatedMethod,
                card_id: finalCardIdForInstallment, // Null para métodos que não são cartão
                expense_nature: 'installment',
                installment_number: currentInstallmentNumber,
                total_installments: totalInstallments,
                notes: transaction.observacoes || null,
              },
            ])

            if (insertError) {
              installmentErrors.push(`Parcela ${currentInstallmentNumber}/${totalInstallments}: ${insertError.message}`)
            } else {
              installmentsCreated++
            }
          }

          if (installmentsCreated > 0) {
            successCount += installmentsCreated
          }
          if (installmentErrors.length > 0) {
            errorCount += installmentErrors.length
            errors.push(`${transaction.descricao}: ${installmentErrors.join('; ')}`)
          }
          
          // IMPORTANTE: Se é PDF, a parcela atual será criada no bloco abaixo
          // (as parcelas futuras já foram criadas no loop acima)
        }
        
        // Cria a transação atual
        // IMPORTANTE: Para PDFs com parcelamento, SEMPRE cria a parcela atual aqui (independente do número)
        // As parcelas futuras já foram criadas no loop acima (se shouldAutoGenerateInstallments)
        // Para outros formatos: se não deve gerar automaticamente, cria apenas a transação atual
        if (!shouldAutoGenerateInstallments || isFromPDF) {
          // Cria apenas uma transação (única ou parcela específica)
          let finalDescription = String(transaction.descricao)
          
          // CORREÇÃO: Adiciona sufixo (X/Y) apenas se houver parcelamento válido
          // Isso permite que descrições com PARC##/## sejam preservadas e recebam o sufixo visual
          if (totalInstallments && totalInstallments > 1 && installmentNumber) {
            // Verifica se a descrição já contém o padrão PARC##/##
            // Se sim, adiciona apenas o sufixo (X/Y) para visualização
            // Se não, mantém a descrição original
            finalDescription = `${finalDescription} (${installmentNumber}/${totalInstallments})`
          }

          // Se é parcela específica, calcula o valor da parcela
          let finalAmount = amount
          if (totalInstallments && totalInstallments > 1 && installmentNumber && installmentNumber > 1) {
            // Para parcelas específicas, assume que o valor informado é o valor da parcela
            // (não divide, pois o usuário já informou o valor correto da parcela)
          }

          // Insere transação
          // IMPORTANTE: card_id deve ser null para métodos que não são crédito/débito
          const finalCardIdForInsert = (validatedMethod === 'credit' || validatedMethod === 'debit') ? cardId : null
          
          const { error: insertError } = await supabase.from('transactions').insert([
            {
              user_id: user.id,
              description: finalDescription,
              amount: finalAmount,
              type: 'expense',
              category_id: categoryId,
              transaction_date: formatDate(String(transaction.data)),
              payment_method: validatedMethod,
              card_id: finalCardIdForInsert, // Null para métodos que não são cartão
              expense_nature: validatedExpenseNature,
              installment_number: installmentNumber,
              total_installments: totalInstallments,
              notes: transaction.observacoes || null,
            },
          ])

          if (insertError) {
            errorCount++
            errors.push(`Erro ao importar: ${transaction.descricao} - ${insertError.message}`)
          } else {
            successCount++
          }
        }
      } catch (error) {
        errorCount++
        errors.push(`Erro ao processar: ${transaction.descricao || 'linha desconhecida'}`)
        console.error('Erro ao importar transação:', error)
      }
    }

    return NextResponse.json(
      {
        count: successCount,
        errors: errorCount,
        errorMessages: errors.slice(0, 10), // Limita a 10 erros
        message: `${successCount} transação(ões) importada(s) com sucesso${errorCount > 0 ? `, ${errorCount} erro(s)` : ''}`,
        deduplicacao: {
          totalAnalisadas: resultadoDeduplicacao.estatisticas.totalAnalisadas,
          novasTransacoes: successCount,
          duplicatasBloqueadas: resultadoDeduplicacao.estatisticas.duplicatas,
          avisos: resultadoDeduplicacao.estatisticas.avisos,
          duplicatas: resultadoDeduplicacao.duplicatas.map(d => ({
            descricao: d.transacao.descricao,
            valor: d.transacao.valor,
            data: d.transacao.data,
            motivo: d.motivo
          })),
          avisosDetalhados: resultadoDeduplicacao.avisos.map(a => ({
            tipo: a.tipo,
            mensagem: a.mensagem,
            transacao: {
              descricao: a.transacao.descricao,
              valor: a.transacao.valor,
              data: a.transacao.data
            }
          }))
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao importar transações:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao importar transações' },
      { status: 500 }
    )
  }
}

/**
 * Parse XLSX/XLS file content
 */
function parseXLSX(arrayBuffer: ArrayBuffer): any[] {
  try {
    // Lê o workbook
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    // Pega a primeira planilha (sheet)
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      return []
    }

    const worksheet = workbook.Sheets[firstSheetName]
    
    // Converte para JSON (com header como primeira linha)
    // Usa raw: false para que XLSX processe datas e números automaticamente
    let jsonData: any[][]
    try {
      jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // Array de arrays
        raw: false, // false faz XLSX converter datas e números automaticamente
        defval: '', // Valor padrão para células vazias
      }) as any[][]
    } catch (error) {
      // Fallback se houver erro
      jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
      }) as any[][]
    }

    if (jsonData.length < 2) {
      return [] // Precisa ter header + pelo menos uma linha
    }

    // Primeira linha são os headers
    const headers = (jsonData[0] as string[]).map((h) => String(h || '').trim().toLowerCase())
    
    // Valida se tem os headers esperados
    if (!headers.includes('data') && !headers.includes('descricao') && !headers.includes('valor')) {
      throw new Error('Cabeçalhos inválidos. O arquivo deve ter pelo menos: data, descricao, valor')
    }

    // Converte as linhas restantes para objetos
    const transactions: any[] = []

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i]
      if (!row || row.length === 0) continue

      const transaction: any = {}
      headers.forEach((header, index) => {
        let value = row[index]
        
        // Processa valores
        if (value === null || value === undefined || value === '') {
          value = ''
        } else if (header === 'data') {
          // Processa datas do Excel
          if (value instanceof Date) {
            // XLSX já converte para Date object quando raw: false
            value = value.toISOString().split('T')[0]
          } else if (typeof value === 'number') {
            // Se ainda for número (caso cellDates não tenha funcionado), converte manualmente
            // Excel epoch: 1899-12-30, mas Excel conta 1 = 1900-01-01
            const excelEpoch = new Date(Date.UTC(1899, 11, 30))
            const date = new Date(excelEpoch.getTime() + (value - 1) * 86400000)
            const year = date.getUTCFullYear()
            const month = String(date.getUTCMonth() + 1).padStart(2, '0')
            const day = String(date.getUTCDate()).padStart(2, '0')
            value = `${year}-${month}-${day}`
          } else {
            // Se é string, normaliza usando função auxiliar
            value = formatDate(String(value).trim())
          }
        } else if (header === 'valor') {
          // Para valores, preserva o número se for número, ou converte string
          // No Excel, valores monetários geralmente vêm como números
          if (typeof value === 'number') {
            // Mantém como número temporariamente - será processado depois
            value = value.toString()
          } else {
            // Se é string, já vem formatado - mantém como está
            value = String(value).trim()
          }
        } else if (typeof value === 'number') {
          // Para outros números, converte para string
          value = value.toString()
        } else {
          value = String(value).trim()
        }

        transaction[header] = value
      })

      // Só adiciona se tiver pelo menos um campo preenchido
      if (transaction.data || transaction.descricao || transaction.valor) {
        transactions.push(transaction)
      }
    }

    return transactions
  } catch (error) {
    console.error('Erro ao processar XLSX:', error)
    throw new Error(`Erro ao ler arquivo XLSX: ${(error as Error).message}`)
  }
}

/**
 * Parse CSV file content
 */
function parseCSV(content: string): any[] {
  const lines = content.split('\n').filter((line) => line.trim())
  if (lines.length < 2) return [] // Precisa ter header + pelo menos uma linha

  // Remove BOM se presente
  const headerLine = lines[0].replace(/^\uFEFF/, '')
  const headers = parseCSVLine(headerLine).map((h) => h.trim().toLowerCase())

  const transactions: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0) continue

    const transaction: any = {}
    headers.forEach((header, index) => {
      transaction[header] = values[index]?.trim() || ''
    })

    if (transaction.data || transaction.descricao || transaction.valor) {
      transactions.push(transaction)
    }
  }

  return transactions
}

/**
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }

  // Add last field
  values.push(current)

  return values
}

/**
 * Processa arquivo PDF e extrai transações
 */
async function parsePDFFile(file: File): Promise<ExtractedTransaction[]> {
  try {
    console.log('[API Import] Iniciando parsePDFFile')
    console.log('[API Import] Arquivo:', { name: file.name, size: file.size, type: file.type })
    
    // Validações iniciais
    if (!file || !(file instanceof File)) {
      throw new Error('Arquivo inválido fornecido')
    }

    if (file.size === 0) {
      throw new Error('Arquivo PDF vazio')
    }

    // Extrai texto do PDF
    console.log('[API Import] Extraindo texto do PDF...')
    const text = await extractTextFromPDF(file)
    
    console.log(`[API Import] Texto extraído: ${text.length} caracteres`)
    
    if (!text || text.trim().length === 0) {
      throw new Error('Não foi possível extrair texto do PDF. O arquivo pode estar protegido por senha ou ser uma imagem digitalizada.')
    }

    // Mostrar primeiros caracteres para debug
    console.log(`[API Import] Primeiros 500 caracteres do texto extraído:`, text.substring(0, 500))

    // Parse das transações
    console.log('[API Import] Iniciando parse das transações...')
    console.log(`[API Import] Tamanho do texto a processar: ${text.length} caracteres`)
    console.log(`[API Import] Primeiros 500 caracteres:`, text.substring(0, 500))
    
    let transactions: ExtractedTransaction[] = []
    
    try {
      transactions = parseCreditCardBill(text)
      console.log(`[API Import] Parse concluído: ${transactions?.length || 0} transações encontradas`)
    } catch (parseError) {
      console.error('[API Import] ❌ ERRO CRÍTICO durante parse:', parseError)
      console.error('[API Import] Mensagem:', parseError instanceof Error ? parseError.message : String(parseError))
      console.error('[API Import] Stack trace:', parseError instanceof Error ? parseError.stack : 'N/A')
      throw new Error(`Erro ao processar PDF: ${parseError instanceof Error ? parseError.message : 'Erro desconhecido'}`)
    }
    
    if (!transactions) {
      console.error('[API Import] ❌ parseCreditCardBill retornou null/undefined!')
      console.error('[API Import] Primeiros 2000 caracteres do texto para análise:')
      console.error(text.substring(0, 2000))
      throw new Error('Nenhuma transação encontrada no PDF. Erro ao processar o arquivo.')
    }
    
    if (!Array.isArray(transactions)) {
      console.error('[API Import] ❌ parseCreditCardBill retornou resultado inválido (não é array):', typeof transactions, transactions)
      throw new Error('Erro ao processar PDF: resultado inválido do parser.')
    }
    
    if (transactions.length === 0) {
      console.error('[API Import] ❌ NENHUMA TRANSAÇÃO ENCONTRADA!')
      console.error('[API Import] Primeiros 2000 caracteres do texto para análise:')
      console.error(text.substring(0, 2000))
      console.error('[API Import] Últimos 500 caracteres do texto:')
      console.error(text.substring(Math.max(0, text.length - 500)))
      throw new Error('Nenhuma transação encontrada no PDF. Verifique se o arquivo é uma fatura de cartão de crédito válida.')
    }

    console.log(`[API Import] ✅ ${transactions.length} transações extraídas com sucesso`)
    return transactions
  } catch (error) {
    console.error('[API Import] Erro ao processar PDF:', error)
    // Evita encadear mensagens de erro
    if (error instanceof Error) {
      // Se a mensagem já começa com "Erro ao processar PDF", apenas repassa
      if (error.message.startsWith('Erro ao processar PDF:')) {
        throw error
      }
      throw new Error(`Erro ao processar PDF: ${error.message}`)
    }
    throw new Error(`Erro ao processar PDF: Erro desconhecido`)
  }
}

/**
 * Format date from various formats to YYYY-MM-DD
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0]

  // Remove whitespace
  dateStr = dateStr.trim()

  // Try ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }

  // Try DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/')
    return `${year}-${month}-${day}`
  }

  // Try DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('-')
    return `${year}-${month}-${day}`
  }

  // Default: try to parse as date
  try {
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  } catch {
    // Ignore
  }

  // Fallback: today
  return new Date().toISOString().split('T')[0]
}
