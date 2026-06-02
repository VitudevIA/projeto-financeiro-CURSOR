/**
 * API: Previsão de Despesas (Versão Básica - MVP)
 * GET /api/v1/ia/previsao
 * 
 * Retorna projeções de gastos para próximos 1-6 meses
 * Algoritmo: Média móvel ponderada (simplificado para MVP)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  addMonthsToMesReferencia,
  getCurrentMesReferencia,
} from '@/utils/mes-referencia';

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

    const currentMesReferencia = getCurrentMesReferencia();
    const minMesReferencia = addMonthsToMesReferencia(
      currentMesReferencia,
      -(historicalPeriod - 1)
    );
    const maxMesReferencia = addMonthsToMesReferencia(
      currentMesReferencia,
      forecastMonths
    );

    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('amount, type, mes_referencia')
      .eq('user_id', user.id)
      .gte('mes_referencia', minMesReferencia)
      .lte('mes_referencia', maxMesReferencia)
      .order('mes_referencia', { ascending: true });

    if (transError) {
      console.error('Erro ao buscar transações:', transError);
      return NextResponse.json(
        { error: 'Erro ao buscar transações' },
        { status: 500 }
      );
    }

    // Agrupa por competência (mes_referencia), incluindo parcelas futuras já indexadas
    const monthlyData = new Map<string, { income: number; expenses: number; count: number }>();
    (transactions || []).forEach(t => {
      const month = t.mes_referencia;
      if (!month) return;
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

    const historicalArray = monthlyArray.filter(
      (m) => m.month <= currentMesReferencia
    );

    if (historicalArray.length < 3) {
      return NextResponse.json(
        {
          forecast: [],
          message: 'Dados insuficientes para fazer previsões. Precisa de pelo menos 3 meses de histórico.',
        },
        { status: 200 }
      );
    }

    // Calcula médias (média móvel ponderada simples) — somente competências passadas/atuais
    const avgExpenses =
      historicalArray.reduce((sum, m) => sum + m.expenses, 0) / historicalArray.length;
    const avgIncome =
      historicalArray.reduce((sum, m) => sum + m.income, 0) / historicalArray.length;

    // Calcula tendência (linear regression simples)
    const n = historicalArray.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    historicalArray.forEach((month, index) => {
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
    const variance =
      historicalArray.reduce((sum, m) => {
        const diff = m.expenses - avgExpenses;
        return sum + diff * diff;
      }, 0) / historicalArray.length;
    const stdDev = Math.sqrt(variance);

    // Gera previsões
    const forecast: ForecastPeriod[] = [];

    for (let i = 1; i <= forecastMonths; i++) {
      const monthStr = addMonthsToMesReferencia(currentMesReferencia, i);

      const trendPredicted = Math.max(
        0,
        interceptExpenses + slopeExpenses * (historicalArray.length + i - 1)
      );
      const knownCommitted = monthlyData.get(monthStr)?.expenses ?? 0;
      const knownIncome = monthlyData.get(monthStr)?.income ?? 0;

      // Parcelas futuras já indexadas na competência de destino elevam o piso da previsão
      const predictedExpenses = Math.max(knownCommitted, trendPredicted);
      const predictedIncome = knownIncome > 0 ? knownIncome : avgIncome;

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
          historicalPeriods: historicalArray.length,
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

