/**
 * API: Receitas Recorrentes - CRUD Individual
 * GET /api/incomes/recurring/[id] - Buscar receita recorrente
 * PUT /api/incomes/recurring/[id] - Atualizar receita recorrente
 * DELETE /api/incomes/recurring/[id] - Deletar receita recorrente
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { RecurringIncomeUpdate } from '@/types/database.types'
import { resolveMesReferenciaFromTransactionDate } from '@/lib/incomes/resolve-mes-referencia'

async function syncLinkedIncomeTransactionsMesReferencia(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  recurringIncomeId: string
) {
  const { data: linked, error } = await supabase
    .from('transactions')
    .select('id, transaction_date')
    .eq('user_id', userId)
    .eq('type', 'income')
    .ilike('notes', `%${recurringIncomeId}%`)

  if (error || !linked?.length) {
    return
  }

  for (const row of linked) {
    const mes_referencia = resolveMesReferenciaFromTransactionDate(row.transaction_date)
    await supabase
      .from('transactions')
      .update({ mes_referencia })
      .eq('id', row.id)
      .eq('user_id', userId)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { id } = await params

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data, error } = await (supabase as any)
      .from('recurring_incomes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Receita não encontrada' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    console.error('Erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { id } = await params

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body: RecurringIncomeUpdate = await request.json()

    // Validações
    if (body.day_of_month !== undefined && (body.day_of_month < 1 || body.day_of_month > 31)) {
      return NextResponse.json({ error: 'Dia do mês deve estar entre 1 e 31' }, { status: 400 })
    }

    if (body.amount !== undefined && body.amount <= 0) {
      return NextResponse.json({ error: 'Valor deve ser maior que zero' }, { status: 400 })
    }

    const { data, error } = await (supabase as any)
      .from('recurring_incomes')
      .update(body)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Receita não encontrada' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await syncLinkedIncomeTransactionsMesReferencia(supabase, user.id, id)

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    console.error('Erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { id } = await params

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { error } = await (supabase as any)
      .from('recurring_incomes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Receita recorrente deletada com sucesso' }, { status: 200 })
  } catch (error) {
    console.error('Erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
