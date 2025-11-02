/**
 * API: Recomendações Inteligentes
 * GET /api/v1/ia/recomendacoes
 * 
 * Retorna recomendações priorizadas baseadas na análise dos dados
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateRecommendations } from '@/lib/ia/recommendations';
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
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Calcula datas
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - periodMonths);

    // Busca transações
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

    // Busca cartões
    const { data: cards } = await supabase
      .from('cards')
      .select('id, type, limit')
      .eq('user_id', user.id)
      .eq('is_active', true);

    // Calcula totais
    const totalIncome = (transactions || [])
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = (transactions || [])
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Agrupa por categoria (top categorias)
    const categoryMap = new Map<string, { category_id: string; category_name?: string; total: number }>();
    (transactions || [])
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const existing = categoryMap.get(t.category_id) || {
          category_id: t.category_id,
          category_name: (t.categories as any)?.name,
          total: 0,
        };
        existing.total += Number(t.amount);
        categoryMap.set(t.category_id, existing);
      });

    const topCategories = Array.from(categoryMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Calcula score de saúde (necessário para recomendações)
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

    const healthScore = calculateHealthScore({
      transactions: transactionsData,
      budgets: budgetsData,
      cards: cardsData,
      periodMonths,
    });

    // Gera recomendações
    const recommendations = generateRecommendations({
      transactions: transactionsData,
      budgets: budgetsData,
      healthScore,
      totalIncome,
      totalExpenses,
      topCategories,
    });

    // Limita quantidade
    const limitedRecommendations = recommendations.slice(0, limit);

    // Cache headers (12h conforme PRD)
    return NextResponse.json(
      {
        recommendations: limitedRecommendations,
        count: limitedRecommendations.length,
        total: recommendations.length,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=43200', // 12 horas
        },
      }
    );
  } catch (error) {
    console.error('Erro ao gerar recomendações:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

