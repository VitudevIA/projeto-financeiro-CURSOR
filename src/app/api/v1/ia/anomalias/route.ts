/**
 * API: Detecção de Anomalias
 * GET /api/v1/ia/anomalias
 * 
 * Retorna lista de anomalias detectadas nos gastos do usuário
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { detectAnomalies } from '@/lib/ia/anomaly-detection';

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
    const severity = searchParams.get('severity') as 'critical' | 'high' | 'moderate' | null;

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
        description,
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
      .select('category_id, limit_amount')
      .eq('user_id', user.id)
      .gte('month', startDate.toISOString().split('T')[0])
      .lte('month', endDate.toISOString().split('T')[0]);

    if (budgetError) {
      console.error('Erro ao buscar orçamentos:', budgetError);
    }

    // Prepara dados
    const transactionsData = (transactions || []).map(t => ({
      id: t.id,
      amount: Number(t.amount),
      type: t.type as 'income' | 'expense',
      date: t.transaction_date,
      category_id: t.category_id,
      category_name: (t.categories as any)?.name,
      description: t.description || '',
    }));

    const budgetsData = (budgets || []).map(b => ({
      category_id: b.category_id,
      limit_amount: Number(b.limit_amount),
    }));

    // Detecta anomalias
    let anomalies = detectAnomalies({
      transactions: transactionsData,
      budgets: budgetsData,
      periodMonths,
    });

    // Filtra por severidade se especificado
    if (severity) {
      anomalies = anomalies.filter(a => a.severity === severity);
    }

    // Cache headers (12h conforme PRD para recomendações, mas anomalias mudam mais rápido)
    return NextResponse.json(
      { anomalies, count: anomalies.length },
      {
        headers: {
          'Cache-Control': 'private, max-age=3600', // 1 hora (anomalias são mais dinâmicas)
        },
      }
    );
  } catch (error) {
    console.error('Erro ao detectar anomalias:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

