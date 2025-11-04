/**
 * Interface base para todos os parsers de faturas bancárias
 * Implementa Strategy Pattern para suportar múltiplos bancos
 */

export interface ExtractedTransaction {
  date: string
  description: string
  amount: number
  installments?: {
    current: number
    total: number
  } | null
}

export interface IBankStatementParser {
  readonly bankId: string
  readonly bankName: string
  canParse(text: string): boolean
  parse(text: string): ExtractedTransaction[]
}

export abstract class BaseBankStatementParser implements IBankStatementParser {
  abstract readonly bankId: string
  abstract readonly bankName: string

  abstract canParse(text: string): boolean
  abstract parse(text: string): ExtractedTransaction[]

  /**
   * Verifica se o texto contém algum dos indicadores fornecidos
   */
  protected hasIndicators(text: string, indicators: string[]): boolean {
    const textLower = text.toLowerCase()
    return indicators.some((indicator) => textLower.includes(indicator.toLowerCase()))
  }

  /**
   * Normaliza texto removendo espaços extras e caracteres especiais
   */
  protected normalizeText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Converte valor monetário brasileiro para número
   * Exemplo: "1.500,50" -> 1500.50
   */
  protected parseMonetaryValue(value: string): number {
    const cleaned = value
      .replace(/R\$\s*/gi, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .trim()
    
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }

  /**
   * Formata data DD/MM para YYYY-MM-DD
   * Se não tiver ano, usa o ano extraído do texto ou ano atual
   */
  protected formatDate(dateStr: string, year?: number): string {
    const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/)
    if (!match) return dateStr

    let day = match[1].padStart(2, '0')
    let month = match[2].padStart(2, '0')
    let finalYear = year || match[3] || new Date().getFullYear().toString()

    // Ajusta ano se a data estiver no futuro
    const parsedDate = new Date(parseInt(finalYear), parseInt(month) - 1, parseInt(day))
    if (parsedDate > new Date()) {
      finalYear = (parseInt(finalYear) - 1).toString()
    }

    return `${finalYear}-${month}-${day}`
  }

  /**
   * Extrai informações de parcelamento da descrição
   * Suporta formatos: PARC01/02, PARC01/05, PARC03/03, etc.
   * CRÍTICO: Deve capturar AMBOS os dígitos do total de parcelas
   */
  protected extractInstallments(description: string): { current: number; total: number } | null {
    // Primeiro tenta padrões específicos do PicPay (PARCXX/YY) na descrição original
    // IMPORTANTE: Usa \d{2} para garantir que captura 2 dígitos quando presentes
    // Mas também aceita 1 dígito para casos como PARC1/2
    
    // Padrão 1: PARC seguido de 1-2 dígitos, barra, 1-2 dígitos (mais específico)
    // Exemplo: "SHEINPARC01/02", "EC *LPARC03/05"
    // IMPORTANTE: Não usa lookahead negativo para não interferir com outros formatos
    const picPayPattern1 = /PARC(\d{1,2})\/(\d{1,2})/i
    
    // Padrão 2: PARC com 2 dígitos fixos (mais comum no PicPay)
    // Exemplo: "PARC01/02", "PARC03/05"
    const picPayPattern2 = /PARC(\d{2})\/(\d{2})/i
    
    // Padrão 3: Parcela com espaços
    const picPayPattern3 = /parcela\s*(\d{1,2})\s*\/\s*(\d{1,2})/i

    // Tenta padrão 2 primeiro (mais específico - 2 dígitos fixos)
    // Apenas para PicPay (evita logs desnecessários para outros bancos)
    let match = description.match(picPayPattern2)
    if (match) {
      const current = parseInt(match[1])
      const total = parseInt(match[2])
      if (current > 0 && total > 0 && current <= total && total <= 99) {
        // Log apenas se for realmente padrão PicPay (evita logs excessivos)
        if (description.includes('PARC') && total > 0) {
          // Log silencioso - removido para não interferir com outros parsers
        }
        return { current, total }
      }
    }

    // Tenta padrão 1 (flexível - 1-2 dígitos)
    match = description.match(picPayPattern1)
    if (match) {
      const current = parseInt(match[1])
      const total = parseInt(match[2])
      if (current > 0 && total > 0 && current <= total && total <= 99) {
        // Log silencioso - removido para não interferir com outros parsers
        return { current, total }
      }
    }

    // Tenta padrão 3
    match = description.match(picPayPattern3)
    if (match) {
      const current = parseInt(match[1])
      const total = parseInt(match[2])
      if (current > 0 && total > 0 && current <= total && total <= 99) {
        return { current, total }
      }
    }

    // Fallback: padrões mais genéricos
    const normalized = this.normalizeText(description).toLowerCase()
    const genericPatterns = [
      /parcela\s+(\d+)\s*\/\s*(\d+)/i,
      /parc(\d+)\/(\d+)/i,
      /(\d+)\s*\/\s*(\d+)/,
      /parcela\s+(\d+)\s+de\s+(\d+)/i,
    ]

    for (const pattern of genericPatterns) {
      const match = normalized.match(pattern)
      if (match) {
        const current = parseInt(match[1])
        const total = parseInt(match[2])
        if (current > 0 && total > 0 && current <= total) {
          return { current, total }
        }
      }
    }

    return null
  }

  /**
   * Remove duplicatas de transações
   */
  protected removeDuplicates(transactions: ExtractedTransaction[]): ExtractedTransaction[] {
    return transactions.filter((trans, index, self) =>
      index === self.findIndex((t) =>
        t.date === trans.date &&
        t.description === trans.description &&
        Math.abs(t.amount - trans.amount) < 0.01 &&
        t.installments?.current === trans.installments?.current &&
        t.installments?.total === trans.installments?.total
      )
    )
  }
}

