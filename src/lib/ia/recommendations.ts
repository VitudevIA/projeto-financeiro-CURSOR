/**
 * Sistema de Recomendações Inteligentes
 * Gera sugestões acionáveis baseadas na análise dos dados
 */

export interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: 'savings' | 'spending' | 'budget' | 'debt' | 'investment';
  title: string;
  description: string;
  impact: {
    potentialSavings?: number;
    timeToImplement: 'immediate' | 'short' | 'medium' | 'long';
    effort: 'low' | 'medium' | 'high';
  };
  actionSteps: string[];
  estimatedBenefit?: string;
}

interface TransactionData {
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category_id: string;
  category_name?: string;
}

interface BudgetData {
  category_id: string;
  limit_amount: number;
}

interface HealthScoreData {
  score: number;
  breakdown: {
    controleGastos: number;
    poupancaReservas: number;
    previsibilidade: number;
    dividas: number;
    diversificacao: number;
  };
}

/**
 * Gera recomendações personalizadas baseadas nos dados do usuário
 */
export function generateRecommendations(params: {
  transactions: TransactionData[];
  budgets: BudgetData[];
  healthScore: HealthScoreData;
  totalIncome: number;
  totalExpenses: number;
  topCategories: Array<{ category_id: string; category_name?: string; total: number }>;
}): Recommendation[] {
  const recommendations: Recommendation[] = [];

  const {
    transactions,
    budgets,
    healthScore,
    totalIncome,
    totalExpenses,
    topCategories,
  } = params;

  // 1. Recomendações baseadas no score de saúde
  recommendations.push(...generateHealthScoreRecommendations(healthScore, totalIncome));

  // 2. Recomendações de poupança
  const savingsRate = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;
  if (savingsRate < 0.2) {
    recommendations.push(...generateSavingsRecommendations(
      savingsRate,
      totalIncome,
      totalExpenses
    ));
  }

  // 3. Recomendações de orçamento
  recommendations.push(...generateBudgetRecommendations(
    transactions,
    budgets,
    topCategories
  ));

  // 4. Recomendações de dívidas (se aplicável)
  if (healthScore.breakdown.dividas < 10) {
    recommendations.push(...generateDebtRecommendations(healthScore.breakdown.dividas));
  }

  // 5. Recomendações de categorias
  recommendations.push(...generateCategoryRecommendations(topCategories, totalExpenses));

  // Ordena por prioridade
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return recommendations.sort((a, b) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return (b.impact.potentialSavings || 0) - (a.impact.potentialSavings || 0);
  });
}

/**
 * Recomendações baseadas no score de saúde
 */
function generateHealthScoreRecommendations(
  healthScore: HealthScoreData,
  totalIncome: number
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Score baixo de controle de gastos
  if (healthScore.breakdown.controleGastos < 20) {
    recommendations.push({
      id: 'rec-control-spending',
      priority: 'high',
      category: 'spending',
      title: 'Melhore o Controle de Gastos',
      description: 'Seus gastos estão acima do ideal. Criar orçamentos pode ajudar significativamente.',
      impact: {
        potentialSavings: 500,
        timeToImplement: 'short',
        effort: 'low',
      },
      actionSteps: [
        'Crie orçamentos mensais para as principais categorias',
        'Use alertas quando estiver próximo do limite',
        'Revise gastos semanalmente',
      ],
      estimatedBenefit: 'Potencial de economia de R$ 300-800/mês',
    });
  }

  // Score baixo de poupança
  if (healthScore.breakdown.poupancaReservas < 15) {
    recommendations.push({
      id: 'rec-increase-savings',
      priority: 'high',
      category: 'savings',
      title: 'Aumente Sua Poupança',
      description: 'Você está gastando mais do que deveria. Meta ideal: 20% da renda em poupança.',
      impact: {
        potentialSavings: totalIncome * 0.15, // 15% da renda
        timeToImplement: 'medium',
        effort: 'medium',
      },
      actionSteps: [
        'Reduza gastos não essenciais em 15-20%',
        'Automatize transferências para poupança',
        'Crie uma reserva de emergência de 6 meses',
      ],
      estimatedBenefit: `Economia de R$ ${(totalIncome * 0.15).toFixed(2)}/mês`,
    });
  }

  // Score baixo de previsibilidade
  if (healthScore.breakdown.previsibilidade < 12) {
    recommendations.push({
      id: 'rec-improve-predictability',
      priority: 'medium',
      category: 'budget',
      title: 'Torne Seus Gastos Mais Previsíveis',
      description: 'Gastos muito variáveis dificultam o planejamento financeiro.',
      impact: {
        timeToImplement: 'medium',
        effort: 'medium',
      },
      actionSteps: [
        'Identifique e categorize todos os gastos recorrentes',
        'Use a função de transações recorrentes',
        'Estabeleça limites claros para gastos variáveis',
      ],
      estimatedBenefit: 'Melhor planejamento e menos surpresas',
    });
  }

  return recommendations;
}

