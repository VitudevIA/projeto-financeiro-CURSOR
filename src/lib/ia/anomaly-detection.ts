/**
 * Detecção de Anomalias em Transações
 * Conforme PRD: 3 níveis (Crítico, Alto, Moderado)
 */

export type AnomalySeverity = 'critical' | 'high' | 'moderate';

export interface Anomaly {
  id: string;
  severity: AnomalySeverity;
  type: 'expense_spike' | 'budget_overflow' | 'unusual_category' | 'recurring_miss' | 'income_drop';
  title: string;
  description: string;
  amount: number;
  deviation: number; // Percentual de desvio
  date: string;
  category_id?: string;
  category_name?: string;
  suggestedAction?: string;
}

interface TransactionData {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category_id: string;
  category_name?: string;
  description: string;
}

interface BudgetData {
  category_id: string;
  limit_amount: number;
}

/**
 * Detecta anomalias em gastos
 */
export function detectAnomalies(params: {
  transactions: TransactionData[];
  budgets: BudgetData[];
  periodMonths?: number;
}): Anomaly[] {
  const { transactions, budgets, periodMonths = 3 } = params;
  const anomalies: Anomaly[] = [];

  const expenses = transactions.filter(t => t.type === 'expense');
  const incomes = transactions.filter(t => t.type === 'income');

  if (expenses.length === 0) return anomalies;

  // 1. Detecção de picos de gastos (spikes)
  anomalies.push(...detectExpenseSpikes(expenses, periodMonths));

  // 2. Detecção de estouro de orçamento
  anomalies.push(...detectBudgetOverflows(expenses, budgets));

  // 3. Detecção de categoria incomum
  anomalies.push(...detectUnusualCategories(expenses, periodMonths));

  // 4. Detecção de queda de receita
  anomalies.push(...detectIncomeDrops(incomes, periodMonths));

  // Ordena por severidade e data
  return anomalies.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, moderate: 2 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

/**
 * Detecta picos anômalos de gastos
 */
function detectExpenseSpikes(
  expenses: TransactionData[],
  periodMonths: number
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  if (expenses.length < 3) return anomalies;

  // Calcula média e desvio padrão
  const amounts = expenses.map(e => Number(e.amount));
  const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
  const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  // Thresholds: 2σ = moderado, 3σ = alto, 4σ+ = crítico
  expenses.forEach(expense => {
    const amount = Number(expense.amount);
    const zScore = stdDev > 0 ? (amount - mean) / stdDev : 0;

    if (zScore >= 4) {
      anomalies.push({
        id: `spike-${expense.id}`,
        severity: 'critical',
        type: 'expense_spike',
        title: 'Gasto Crítico Detectado',
        description: `Gasto de R$ ${amount.toFixed(2)} está ${((zScore - 1) * 100).toFixed(0)}% acima da média`,
        amount,
        deviation: (zScore - 1) * 100,
        date: expense.date,
        category_id: expense.category_id,
        category_name: expense.category_name,
        suggestedAction: 'Revisar se este gasto foi realmente necessário. Considere criar um alerta para esta categoria.',
      });
    } else if (zScore >= 3) {
      anomalies.push({
        id: `spike-${expense.id}`,
        severity: 'high',
        type: 'expense_spike',
        title: 'Gasto Alto Detectado',
        description: `Gasto de R$ ${amount.toFixed(2)} está ${((zScore - 1) * 100).toFixed(0)}% acima da média`,
        amount,
        deviation: (zScore - 1) * 100,
        date: expense.date,
        category_id: expense.category_id,
        category_name: expense.category_name,
        suggestedAction: 'Monitorar este tipo de gasto. Considere estabelecer um limite mensal.',
      });
    } else if (zScore >= 2) {
      anomalies.push({
        id: `spike-${expense.id}`,
        severity: 'moderate',
        type: 'expense_spike',
        title: 'Gasto Moderadamente Alto',
        description: `Gasto de R$ ${amount.toFixed(2)} está ${((zScore - 1) * 100).toFixed(0)}% acima da média`,
        amount,
        deviation: (zScore - 1) * 100,
        date: expense.date,
        category_id: expense.category_id,
        category_name: expense.category_name,
      });
    }
  });

  return anomalies;
}

/**
 * Detecta estouros de orçamento
 */
function detectBudgetOverflows(
  expenses: TransactionData[],
  budgets: BudgetData[]
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  if (budgets.length === 0) return anomalies;

  // Agrupa gastos por categoria
  const expensesByCategory = new Map<string, TransactionData[]>();
  expenses.forEach(e => {
    if (!expensesByCategory.has(e.category_id)) {
      expensesByCategory.set(e.category_id, []);
    }
    expensesByCategory.get(e.category_id)!.push(e);
  });

  // Verifica cada orçamento
  budgets.forEach(budget => {
    const categoryExpenses = expensesByCategory.get(budget.category_id) || [];
    const totalSpent = categoryExpenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0
    );
    const limit = Number(budget.limit_amount);

    if (totalSpent > limit) {
      const deviation = ((totalSpent - limit) / limit) * 100;

      if (deviation > 100) {
        anomalies.push({
          id: `budget-overflow-${budget.category_id}`,
          severity: 'critical',
          type: 'budget_overflow',
          title: 'Orçamento Estourado - Crítico',
          description: `Gastos de R$ ${totalSpent.toFixed(2)} excedem o orçamento de R$ ${limit.toFixed(2)} em ${deviation.toFixed(0)}%`,
          amount: totalSpent,
          deviation,
          date: new Date().toISOString().split('T')[0],
          category_id: budget.category_id,
          suggestedAction: 'Revisar imediatamente os gastos desta categoria. Considere aumentar o orçamento ou reduzir despesas.',
        });
      } else if (deviation > 50) {
        anomalies.push({
          id: `budget-overflow-${budget.category_id}`,
          severity: 'high',
          type: 'budget_overflow',
          title: 'Orçamento Estourado - Alto',
          description: `Gastos de R$ ${totalSpent.toFixed(2)} excedem o orçamento de R$ ${limit.toFixed(2)} em ${deviation.toFixed(0)}%`,
          amount: totalSpent,
          deviation,
          date: new Date().toISOString().split('T')[0],
          category_id: budget.category_id,
          suggestedAction: 'Monitorar de perto. Considere ajustar o orçamento ou reduzir gastos.',
        });
      } else if (deviation > 30) {
        anomalies.push({
          id: `budget-overflow-${budget.category_id}`,
          severity: 'moderate',
          type: 'budget_overflow',
          title: 'Orçamento Próximo do Limite',
          description: `Gastos de R$ ${totalSpent.toFixed(2)} estão ${deviation.toFixed(0)}% acima do orçamento de R$ ${limit.toFixed(2)}`,
          amount: totalSpent,
          deviation,
          date: new Date().toISOString().split('T')[0],
          category_id: budget.category_id,
        });
      }
    }
  });

  return anomalies;
}

