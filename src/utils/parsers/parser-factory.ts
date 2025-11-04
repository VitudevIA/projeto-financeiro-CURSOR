/**
 * Factory para detectar e usar o parser correto para cada banco
 * Implementa Factory Pattern para auto-detecção de bancos
 */

import { IBankStatementParser, ExtractedTransaction } from './base-parser-interface'
import { InterParser } from './inter'
import { NubankParser } from './nubank'
import { PicPayParser } from './picpay'
import { WillBankParser } from './willbank'

export class BankStatementParserFactory {
  private static readonly parsers: IBankStatementParser[] = [
    new NubankParser(), // Testado primeiro (mais específico)
    new WillBankParser(), // WillBank
    new InterParser(), // Banco Inter (antes do PicPay para evitar conflito)
    new PicPayParser(), // PicPay (mais genérico, testado por último)
    // Adicione novos parsers aqui conforme necessário
  ]

  /**
   * Valida que os parsers estão carregados corretamente
   */
  private static validateParsers(): void {
    try {
      console.log(`[Parser Factory] Validando ${this.parsers.length} parsers...`)
      this.parsers.forEach((parser, index) => {
        if (!parser || !parser.bankName || !parser.bankId) {
          console.error(`[Parser Factory] ❌ Parser ${index + 1} está inválido!`)
        } else {
          console.log(`[Parser Factory] ✅ Parser ${index + 1}: ${parser.bankName} (${parser.bankId})`)
        }
      })
    } catch (error) {
      console.error('[Parser Factory] ❌ Erro ao validar parsers:', error)
    }
  }

  /**
   * Detecta qual parser pode processar o texto
   */
  static detectParser(text: string): IBankStatementParser | null {
    // Valida parsers na primeira chamada
    if (this.parsers.length === 0) {
      console.error('[Parser Factory] ❌ CRÍTICO: Nenhum parser registrado!')
      return null
    }
    
    this.validateParsers()
    
    console.log(`[Parser Factory] Detectando parser para texto de ${text.length} caracteres`)
    console.log(`[Parser Factory] Testando ${this.parsers.length} parsers disponíveis...`)
    
    if (!text || text.trim().length === 0) {
      console.error('[Parser Factory] ❌ Texto vazio para detecção')
      return null
    }
    
    const textLower = text.toLowerCase()
    console.log(`[Parser Factory] Primeiros 300 caracteres (lowercase):`, textLower.substring(0, 300))
    
    for (let i = 0; i < this.parsers.length; i++) {
      const parser = this.parsers[i]
      
      if (!parser) {
        console.error(`[Parser Factory] ❌ Parser ${i + 1} é null/undefined!`)
        continue
      }
      
      try {
        console.log(`[Parser Factory] Testando parser ${i + 1}/${this.parsers.length}: ${parser.bankName} (${parser.bankId})`)
        const canParse = parser.canParse(text)
        
        if (canParse) {
          console.log(`[Parser Factory] ✅ Banco detectado: ${parser.bankName} (${parser.bankId})`)
          return parser
        } else {
          console.log(`[Parser Factory] ⚠️ ${parser.bankName} não conseguiu processar o texto`)
        }
      } catch (error) {
        console.error(`[Parser Factory] ❌ Erro ao testar parser ${parser.bankName}:`, error)
        console.error(`[Parser Factory] Stack trace:`, error instanceof Error ? error.stack : 'N/A')
        // Continua testando outros parsers mesmo se um falhar
      }
    }

    console.log('[Parser Factory] ⚠️ Nenhum parser específico detectado, usando parser genérico')
    return null
  }

  /**
   * Parse do texto usando o parser apropriado
   */
  static parse(text: string): ExtractedTransaction[] {
    console.log(`[Parser Factory] Iniciando parse do texto (${text.length} caracteres)`)
    
    // Verifica se o texto é válido
    if (!text || text.trim().length === 0) {
      console.error('[Parser Factory] ❌ Texto vazio ou inválido')
      return []
    }
    
    // Mostra primeiros caracteres para debug
    console.log(`[Parser Factory] Primeiros 200 caracteres do texto:`, text.substring(0, 200))
    
    const parser = this.detectParser(text)
    
    if (!parser) {
      console.error('[Parser Factory] ❌ Nenhum parser foi detectado para o texto')
      console.log('[Parser Factory] Tentando todos os parsers manualmente...')
      
      // Debug: tenta todos os parsers manualmente
      for (const p of this.parsers) {
        try {
          const canParse = p.canParse(text)
          console.log(`[Parser Factory] Debug - ${p.bankName}.canParse:`, canParse)
        } catch (error) {
          console.error(`[Parser Factory] Erro ao testar ${p.bankName}.canParse:`, error)
        }
      }
      
      console.log('[Parser Factory] Usando fallback genérico (retorna vazio)')
      return []
    }
    
    console.log(`[Parser Factory] ✅ Parser ${parser.bankName} detectado, iniciando parse...`)
    
    try {
      const transactions = parser.parse(text)
      
      // Valida que o resultado é um array válido
      if (!transactions) {
        console.error(`[Parser Factory] ❌ Parser ${parser.bankName} retornou null/undefined`)
        return []
      }
      
      if (!Array.isArray(transactions)) {
        console.error(`[Parser Factory] ❌ Parser ${parser.bankName} retornou resultado inválido (não é array):`, typeof transactions, transactions)
        return []
      }
      
      if (transactions.length > 0) {
        console.log(`[Parser Factory] ✅ ${transactions.length} transações extraídas pelo ${parser.bankName}`)
        return transactions
      } else {
        console.warn(`[Parser Factory] ⚠️ Parser ${parser.bankName} não encontrou transações (array vazio)`)
        console.log(`[Parser Factory] Debug: Primeiras 1000 caracteres do texto processado:`, text.substring(0, 1000))
        return []
      }
    } catch (error) {
      console.error(`[Parser Factory] ❌ ERRO CRÍTICO no parser ${parser.bankName}:`, error)
      console.error(`[Parser Factory] Mensagem de erro:`, error instanceof Error ? error.message : String(error))
      console.error(`[Parser Factory] Stack trace:`, error instanceof Error ? error.stack : 'N/A')
      // Retorna array vazio em vez de lançar erro
      return []
    }
  }

  /**
   * Registra um novo parser
   */
  static registerParser(parser: IBankStatementParser): void {
    this.parsers.push(parser)
    console.log(`[Parser Factory] Parser ${parser.bankName} registrado`)
  }

  /**
   * Retorna lista de parsers registrados
   */
  static getRegisteredParsers(): IBankStatementParser[] {
    return [...this.parsers]
  }

  /**
   * Obtém um parser específico por ID
   */
  static getParser(bankId: string): IBankStatementParser | null {
    return this.parsers.find(p => p.bankId === bankId) || null
  }
}

