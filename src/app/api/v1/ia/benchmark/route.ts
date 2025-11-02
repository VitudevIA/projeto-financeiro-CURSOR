/**
 * API: Benchmarking com Padrões de Mercado
 * GET /api/v1/ia/benchmark
 * 
 * Compara gastos do usuário com padrões de mercado segmentados
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateBenchmark } from '@/lib/ia/benchmark';

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

    // Calcula datas
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - periodMonths);

    // Busca transações
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select(`
        amount,
        category_id,
        categories:category_id (name)
      `)
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('transaction_date', startDate.toISOString().split('T')[0])
      .lte('transaction_date', endDate.toISOString().split('T')[0]);

    if (transError) {
      console.error('Erro ao buscar transações:', transError);
      return NextResponse.json(
        { error: 'Erro ao buscar transações' },
        { status: 500 }
      );
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        {
          overallScore: 50,
          categoryBenchmarks: [],
          totalUserExpenses: 0,
          totalMarketAverage: 0,
          message: 'Sem dados suficientes para benchmarking',
        },
        { status: 200 }
      );
    }

    // Agrupa por categoria
    const categoryMap = new Map<string, { category_id: string; category_name?: string; total: number }>();
    transactions.forEach(t => {
      const categoryId = t.category_id;
      const existing = categoryMap.get(categoryId) || {
        category_id: categoryId,
        category_name: (t.categories as any)?.name,
        total: 0,
      };
      existing.total += Number(t.amount);
      categoryMap.set(categoryId, existing);
    });

    // Calcula médias mensais (divide pelo número de meses)
    const categoryExpenses = Array.from(categoryMap.values()).map(cat => ({
      category_id: cat.category_id,
      category_name: cat.category_name,
      total: cat.total / periodMonths, // Média mensal
    }));

    // Gera benchmark (segmentação pode ser adicionada depois com dados do usuário)
    const benchmark = generateBenchmark({
      categoryExpenses,
      // segment: {
      //   ageRange: '25-35',
      //   region: 'Brasil',
      //   incomeRange: 'R$ 3000-5000',
      // },
    });

    // Cache headers (7 dias conforme PRD)
    return NextResponse.json(benchmark, {
      headers: {
        'Cache-Control': 'private, max-age=604800', // 7 dias
      },
    });
  } catch (error) {
    console.error('Erro ao gerar benchmark:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

