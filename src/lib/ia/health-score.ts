/**
 * Cálculo do Score de Saúde Financeira (0-100)
 * Conforme PRD: 5 componentes com pesos específicos
 */

export interface HealthScoreBreakdown {
  controleGastos: number; // 30 pontos
  poupancaReservas: number; // 25 pontos
  previsibilidade: number; // 20 pontos
  dividas: number; // 15 pontos
  diversificacao: number; // 10 pontos
}

export interface HealthScoreResult {
  score: number; // 0-100
  breakdown: HealthScoreBreakdown;
  trend: 'up' | 'down' | 'stable';
  previousScore?: number;
  category: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
}

interface TransactionData {
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category_id: string;
}

interface BudgetData {
  category_id: string;
  limit_amount: number;
  month: string;
}

interface CardData {
  limit?: number;
  type: 'credit' | 'debit';
}

/**
 * Calcula score de controle de gastos (30 pontos)
 */
function calculateExpenseControl(
  transactions: TransactionData[],
  budgets: BudgetData[],
  periodMonths: number = 3
): number {
  const expenses = transactions
    .filter(t => t.type === 'expense')
    .map(t => Number(t.amount));

  if (expenses.length === 0) return 30; // Sem gastos = controle perfeito

  const totalExpenses = expenses.reduce((sum, a) => sum + a, 0);
  const avgMonthlyExpense = totalExpenses / periodMonths;

  // Verifica se está dentro dos orçamentos
  let withinBudgetCount = 0;
  const budgetMap = new Map<string, number>();
  budgets.forEach(b => {
    const existing = budgetMap.get(b.category_id) || 0;
    budgetMap.set(b.category_id, existing + Number(b.limit_amount));
  });

  // Calcula desvio médio dos orçamentos (simplificado)
  const budgetCompliance = budgets.length > 0 ? 0.8 : 0.5; // 80% compliance se tem budget

  // Calcula estabilidade (menos variância = melhor)
  const variance = calculateVariance(expenses);
  const stabilityScore = Math.max(0, 1 - (variance / (avgMonthlyExpense * avgMonthlyExpense || 1)));

  // Combina compliance com estabilidade
  const score = (budgetCompliance * 0.6 + stabilityScore * 0.4) * 30;
  return Math.min(30, Math.max(0, score));
}

/**
 * Calcula score de poupança e reservas (25 pontos)
 */
function calculateSavings(
  transactions: TransactionData[],
  currentBalance: number = 0,
  periodMonths: number = 3
): number {
  const incomes = transactions
    .filter(t => t.type === 'income')
    .map(t => Number(t.amount))
    .reduce((sum, a) => sum + a, 0);

  const expenses = transactions
    .filter(t => t.type === 'expense')
    .map(t => Number(t.amount))
    .reduce((sum, a) => sum + a, 0);

  const savings = incomes - expenses;

  // Meta: 20% da renda em poupança
  const savingsRate = incomes > 0 ? savings / incomes : 0;
  const savingsTarget = 0.2; // 20%

  // Score baseado na taxa de poupança
  let score = 0;
  if (savingsRate >= savingsTarget) {
    score = 25; // Meta atingida ou superada
  } else if (savingsRate >= savingsTarget * 0.5) {
    score = 15 + (savingsRate / savingsTarget) * 10; // Entre 50% e 100% da meta
  } else if (savingsRate > 0) {
    score = (savingsRate / (savingsTarget * 0.5)) * 15; // Entre 0 e 50% da meta
  } else {
    score = Math.max(0, 5 + (currentBalance > 0 ? 5 : 0)); // Despesas > receitas
  }

  // Bônus por ter reserva de emergência (6 meses de despesas)
  const monthlyExpenses = expenses / periodMonths;
  const emergencyFundMonths = monthlyExpenses > 0 ? currentBalance / monthlyExpenses : 0;
  if (emergencyFundMonths >= 6) {
    score = Math.min(25, score + 5); // Bônus de +5 pontos
  }

  return Math.min(25, Math.max(0, score));
}

/**
 * Calcula score de previsibilidade (20 pontos)
 */
function calculatePredictability(
  transactions: TransactionData[],
  periodMonths: number = 3
): number {
  if (transactions.length < 6) return 10; // Poucos dados

  // Agrupa por mês
  const monthlyData = new Map<string, number[]>();
  transactions.forEach(t => {
    const month = t.date.substring(0, 7); // YYYY-MM
    if (!monthlyData.has(month)) {
      monthlyData.set(month, []);
    }
    const amount = t.type === 'expense' ? -Number(t.amount) : Number(t.amount);
    monthlyData.get(month)!.push(amount);
  });

  if (monthlyData.size < 2) return 10;

  const monthlyTotals = Array.from(monthlyData.values()).map(
    amounts => amounts.reduce((sum, a) => sum + a, 0)
  );

  // Menor variância = maior previsibilidade
  const variance = calculateVariance(monthlyTotals);
  const mean = monthlyTotals.reduce((sum, a) => sum + a, 0) / monthlyTotals.length;
  const coefficientOfVariation = mean !== 0 ? Math.sqrt(variance) / Math.abs(mean) : 1;

  // Score inverso ao coeficiente de variação
  const score = Math.max(0, 20 * (1 - Math.min(1, coefficientOfVariation)));
  return score;
}

