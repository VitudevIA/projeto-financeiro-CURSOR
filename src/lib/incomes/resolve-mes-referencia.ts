import { getCurrentMesReferencia, mesReferenciaFromDate } from '@/utils/mes-referencia'

/** Deriva YYYY-MM a partir da data da transação (mesma regra das transações normais). */
export function resolveMesReferenciaFromTransactionDate(transactionDate: string): string {
  return mesReferenciaFromDate(transactionDate)
}

export function buildRecurringIncomeTransactionDate(
  startDate: string,
  dayOfMonth: number
): string {
  const [year, month] = startDate.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const day = Math.min(Math.max(dayOfMonth, 1), daysInMonth)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function defaultProvisionStartMonth(explicit?: string): string {
  return explicit && explicit.length >= 7 ? explicit.slice(0, 7) : getCurrentMesReferencia()
}
