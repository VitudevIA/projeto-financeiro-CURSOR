/**
 * Sistema de Benchmarking
 * Compara gastos do usuário com padrões de mercado segmentados
 */

export interface BenchmarkData {
  category_id: string;
  category_name?: string;
  userAmount: number;
  marketAverage: number;
  marketMedian: number;
  percentile: number; // 0-100, onde 0 = muito abaixo, 100 = muito acima
  categoryScore: number; // 0-100, onde 100 = excelente (gasta menos que média), 0 = crítico (gasta muito acima)
  comparison: 'much_below' | 'below' | 'average' | 'above' | 'much_above';
  savingsOpportunity?: number; // Oportunidade de economia nesta categoria
  segment?: string; // faixa etária, região, etc.
}

export interface BenchmarkSummary {
  overallScore: number; // 0-100, onde 50 = médio do mercado
  categoryBenchmarks: BenchmarkData[];
  totalUserExpenses: number;
  totalMarketAverage: number;
  savingsOpportunity?: number;
}

/**
 * Padrões de mercado simulados (em produção viriam de dados reais agregados)
 * Baseado em pesquisas e dados públicos brasileiros
 */
const MARKET_BENCHMARKS: Record<string, {
  average: number;
  median: number;
  percentiles: {
    p25: number;
    p75: number;
    p90: number;
  };
}> = {
  // Alimentação
  'food': {
    average: 600, // Média mensal per capita
    median: 500,
    percentiles: {
      p25: 350,
      p75: 750,
      p90: 1000,
    },
  },
  // Transporte
  'transport': {
    average: 450,
    median: 400,
    percentiles: {
      p25: 250,
      p75: 600,
      p90: 850,
    },
  },
  // Moradia
  'housing': {
    average: 1200,
    median: 1000,
    percentiles: {
      p25: 700,
      p75: 1500,
      p90: 2200,
    },
  },
  // Saúde
  'health': {
    average: 300,
    median: 250,
    percentiles: {
      p25: 150,
      p75: 400,
      p90: 600,
    },
  },
  // Educação
  'education': {
    average: 400,
    median: 350,
    percentiles: {
      p25: 200,
      p75: 550,
      p90: 800,
    },
  },
  // Lazer/Entretenimento
  'entertainment': {
    average: 350,
    median: 300,
    percentiles: {
      p25: 150,
      p75: 450,
      p90: 700,
    },
  },
  // Vestuário
  'clothing': {
    average: 250,
    median: 200,
    percentiles: {
      p25: 100,
      p75: 350,
      p90: 500,
    },
  },
  // Serviços (contas, internet, etc)
  'services': {
    average: 280,
    median: 250,
    percentiles: {
      p25: 180,
      p75: 350,
      p90: 500,
    },
  },
};

/**
 * Mapeia categorias para benchmarks de mercado
 */
function mapCategoryToBenchmark(categoryName: string): keyof typeof MARKET_BENCHMARKS | null {
  const name = categoryName.toLowerCase();
  
  if (name.includes('aliment') || name.includes('comida') || name.includes('restaurante') || name.includes('supermercado')) {
    return 'food';
  }
  if (name.includes('transporte') || name.includes('combustível') || name.includes('uber') || name.includes('táxi')) {
    return 'transport';
  }
  if (name.includes('moradia') || name.includes('aluguel') || name.includes('condomínio') || name.includes('ipvu')) {
    return 'housing';
  }
  if (name.includes('saúde') || name.includes('médico') || name.includes('farmácia') || name.includes('plano')) {
    return 'health';
  }
  if (name.includes('educa') || name.includes('escola') || name.includes('curso') || name.includes('faculdade')) {
    return 'education';
  }
  if (name.includes('lazer') || name.includes('entreten') || name.includes('cinema') || name.includes('shows')) {
    return 'entertainment';
  }
  if (name.includes('roupa') || name.includes('vestuário') || name.includes('moda')) {
    return 'clothing';
  }
  if (name.includes('serviço') || name.includes('conta') || name.includes('internet') || name.includes('telefone')) {
    return 'services';
  }
  
  return null;
}

/**
 * Calcula percentil baseado nos valores de mercado
 */
function calculatePercentile(
  userAmount: number,
  benchmark: typeof MARKET_BENCHMARKS[keyof typeof MARKET_BENCHMARKS]
): number {
  if (userAmount <= benchmark.percentiles.p25) {
    // Abaixo do P25 - linear de 0 a 25
    return (userAmount / benchmark.percentiles.p25) * 25;
  } else if (userAmount <= benchmark.median) {
    // Entre P25 e mediana - linear de 25 a 50
    return 25 + ((userAmount - benchmark.percentiles.p25) / (benchmark.median - benchmark.percentiles.p25)) * 25;
  } else if (userAmount <= benchmark.percentiles.p75) {
    // Entre mediana e P75 - linear de 50 a 75
    return 50 + ((userAmount - benchmark.median) / (benchmark.percentiles.p75 - benchmark.median)) * 25;
  } else if (userAmount <= benchmark.percentiles.p90) {
    // Entre P75 e P90 - linear de 75 a 90
    return 75 + ((userAmount - benchmark.percentiles.p75) / (benchmark.percentiles.p90 - benchmark.percentiles.p75)) * 15;
  } else {
    // Acima do P90 - escala até 100
    const excess = userAmount - benchmark.percentiles.p90;
    const maxReasonable = benchmark.percentiles.p90 * 2; // Considera até 2x do P90 como máximo
    return Math.min(100, 90 + (excess / maxReasonable) * 10);
  }
}

/**
 * Determina comparação baseada no percentil
 */
