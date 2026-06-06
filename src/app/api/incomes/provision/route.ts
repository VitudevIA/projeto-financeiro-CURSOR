/**
 * API: Provisionamento de Receitas Recorrentes
 * POST /api/incomes/provision
 * 
 * Provisiona transações baseadas em receitas recorrentes para um período
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  buildRecurringIncomeTransactionDate,
  defaultProvisionStartMonth,
  resolveMesReferenciaFromTransactionDate,
} from '@/lib/incomes/resolve-mes-referencia'
import type { TablesInsert } from '@/types/supabase'

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
    const startMonth = defaultProvisionStartMonth(body.startMonth ?? undefined)

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

    const activeRecurringIncomes = recurringIncomes ?? []

    if (activeRecurringIncomes.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma receita recorrente ativa encontrada', transactions: [] },
        { status: 404 }
      )
    }

    // Calcula mês inicial (competência corrente por padrão)
    const currentMonth = new Date(startMonth + '-01')

    const transactionsToInsert: TablesInsert<'transactions'>[] = []
    const provisionedCount: Record<string, number> = {}

    for (const recurringIncome of activeRecurringIncomes) {
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

        const transactionDate = buildRecurringIncomeTransactionDate(
          `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-01`,
          recurringIncome.day_of_month
        )

        // Verifica se já existe transação para essa receita nesse mês
        const mes_referencia = resolveMesReferenciaFromTransactionDate(transactionDate)

        const existingCheck = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('transaction_date', transactionDate)
          .eq('type', 'income')
          .eq('mes_referencia', mes_referencia)
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
          transaction_date: transactionDate,
          mes_referencia,
          payment_method: recurringIncome.payment_method ?? undefined,
          card_id: recurringIncome.card_id ?? undefined,
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
          transactions: [],
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
        transactions: insertedTransactions ?? [],
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
