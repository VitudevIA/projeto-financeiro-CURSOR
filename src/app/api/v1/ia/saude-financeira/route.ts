/**
 * API: Score de Saúde Financeira
 * GET /api/v1/ia/saude-financeira
 * 
 * Retorna:
 * - Score 0-100
 * - Breakdown dos componentes
 * - Tendência (up/down/stable)
 * - Categoria (excellent/good/fair/poor/critical)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { calculateHealthScore } from '@/lib/ia/health-score';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Parâmetros da query
    const searchParams = request.nextUrl.searchParams;
    const periodMonths = parseInt(searchParams.get('periodMonths') || '3', 10);
    const monthsAgo = parseInt(searchParams.get('monthsAgo') || '0', 10);

    // Calcula datas
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - periodMonths);

    // Busca transações do período atual
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        type,
        transaction_date,
        category_id,
        categories:category_id (name)
      `)
      .eq('user_id', user.id)
      .gte('transaction_date', startDate.toISOString().split('T')[0])
      .lte('transaction_date', endDate.toISOString().split('T')[0])
      .order('transaction_date', { ascending: false });

    if (transError) {
      console.error('Erro ao buscar transações:', transError);
      return NextResponse.json(
        { error: 'Erro ao buscar transações' },
        { status: 500 }
      );
    }

    // Busca orçamentos
    const { data: budgets, error: budgetError } = await supabase
      .from('budgets')
      .select('category_id, limit_amount, month')
      .eq('user_id', user.id)
      .gte('month', startDate.toISOString().split('T')[0])
      .lte('month', endDate.toISOString().split('T')[0]);

    if (budgetError) {
      console.error('Erro ao buscar orçamentos:', budgetError);
    }

    // Busca cartões
    const { data: cards, error: cardError } = await supabase
      .from('cards')
      .select('id, type, limit')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (cardError) {
      console.error('Erro ao buscar cartões:', cardError);
    }

    // Busca saldo atual (se houver tabela accounts)
    let currentBalance = 0;
    const { data: accounts } = await supabase
      .from('accounts')
      .select('balance')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (accounts) {
      currentBalance = Number(accounts.balance) || 0;
    }

    // Busca transações do período anterior para calcular tendência
    const previousEndDate = new Date(startDate);
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setMonth(previousStartDate.getMonth() - periodMonths);

    const { data: previousTransactions } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        type,
        transaction_date,
        category_id
      `)
      .eq('user_id', user.id)
      .gte('transaction_date', previousStartDate.toISOString().split('T')[0])
      .lte('transaction_date', previousEndDate.toISOString().split('T')[0]);

    // Prepara dados para cálculo
    const transactionsData = (transactions || []).map(t => ({
      amount: Number(t.amount),
      type: t.type as 'income' | 'expense',
      date: t.transaction_date,
      category_id: t.category_id,
    }));

    const budgetsData = (budgets || []).map(b => ({
      category_id: b.category_id,
      limit_amount: Number(b.limit_amount),
      month: b.month,
    }));

    const cardsData = (cards || []).map(c => ({
      type: c.type as 'credit' | 'debit',
      limit: c.limit ? Number(c.limit) : undefined,
    }));

    const previousTransactionsData = (previousTransactions || []).map(t => ({
      amount: Number(t.amount),
      type: t.type as 'income' | 'expense',
      date: t.transaction_date,
      category_id: t.category_id,
    }));

    // Calcula o score
    const result = calculateHealthScore({
      transactions: transactionsData,
      budgets: budgetsData,
      cards: cardsData,
      currentBalance,
      previousTransactions: previousTransactionsData,
      periodMonths,
    });

    // Cache headers (6h conforme PRD)
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, max-age=21600', // 6 horas
      },
    });
  } catch (error) {
    console.error('Erro ao calcular score de saúde financeira:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

