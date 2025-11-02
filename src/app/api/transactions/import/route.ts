/**
 * API: Importação de Transações
 * POST /api/transactions/import
 * 
 * Importa transações de um arquivo CSV ou XLSX
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

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

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo fornecido' }, { status: 400 })
    }

    // Lê o arquivo
    const fileContent = await file.text()
    const fileName = file.name.toLowerCase()

    let transactions: any[] = []

    if (fileName.endsWith('.csv')) {
      transactions = parseCSV(fileContent)
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Para XLSX, seria necessário usar uma biblioteca server-side
      // Por enquanto, retornamos erro informando que CSV é preferido
      return NextResponse.json(
        { error: 'Formato XLSX requer processamento adicional. Use CSV ou converta o arquivo.' },
        { status: 400 }
      )
    } else {
      return NextResponse.json({ error: 'Formato de arquivo não suportado' }, { status: 400 })
    }

    if (transactions.length === 0) {
      return NextResponse.json({ error: 'Nenhuma transação encontrada no arquivo' }, { status: 400 })
    }

    // Busca categorias do usuário para mapear
    const { data: userCategories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', user.id)

    const categoryMap = new Map<string, string>()
    userCategories?.forEach((cat) => {
      categoryMap.set(cat.name.toLowerCase(), cat.id)
    })

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

        const amount = parseFloat(String(transaction.valor).replace(',', '.'))
        if (isNaN(amount) || amount <= 0) {
          errorCount++
          errors.push(`Valor inválido para: ${transaction.descricao}`)
          continue
        }

        // Busca ou cria categoria
        let categoryId: string | null = null
        if (transaction.categoria) {
          const catName = String(transaction.categoria).toLowerCase()
          categoryId = categoryMap.get(catName) || null

          // Se não encontrar, cria uma nova categoria
          if (!categoryId) {
            const { data: newCat } = await supabase
              .from('categories')
              .insert([
                {
                  name: String(transaction.categoria),
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
        const paymentMethod = String(transaction.metodo_pagamento || 'cash').toLowerCase()
        const validMethods = ['credit', 'debit', 'cash', 'pix', 'boleto']
        const validatedMethod = validMethods.includes(paymentMethod) ? paymentMethod : 'cash'

        // Insere transação
        const { error: insertError } = await supabase.from('transactions').insert([
          {
            user_id: user.id,
            description: String(transaction.descricao),
            amount: amount,
            type: 'expense',
            category_id: categoryId,
            transaction_date: formatDate(String(transaction.data)),
            payment_method: validatedMethod,
            notes: transaction.observacoes || null,
          },
        ])

        if (insertError) {
          errorCount++
          errors.push(`Erro ao importar: ${transaction.descricao} - ${insertError.message}`)
        } else {
          successCount++
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
