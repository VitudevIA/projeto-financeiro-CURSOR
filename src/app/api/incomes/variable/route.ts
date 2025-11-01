/**
 * API: Receitas Variáveis
 * GET /api/incomes/variable
 * 
 * Lista receitas variáveis (não recorrentes) filtradas por período
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

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

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const month = searchParams.get('month') // YYYY-MM

    let query = supabase
      .from('transactions')
      .select(`
        *,
        categories:category_id (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('type', 'income')

    // Filtra por período
    if (month) {
      const start = new Date(month + '-01')
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
      query = query
        .gte('transaction_date', start.toISOString().split('T')[0])
        .lte('transaction_date', end.toISOString().split('T')[0])
    } else if (startDate && endDate) {
      query = query
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
    } else {
      // Padrão: mês atual
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      query = query
        .gte('transaction_date', start.toISOString().split('T')[0])
        .lte('transaction_date', end.toISOString().split('T')[0])
    }

    // Ordena por data decrescente
    query = query.order('transaction_date', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar receitas variáveis:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filtra receitas que não são provisionadas (não têm notes com "Provisionado")
    const variableIncomes = (data || []).filter(
      (transaction: any) => !transaction.notes || !transaction.notes.includes('Provisionado')
    )

    return NextResponse.json({ data: variableIncomes }, { status: 200 })
  } catch (error) {
    console.error('Erro inesperado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