/**
 * Detecta categorias incomuns (não usadas frequentemente)
 */
function detectUnusualCategories(
  expenses: TransactionData[],
  periodMonths: number
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  if (expenses.length < 10) return anomalies;

  // Agrupa por categoria
  const categoryCounts = new Map<string, number>();
  const categoryAmounts = new Map<string, number>();

  expenses.forEach(e => {
    const count = categoryCounts.get(e.category_id) || 0;
    categoryCounts.set(e.category_id, count + 1);
    const amount = categoryAmounts.get(e.category_id) || 0;
    categoryAmounts.set(e.category_id, amount + Number(e.amount));
  });

  // Identifica categorias usadas raramente mas com valores altos
  const avgFrequency = expenses.length / categoryCounts.size;
  const thresholdFrequency = avgFrequency * 0.3; // 30% da frequência média

  categoryCounts.forEach((count, categoryId) => {
    if (count < thresholdFrequency) {
      const totalAmount = categoryAmounts.get(categoryId) || 0;
      const avgAmount = totalAmount / count;

      // Se a categoria é rara mas tem valor alto, é uma anomalia
      if (avgAmount > 500) { // Threshold de R$ 500
        const latestExpense = expenses
          .filter(e => e.category_id === categoryId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        if (latestExpense) {
          anomalies.push({
            id: `unusual-category-${categoryId}-${latestExpense.date}`,
            severity: 'moderate',
            type: 'unusual_category',
            title: 'Categoria Incomum Detectada',
            description: `Gasto de R$ ${avgAmount.toFixed(2)} em categoria raramente utilizada`,
            amount: avgAmount,
            deviation: ((avgFrequency - count) / avgFrequency) * 100,
            date: latestExpense.date,
            category_id: categoryId,
            category_name: latestExpense.category_name,
            suggestedAction: 'Verifique se este gasto está correto. Categorias incomuns podem indicar erros ou fraudes.',
          });
        }
      }
    }
  });

  return anomalies;
}

/**
 * Detecta quedas de receita
 */
function detectIncomeDrops(
  incomes: TransactionData[],
  periodMonths: number
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  if (incomes.length < 3) return anomalies;

  // Agrupa por mês
  const monthlyIncomes = new Map<string, number>();
  incomes.forEach(i => {
    const month = i.date.substring(0, 7); // YYYY-MM
    const current = monthlyIncomes.get(month) || 0;
    monthlyIncomes.set(month, current + Number(i.amount));
  });

  const months = Array.from(monthlyIncomes.keys()).sort();
  if (months.length < 2) return anomalies;

  // Compara meses consecutivos
  for (let i = 1; i < months.length; i++) {
    const current = monthlyIncomes.get(months[i]) || 0;
    const previous = monthlyIncomes.get(months[i - 1]) || 0;

    if (previous > 0) {
      const drop = ((previous - current) / previous) * 100;

      if (drop > 50) {
        anomalies.push({
          id: `income-drop-${months[i]}`,
          severity: 'critical',
          type: 'income_drop',
          title: 'Queda Crítica de Receita',
          description: `Receita caiu ${drop.toFixed(0)}% comparado ao mês anterior (R$ ${current.toFixed(2)} vs R$ ${previous.toFixed(2)})`,
          amount: current,
          deviation: drop,
          date: `${months[i]}-01`,
          suggestedAction: 'Investigar causa da queda. Ajuste seus gastos para evitar problemas financeiros.',
        });
      } else if (drop > 30) {
        anomalies.push({
          id: `income-drop-${months[i]}`,
          severity: 'high',
          type: 'income_drop',
          title: 'Queda Significativa de Receita',
          description: `Receita caiu ${drop.toFixed(0)}% comparado ao mês anterior`,
          amount: current,
          deviation: drop,
          date: `${months[i]}-01`,
          suggestedAction: 'Monitorar receitas. Considere reduzir gastos não essenciais.',
        });
      }
    }
  }

  return anomalies;
}

