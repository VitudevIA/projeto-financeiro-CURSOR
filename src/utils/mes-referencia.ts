/**
 * Mês de referência (competência) — formato YYYY-MM
 */

export type MesReferencia = string

const MES_REF_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/

export function isValidMesReferencia(value: string): boolean {
  return MES_REF_REGEX.test(value)
}

/** Extrai YYYY-MM de uma data ISO (YYYY-MM-DD) */
export function mesReferenciaFromDate(dateIso: string): MesReferencia {
  if (!dateIso || dateIso.length < 7) {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }
  return dateIso.slice(0, 7)
}

export type CardBillingInfo = {
  closing_day: number
  type?: string
}

/**
 * Competência de crédito com base no dia de fechamento do cartão:
 * - dia da compra <= closing_day → mês da data da compra
 * - dia da compra > closing_day → mês seguinte
 */
export function inferMesReferenciaWithClosing(
  transactionDate: string,
  closingDay: number
): MesReferencia {
  const [y, m, d] = transactionDate.split('-').map(Number)
  if (!y || !m) return mesReferenciaFromDate(transactionDate)

  const day = d || 1
  const closing = Math.min(Math.max(Math.trunc(closingDay), 1), 31)

  if (day <= closing) {
    return `${y}-${String(m).padStart(2, '0')}`
  }

  const date = new Date(y, m - 1, day)
  date.setMonth(date.getMonth() + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Inferência na importação / cadastro:
 * - crédito: usa closing_day do cartão quando informado; senão mês da data da compra
 * - débito, PIX, dinheiro, boleto: competência no mês da data da compra
 */
export function inferMesReferencia(
  transactionDate: string,
  paymentMethod: string,
  options?: { closingDay?: number | null }
): MesReferencia {
  if (paymentMethod === 'credit') {
    if (options?.closingDay != null && options.closingDay >= 1) {
      return inferMesReferenciaWithClosing(transactionDate, options.closingDay)
    }
    return mesReferenciaFromDate(transactionDate)
  }

  return mesReferenciaFromDate(transactionDate)
}

/** Competência efetiva para KPIs (recalcula crédito pelo fechamento do cartão) */
export function effectiveMesReferencia(
  transaction: {
    transaction_date: string
    payment_method?: string | null
    mes_referencia?: string | null
    card_id?: string | null
  },
  card?: CardBillingInfo | null
): MesReferencia {
  const paymentMethod = transaction.payment_method || 'cash'

  if (paymentMethod !== 'credit') {
    return mesReferenciaFromDate(transaction.transaction_date)
  }

  const closingDay =
    card?.closing_day ??
    (transaction as { card?: { closing_day?: number } }).card?.closing_day

  if (closingDay != null && closingDay >= 1) {
    return inferMesReferenciaWithClosing(transaction.transaction_date, closingDay)
  }

  if (transaction.mes_referencia && isValidMesReferencia(transaction.mes_referencia)) {
    return transaction.mes_referencia
  }

  return inferMesReferencia(transaction.transaction_date, 'credit')
}

/** Intervalo de transaction_date para capturar compras na competência do período */
export function expandedTransactionDateRangeForMesReferencias(
  min: MesReferencia,
  max: MesReferencia
): { start: string; end: string } {
  const [y1, m1] = min.split('-').map(Number)
  const [y2, m2] = max.split('-').map(Number)
  const start = new Date(y1, m1 - 2, 1)
  const end = new Date(y2, m2, 0)
  return {
    start: formatLocalDateString(start),
    end: formatLocalDateString(end),
  }
}

export function isTransactionInMesReferenciaRange(
  transaction: {
    transaction_date: string
    payment_method?: string | null
    mes_referencia?: string | null
    card_id?: string | null
    card?: { closing_day?: number; type?: string } | null
  },
  min: MesReferencia,
  max: MesReferencia,
  cardMap?: Map<string, CardBillingInfo>
): boolean {
  let cardInfo: CardBillingInfo | null = null
  if (transaction.card?.closing_day != null) {
    cardInfo = {
      closing_day: transaction.card.closing_day,
      type: transaction.card.type,
    }
  } else if (transaction.card_id && cardMap) {
    cardInfo = cardMap.get(transaction.card_id) ?? null
  }

  const effective = effectiveMesReferencia(transaction, cardInfo)
  return effective >= min && effective <= max
}

/** Limites inclusivos para filtro no dashboard (start/end em YYYY-MM-DD) */
export function mesReferenciaRangeFromDates(start: string, end: string): {
  min: MesReferencia
  max: MesReferencia
} {
  return {
    min: mesReferenciaFromDate(start),
    max: mesReferenciaFromDate(end),
  }
}

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

/** Opções para Select (12 meses passados + 12 futuros) */
export function getMesReferenciaOptions(anchor = new Date()): Array<{ value: MesReferencia; label: string }> {
  const options: Array<{ value: MesReferencia; label: string }> = []
  for (let offset = -12; offset <= 12; offset++) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${MESES_PT[d.getMonth()]} ${d.getFullYear()}`
    options.push({ value, label })
  }
  return options
}

export function formatMesReferenciaLabel(mesRef: string): string {
  if (!isValidMesReferencia(mesRef)) return mesRef
  const [y, m] = mesRef.split('-')
  const monthIndex = parseInt(m, 10) - 1
  return `${MESES_PT[monthIndex] ?? m} ${y}`
}

/** Mês atual no formato YYYY-MM (fuso local) */
export function getCurrentMesReferencia(): MesReferencia {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** Formata Date para YYYY-MM-DD sem converter para UTC (evita bug do mês anterior) */
export function formatLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** month: 0 = janeiro (igual Date.getMonth()) */
export function getMonthDateRange(
  year: number,
  month: number
): { start: string; end: string; mesReferencia: MesReferencia } {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  const mesReferencia = `${year}-${String(month + 1).padStart(2, '0')}`
  return {
    start: formatLocalDateString(start),
    end: formatLocalDateString(end),
    mesReferencia,
  }
}

/** Lê mês/ano de YYYY-MM-DD sem interpretar como UTC */
export function monthYearFromDateString(dateIso: string): { month: number; year: number } {
  const [y, m] = dateIso.split('-').map(Number)
  if (!y || !m) {
    const now = new Date()
    return { month: now.getMonth(), year: now.getFullYear() }
  }
  return { month: m - 1, year: y }
}