/**
 * Calcula score de dívidas (15 pontos)
 */
function calculateDebtScore(
  cards: CardData[],
  transactions: TransactionData[]
): number {
  const creditCards = cards.filter(c => c.type === 'credit');
  
  if (creditCards.length === 0) return 15; // Sem cartões = sem dívidas

  // Calcula utilização média dos cartões
  const totalLimit = creditCards.reduce(
    (sum, c) => sum + (Number(c.limit) || 0),
    0
  );

  if (totalLimit === 0) return 10;

  // Estima utilização baseada em transações recentes
  const recentExpenses = transactions
    .filter(t => t.type === 'expense')
    .slice(-30) // Últimos 30 registros
    .map(t => Number(t.amount))
    .reduce((sum, a) => sum + a, 0);

  const utilizationRate = Math.min(1, recentExpenses / totalLimit);

  // Score: melhor com menor utilização
  let score = 15;
  if (utilizationRate >= 0.9) {
    score = 0; // Crítico: >90% utilizado
  } else if (utilizationRate >= 0.7) {
    score = 5; // Alto: 70-90%
  } else if (utilizationRate >= 0.5) {
    score = 10; // Moderado: 50-70%
  } else {
    score = 15 - (utilizationRate * 10); // Boa: <50%
  }

  return Math.min(15, Math.max(0, score));
}

/**
 * Calcula score de diversificação (10 pontos)
 */
function calculateDiversification(
  transactions: TransactionData[]
): number {
  if (transactions.length < 3) return 5;

  const categoryCounts = new Map<string, number>();
  transactions.forEach(t => {
    const count = categoryCounts.get(t.category_id) || 0;
    categoryCounts.set(t.category_id, count + 1);
  });

  const total = transactions.length;
  const categories = categoryCounts.size;

  // Calcula índice de diversificação (entropia de Shannon simplificada)
  let entropy = 0;
  categoryCounts.forEach(count => {
    const p = count / total;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  });

  // Normaliza para 0-10 (máximo de diversificação = 10 pontos)
  const maxEntropy = Math.log2(categories);
  const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;
  
  // Bônus por ter muitas categorias
  const categoryBonus = Math.min(2, (categories - 3) * 0.5);
  
  return Math.min(10, normalizedEntropy * 8 + categoryBonus);
}

/**
 * Função auxiliar para calcular variância
 */
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, a) => sum + a, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((sum, a) => sum + a, 0) / values.length;
}

/**
 * Calcula o score completo de saúde financeira
 */
export function calculateHealthScore(params: {
  transactions: TransactionData[];
  budgets: BudgetData[];
  cards: CardData[];
  currentBalance?: number;
  previousTransactions?: TransactionData[];
  periodMonths?: number;
}): HealthScoreResult {
  const {
    transactions,
    budgets,
    cards,
    currentBalance = 0,
    previousTransactions = [],
    periodMonths = 3,
  } = params;

  // Calcula cada componente
  const controleGastos = calculateExpenseControl(transactions, budgets, periodMonths);
  const poupancaReservas = calculateSavings(transactions, currentBalance, periodMonths);
  const previsibilidade = calculatePredictability(transactions, periodMonths);
  const dividas = calculateDebtScore(cards, transactions);
  const diversificacao = calculateDiversification(transactions);

  const breakdown: HealthScoreBreakdown = {
    controleGastos,
    poupancaReservas,
    previsibilidade,
    dividas,
    diversificacao,
  };

  // Score total (0-100)
  const score = Math.round(
    controleGastos +
    poupancaReservas +
    previsibilidade +
    dividas +
    diversificacao
  );

  // Calcula tendência comparando com período anterior
  let trend: 'up' | 'down' | 'stable' = 'stable';
  let previousScore: number | undefined;
  
  if (previousTransactions.length > 0) {
    previousScore = Math.round(
      calculateExpenseControl(previousTransactions, budgets, periodMonths) +
      calculateSavings(previousTransactions, currentBalance, periodMonths) +
      calculatePredictability(previousTransactions, periodMonths) +
      calculateDebtScore(cards, previousTransactions) +
      calculateDiversification(previousTransactions)
    );

    const diff = score - previousScore;
    if (diff > 5) trend = 'up';
    else if (diff < -5) trend = 'down';
  }

  // Categoriza o score
  let category: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  if (score >= 80) category = 'excellent';
  else if (score >= 60) category = 'good';
  else if (score >= 40) category = 'fair';
  else if (score >= 20) category = 'poor';
  else category = 'critical';

  return {
    score,
    breakdown,
    trend,
    previousScore,
    category,
  };
}