function getComparison(percentile: number): BenchmarkData['comparison'] {
  if (percentile < 20) return 'much_below';
  if (percentile < 40) return 'below';
  if (percentile < 60) return 'average';
  if (percentile < 80) return 'above';
  return 'much_above';
}

/**
 * Calcula score da categoria (0-100)
 * Score alto = gasta menos que a média = BOM
 * Score baixo = gasta muito acima da média = RUIM
 */
function calculateCategoryScore(
  userAmount: number,
  marketAverage: number,
  percentile: number
): number {
  // Se está abaixo da média (percentil baixo), score alto (bom)
  // Se está acima da média (percentil alto), score baixo (ruim)
  
  // Inverte a lógica: percentil baixo = score alto
  // Percentil 0-20 (muito abaixo da média) = Score 80-100 (excelente)
  // Percentil 20-40 (abaixo da média) = Score 60-80 (bom)
  // Percentil 40-60 (na média) = Score 40-60 (regular)
  // Percentil 60-80 (acima da média) = Score 20-40 (ruim)
  // Percentil 80-100 (muito acima) = Score 0-20 (crítico)
  
  if (percentile <= 20) {
    // Muito abaixo da média - Score excelente (80-100)
    return 80 + (percentile / 20) * 20;
  } else if (percentile <= 40) {
    // Abaixo da média - Score bom (60-80)
    return 60 + ((percentile - 20) / 20) * 20;
  } else if (percentile <= 60) {
    // Na média - Score regular (40-60)
    return 40 + ((percentile - 40) / 20) * 20;
  } else if (percentile <= 80) {
    // Acima da média - Score ruim (20-40)
    return 20 + ((percentile - 60) / 20) * 20;
  } else {
    // Muito acima da média - Score crítico (0-20)
    return Math.max(0, 20 - ((percentile - 80) / 20) * 20);
  }
}

/**
 * Gera benchmarking comparando gastos do usuário com padrões de mercado
 */
export function generateBenchmark(params: {
  categoryExpenses: Array<{
    category_id: string;
    category_name?: string;
    total: number;
  }>;
  segment?: {
    ageRange?: string;
    region?: string;
    incomeRange?: string;
  };
}): BenchmarkSummary {
  const { categoryExpenses, segment } = params;
  
  const benchmarks: BenchmarkData[] = [];
  let totalUserExpenses = 0;
  let totalMarketAverage = 0;
  let totalSavingsOpportunity = 0;

  categoryExpenses.forEach(({ category_id, category_name, total }) => {
    totalUserExpenses += total;
    
    const benchmarkKey = category_name ? mapCategoryToBenchmark(category_name) : null;
    
    if (benchmarkKey && MARKET_BENCHMARKS[benchmarkKey]) {
      const benchmark = MARKET_BENCHMARKS[benchmarkKey];
      totalMarketAverage += benchmark.average;
      
      const percentile = calculatePercentile(total, benchmark);
      const comparison = getComparison(percentile);
      const categoryScore = calculateCategoryScore(total, benchmark.average, percentile);
      
      // Calcula oportunidade de economia (se está acima da média)
      let categorySavingsOpportunity: number | undefined;
      if (total > benchmark.average) {
        const excess = total - benchmark.average;
        categorySavingsOpportunity = excess * 0.3; // 30% do excedente pode ser economizado
        totalSavingsOpportunity += categorySavingsOpportunity;
      }
      
      benchmarks.push({
        category_id,
        category_name,
        userAmount: total,
        marketAverage: benchmark.average,
        marketMedian: benchmark.median,
        percentile: Math.round(percentile),
        categoryScore: Math.round(categoryScore),
        comparison,
        savingsOpportunity: categorySavingsOpportunity,
        segment: segment ? `${segment.ageRange || ''} ${segment.region || ''}`.trim() : undefined,
      });
    } else {
      // Categoria sem benchmark específico - usa média geral
      const defaultBenchmark = 300; // R$ 300/mês padrão
      totalMarketAverage += defaultBenchmark;
      
      const defaultPercentile = total > defaultBenchmark ? 60 : 40;
      const defaultCategoryScore = calculateCategoryScore(total, defaultBenchmark, defaultPercentile);
      
      benchmarks.push({
        category_id,
        category_name,
        userAmount: total,
        marketAverage: defaultBenchmark,
        marketMedian: defaultBenchmark,
        percentile: defaultPercentile,
        categoryScore: Math.round(defaultCategoryScore),
        comparison: total > defaultBenchmark ? 'above' : 'below',
      });
    }
  });

  // Calcula score geral (50 = médio do mercado)
  const overallRatio = totalMarketAverage > 0 
    ? totalUserExpenses / totalMarketAverage 
    : 1;
  
  // Normaliza para escala 0-100 onde 50 = média
  let overallScore: number;
  if (overallRatio <= 0.5) {
    overallScore = overallRatio * 100; // 0-50 se abaixo da metade
  } else if (overallRatio <= 1.5) {
    overallScore = 50 + (overallRatio - 0.5) * 50; // 50-100 se entre 0.5x e 1.5x
  } else {
    overallScore = Math.min(100, 100 + (overallRatio - 1.5) * 20); // Acima de 1.5x = 100+
  }

  // Ordena por desvio da média (maiores desvios primeiro)
  benchmarks.sort((a, b) => {
    const deviationA = Math.abs(a.userAmount - a.marketAverage);
    const deviationB = Math.abs(b.userAmount - b.marketAverage);
    return deviationB - deviationA;
  });

  return {
    overallScore: Math.round(overallScore),
    categoryBenchmarks: benchmarks,
    totalUserExpenses,
    totalMarketAverage,
    savingsOpportunity: totalSavingsOpportunity > 0 ? Math.round(totalSavingsOpportunity) : undefined,
  };
}

