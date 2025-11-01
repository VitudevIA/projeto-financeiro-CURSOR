/**
 * API: Previsão de Despesas (Versão Básica - MVP)
 * GET /api/v1/ia/previsao
 * 
 * Retorna projeções de gastos para próximos 1-6 meses
 * Algoritmo: Média móvel ponderada (simplificado para MVP)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface ForecastPeriod {
  month: string; // YYYY-MM
  predictedExpenses: number;
  predictedIncome: number;
  confidence: 'high' | 'medium' | 'low';
  confidenceInterval: {
    min: number;
    max: number;
  };
}

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
    const months = parseInt(searchParams.get('months') || '3', 10);
    const historyMonths = parseInt(searchParams.get('historyMonths') || '6', 10);

    // Limita a 6 meses conforme PRD
    const forecastMonths = Math.min(6, Math.max(1, months));
    const historicalPeriod = Math.max(3, Math.min(12, historyMonths));

    // Calcula datas históricas
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - historicalPeriod);

    // Busca transações históricas
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('amount, type, transaction_date')
      .eq('user_id', user.id)
      .gte('transaction_date', startDate.toISOString().split('T')[0])
      .lte('transaction_date', endDate.toISOString().split('T')[0])
      .order('transaction_date', { ascending: true });

    if (transError) {
      console.error('Erro ao buscar transações:', transError);
      return NextResponse.json(
        { error: 'Erro ao buscar transações' },
        { status: 500 }
      );
    }

    if (!transactions || transactions.length < 3) {
      return NextResponse.json(
        {
          forecast: [],
          message: 'Dados insuficientes para fazer previsões. Precisa de pelo menos 3 meses de histórico.',
        },
        { status: 200 }
      );
    }

    // Agrupa por mês
    const monthlyData = new Map<string, { income: number; expenses: number; count: number }>();
    (transactions || []).forEach(t => {
      const month = t.transaction_date.substring(0, 7); // YYYY-MM
      const current = monthlyData.get(month) || { income: 0, expenses: 0, count: 0 };
      if (t.type === 'income') {
        current.income += Number(t.amount);
      } else {
        current.expenses += Number(t.amount);
      }
      current.count += 1;
      monthlyData.set(month, current);
    });

    const monthlyArray = Array.from(monthlyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({ month, ...data }));

    if (monthlyArray.length === 0) {
      return NextResponse.json(
        { forecast: [], message: 'Sem dados para análise' },
        { status: 200 }
      );
    }

    // Calcula médias (média móvel ponderada simples)
    const avgExpenses = monthlyArray.reduce((sum, m) => sum + m.expenses, 0) / monthlyArray.length;
    const avgIncome = monthlyArray.reduce((sum, m) => sum + m.income, 0) / monthlyArray.length;

    // Calcula tendência (linear regression simples)
    const n = monthlyArray.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    monthlyArray.forEach((month, index) => {
      const x = index;
      const y = month.expenses;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slopeExpenses = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const interceptExpenses = (sumY - slopeExpenses * sumX) / n;

    // Calcula variância para intervalo de confiança
    const variance = monthlyArray.reduce((sum, m) => {
      const diff = m.expenses - avgExpenses;
      return sum + diff * diff;
    }, 0) / monthlyArray.length;
    const stdDev = Math.sqrt(variance);

    // Gera previsões
    const forecast: ForecastPeriod[] = [];
    const lastMonth = monthlyArray[monthlyArray.length - 1];

    for (let i = 1; i <= forecastMonths; i++) {
      const forecastMonth = new Date(endDate);
      forecastMonth.setMonth(forecastMonth.getMonth() + i);
      const monthStr = `${forecastMonth.getFullYear()}-${String(forecastMonth.getMonth() + 1).padStart(2, '0')}`;

      // Previsão baseada em tendência
      const predictedExpenses = Math.max(0, interceptExpenses + slopeExpenses * (monthlyArray.length + i - 1));
      const predictedIncome = avgIncome; // Mantém receita constante (simplificado)

      // Intervalo de confiança (±1.5σ para 87% de confiança aproximada)
      const margin = stdDev * 1.5;
      const confidenceInterval = {
        min: Math.max(0, predictedExpenses - margin),
        max: predictedExpenses + margin,
      };

      // Determina nível de confiança
      let confidence: 'high' | 'medium' | 'low';
      const relativeUncertainty = margin / (predictedExpenses || 1);
      if (relativeUncertainty < 0.15) confidence = 'high';
      else if (relativeUncertainty < 0.3) confidence = 'medium';
      else confidence = 'low';

      forecast.push({
        month: monthStr,
        predictedExpenses: Math.round(predictedExpenses * 100) / 100,
        predictedIncome: Math.round(predictedIncome * 100) / 100,
        confidence,
        confidenceInterval: {
          min: Math.round(confidenceInterval.min * 100) / 100,
          max: Math.round(confidenceInterval.max * 100) / 100,
        },
      });
    }

    // Cache headers (24h conforme PRD)
    return NextResponse.json(
      {
        forecast,
        metadata: {
          historicalPeriods: monthlyArray.length,
          forecastPeriods: forecastMonths,
          avgMonthlyExpenses: Math.round(avgExpenses * 100) / 100,
          avgMonthlyIncome: Math.round(avgIncome * 100) / 100,
          trend: slopeExpenses > 0 ? 'increasing' : slopeExpenses < 0 ? 'decreasing' : 'stable',
        },
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=86400', // 24 horas
        },
      }
    );
  } catch (error) {
    console.error('Erro ao gerar previsão:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

