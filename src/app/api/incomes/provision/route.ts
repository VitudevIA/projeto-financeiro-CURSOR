/**
 * API: Provisionamento de Receitas Recorrentes
 * POST /api/incomes/provision
 * 
 * Provisiona transações baseadas em receitas recorrentes para um período
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

interface ProvisionRequest {
  recurringIncomeId?: string // Se fornecido, provisiona apenas esta receita
  months: number // Número de meses para provisionar (padrão: 12)
  startMonth?: string // Mês inicial (YYYY-MM), padrão: próximo mês
}

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

    const body: ProvisionRequest = await request.json()
    const months = body.months || 12
    const startMonth = body.startMonth || null

    if (months < 1 || months > 24) {
      return NextResponse.json({ error: 'Número de meses deve estar entre 1 e 24' }, { status: 400 })
    }

    // Busca receitas recorrentes ativas
    let query = (supabase as any)
      .from('recurring_incomes')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (body.recurringIncomeId) {
      query = query.eq('id', body.recurringIncomeId)
    }

    const { data: recurringIncomes, error: fetchError } = await query

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!recurringIncomes || recurringIncomes.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma receita recorrente ativa encontrada' },
        { status: 404 }
      )
    }

    // Calcula mês inicial
    const now = new Date()
    let currentMonth = startMonth
      ? new Date(startMonth + '-01')
      : new Date(now.getFullYear(), now.getMonth() + 1, 1)

    // Gera transações provisionadas
    const transactionsToInsert: any[] = []
    const provisionedCount: Record<string, number> = {}

    for (const recurringIncome of recurringIncomes) {
      let count = 0

      for (let i = 0; i < months; i++) {
        const monthDate = new Date(currentMonth)
        monthDate.setMonth(monthDate.getMonth() + i)

        // Verifica se a receita ainda está ativa (end_date)
        if (recurringIncome.end_date) {
          const endDate = new Date(recurringIncome.end_date)
          if (monthDate > endDate) {
            continue
          }
        }

        // Calcula data da transação baseada no day_of_month
        const transactionDate = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth(),
          Math.min(recurringIncome.day_of_month, new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate())
        )

        // Verifica se já existe transação para essa receita nesse mês
        const existingCheck = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('transaction_date', transactionDate.toISOString().split('T')[0])
          .eq('type', 'income')
          .ilike('description', `%${recurringIncome.description}%`)
          .limit(1)

        if (existingCheck.data && existingCheck.data.length > 0) {
          // Já existe transação, pula
          continue
        }

        transactionsToInsert.push({
          user_id: user.id,
          description: recurringIncome.description,
          amount: recurringIncome.amount,
          type: 'income',
          category_id: recurringIncome.category_id,
          transaction_date: transactionDate.toISOString().split('T')[0],
          payment_method: recurringIncome.payment_method,
          card_id: recurringIncome.card_id,
          notes: `Provisionado de receita recorrente: ${recurringIncome.id}`,
        })

        count++
      }

      provisionedCount[recurringIncome.id] = count
    }

    if (transactionsToInsert.length === 0) {
      return NextResponse.json(
        {
          message: 'Nenhuma transação nova para provisionar',
          provisioned: provisionedCount,
        },
        { status: 200 }
      )
    }

    // Insere transações em lote
    const { data: insertedTransactions, error: insertError } = await supabase
      .from('transactions')
      .insert(transactionsToInsert)
      .select()

    if (insertError) {
      console.error('Erro ao provisionar transações:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        message: `${insertedTransactions?.length || 0} transações provisionadas com sucesso`,
        provisioned: provisionedCount,
        transactions: insertedTransactions,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
