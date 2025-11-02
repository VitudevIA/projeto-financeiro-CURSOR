/**
 * API: Receitas Recorrentes
 * GET /api/incomes/recurring - Listar receitas recorrentes
 * POST /api/incomes/recurring - Criar receita recorrente
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { RecurringIncomeInsert } from '@/types/database.types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar receitas recorrentes:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    console.error('Erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
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

    const body: RecurringIncomeInsert = await request.json()

    // Validações
    if (!body.description || !body.amount || !body.day_of_month) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
    }

    // Se não houver category_id, busca ou cria uma categoria padrão
    let categoryId = body.category_id
    if (!categoryId) {
      // Busca primeira categoria de receita do usuário
      const { data: userCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', user.id)
        .or('type.is.null,type.eq.income')
        .limit(1)
        .single()

      if (userCategory) {
        categoryId = userCategory.id
      } else {
        // Cria uma categoria padrão automaticamente
        const { data: newCategory, error: createError } = await supabase
          .from('categories')
          .insert([
            {
              name: 'Receita',
              type: 'income',
              user_id: user.id,
            },
          ])
          .select('id')
          .single()

        if (createError || !newCategory) {
          return NextResponse.json(
            { error: 'Erro ao criar categoria padrão. Por favor, crie uma categoria manualmente primeiro.' },
            { status: 500 }
          )
        }

        categoryId = newCategory.id
      }
    }

    if (body.day_of_month < 1 || body.day_of_month > 31) {
      return NextResponse.json({ error: 'Dia do mês deve estar entre 1 e 31' }, { status: 400 })
    }

    if (body.amount <= 0) {
      return NextResponse.json({ error: 'Valor deve ser maior que zero' }, { status: 400 })
    }

    const insertData: RecurringIncomeInsert = {
      ...body,
      category_id: categoryId,
      user_id: user.id,
      start_date: body.start_date || new Date().toISOString().split('T')[0],
      is_active: body.is_active !== undefined ? body.is_active : true,
    }

    const { data, error } = await (supabase as any)
      .from('recurring_incomes')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar receita recorrente:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