function generateSavingsRecommendations(
  savingsRate: number,
  totalIncome: number,
  totalExpenses: number
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const deficit = totalExpenses - totalIncome;

  if (deficit > 0) {
    recommendations.push({
      id: 'rec-stop-deficit',
      priority: 'high',
      category: 'spending',
      title: '⚠️ Você Está Gastando Mais do que Ganha',
      description: `Seu déficit mensal é de R$ ${deficit.toFixed(2)}. Isso não é sustentável a longo prazo.`,
      impact: {
        potentialSavings: deficit,
        timeToImplement: 'immediate',
        effort: 'high',
      },
      actionSteps: [
        'Identifique os 3 maiores gastos não essenciais',
        'Reduza ou elimine pelo menos R$ 200-300/mês',
        'Considere fontes alternativas de renda',
      ],
      estimatedBenefit: `Eliminar déficit de R$ ${deficit.toFixed(2)}/mês`,
    });
  }

  return recommendations;
}

function generateBudgetRecommendations(
  transactions: TransactionData[],
  budgets: BudgetData[],
  topCategories: Array<{ category_id: string; category_name?: string; total: number }>
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Recomenda criar orçamentos para categorias sem orçamento
  const budgetCategoryIds = new Set(budgets.map(b => b.category_id));
  const categoriesWithoutBudget = topCategories.filter(
    cat => !budgetCategoryIds.has(cat.category_id) && cat.total > 200
  );

  if (categoriesWithoutBudget.length > 0) {
    const totalUnbudgeted = categoriesWithoutBudget.reduce(
      (sum, cat) => sum + cat.total,
      0
    );

    recommendations.push({
      id: 'rec-create-budgets',
      priority: 'medium',
      category: 'budget',
      title: 'Crie Orçamentos para Categorias Principais',
      description: `${categoriesWithoutBudget.length} categoria(s) importante(s) sem orçamento definido.`,
      impact: {
        potentialSavings: totalUnbudgeted * 0.1, // 10% de economia
        timeToImplement: 'short',
        effort: 'low',
      },
      actionSteps: [
        `Crie orçamentos para: ${categoriesWithoutBudget.map(c => c.category_name || 'categoria').join(', ')}`,
        'Configure alertas em 80% do limite',
        'Revise mensalmente e ajuste conforme necessário',
      ],
      estimatedBenefit: `Potencial economia de R$ ${(totalUnbudgeted * 0.1).toFixed(2)}/mês`,
    });
  }

  return recommendations;
}

function generateDebtRecommendations(debtScore: number): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (debtScore < 7) {
    recommendations.push({
      id: 'rec-reduce-debt',
      priority: 'high',
      category: 'debt',
      title: 'Reduza a Utilização de Cartões de Crédito',
      description: 'Alta utilização de crédito pode levar a problemas financeiros.',
      impact: {
        potentialSavings: 300,
        timeToImplement: 'medium',
        effort: 'medium',
      },
      actionSteps: [
        'Pare de usar cartões até reduzir a utilização para <50%',
        'Priorize pagamento de dívidas com maiores juros',
        'Considere consolidar dívidas',
      ],
      estimatedBenefit: 'Redução de juros e melhora no score de crédito',
    });
  }

  return recommendations;
}

function generateCategoryRecommendations(
  topCategories: Array<{ category_id: string; category_name?: string; total: number }>,
  totalExpenses: number
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Identifica categorias que consomem muito (>30% do total)
  const highConsumptionCategories = topCategories.filter(
    cat => cat.total / totalExpenses > 0.3
  );

  if (highConsumptionCategories.length > 0) {
    highConsumptionCategories.forEach(cat => {
      const percentage = (cat.total / totalExpenses) * 100;
      recommendations.push({
        id: `rec-diversify-${cat.category_id}`,
        priority: 'medium',
        category: 'spending',
        title: `Diversifique Seus Gastos - ${cat.category_name || 'Categoria'}`,
        description: `Esta categoria representa ${percentage.toFixed(0)}% de todos os seus gastos. Considere diversificar.`,
        impact: {
          potentialSavings: cat.total * 0.15, // 15% de redução
          timeToImplement: 'long',
          effort: 'high',
        },
        actionSteps: [
          `Revise gastos em ${cat.category_name || 'esta categoria'}`,
          'Identifique alternativas mais econômicas',
          'Reduza gradualmente em 10-15% ao longo de 3 meses',
        ],
        estimatedBenefit: `Economia potencial de R$ ${(cat.total * 0.15).toFixed(2)}/mês`,
      });
    });
  }

  return recommendations;
}


