/**
 * SERVIÇO DE DEDUPLICAÇÃO DE TRANSAÇÕES
 * 
 * Previne duplicação de:
 * - Parcelamentos já lançados em faturas futuras
 * - Transações idênticas (mesma descrição, valor e data)
 * 
 * Estratégia:
 * 1. Gera hash único para cada transação
 * 2. Identifica parcelamentos pelo "grupo de parcelamento"
 * 3. Verifica se transação já existe antes de importar
 */

import * as crypto from 'crypto'

export interface TransactionForDeduplication {
  data: string
  descricao: string
  descricaoOriginal?: string
  valor: number
  tipo: 'income' | 'expense'
  categoria?: string
  parcelamento?: {
    parcelaAtual: number
    totalParcelas: number
  }
}

export interface DeduplicationOptions {
  importarApenasParcelaAtual?: boolean // Padrão: só importa parcela do mês
  permitirDuplicatasExatas?: boolean // Padrão: bloqueia duplicatas
  dataFaturaReferencia?: Date // Data da fatura sendo importada
}

export interface DuplicateTransaction {
  transacao: TransactionForDeduplication
  motivo: string
}

export interface DeduplicationWarning {
  tipo: 'duplicata_exata' | 'parcelamento_existente'
  mensagem: string
  transacao: TransactionForDeduplication
  grupoExistente?: TransactionForDeduplication[]
}

export interface DeduplicationResult {
  paraImportar: TransactionForDeduplication[]
  duplicatas: DuplicateTransaction[]
  avisos: DeduplicationWarning[]
  estatisticas: {
    totalAnalisadas: number
    paraImportar: number
    duplicatas: number
    avisos: number
  }
}

export interface EnrichedTransaction extends TransactionForDeduplication {
  hashUnico: string
  grupoParcelamento: string | null
  isParcelamento: boolean
}

export class TransactionDeduplicationService {
  /**
   * Gera um hash único para uma transação
   * Usado para detectar duplicatas exatas
   */
  gerarHashTransacao(transacao: TransactionForDeduplication): string {
    const dados = [
      transacao.descricaoOriginal || transacao.descricao,
      transacao.valor.toFixed(2),
      transacao.data,
      transacao.tipo
    ].join('|').toLowerCase()
    
    return crypto.createHash('md5').update(dados).digest('hex')
  }
  
  /**
   * Gera um ID único para um GRUPO de parcelamento
   * Todas as parcelas da mesma compra terão o mesmo ID
   * 
   * Exemplo: iPhone 12x R$ 500
   * - Parcela 1/12: grupo_abc123
   * - Parcela 2/12: grupo_abc123  (mesmo grupo!)
   * - Parcela 3/12: grupo_abc123
   */
  gerarIdGrupoParcelamento(transacao: TransactionForDeduplication): string | null {
    if (!transacao.parcelamento) {
      return null
    }
    
    // Remove o texto PARC##/## e (X/Y) para pegar só o nome base
    const descricaoBase = (transacao.descricaoOriginal || transacao.descricao)
      .replace(/PARC\s*\d{1,2}\/\d{1,2}/gi, '')
      .replace(/\(\d{1,3}\/\d{1,3}\)/, '')
      .trim()
      .toLowerCase()
    
    // Valor da parcela individual
    const valorParcela = transacao.valor.toFixed(2)
    
    // Total de parcelas (para garantir que é o mesmo parcelamento)
    const totalParcelas = transacao.parcelamento.totalParcelas
    
    // Combinar para criar ID único do grupo
    const dados = [
      descricaoBase,
      valorParcela,
      totalParcelas.toString()
    ].join('|')
    
    return `parc_${crypto.createHash('md5').update(dados).digest('hex').substring(0, 12)}`
  }
  
  /**
   * Enriquece transações com metadados de deduplicação
   */
  enriquecerTransacoes(transacoes: TransactionForDeduplication[]): EnrichedTransaction[] {
    return transacoes.map(t => ({
      ...t,
      hashUnico: this.gerarHashTransacao(t),
      grupoParcelamento: this.gerarIdGrupoParcelamento(t),
      isParcelamento: !!t.parcelamento
    }))
  }
  
  /**
   * Filtra transações removendo duplicatas
   * 
   * @param novasTransacoes - Transações da fatura sendo importada
   * @param transacoesExistentes - Transações já salvas no banco
   * @param opcoes - Opções de importação
   * @returns {DeduplicationResult} Resultado da deduplicação
   */
  async filtrarDuplicatas(
    novasTransacoes: TransactionForDeduplication[],
    transacoesExistentes: TransactionForDeduplication[],
    opcoes: DeduplicationOptions = {}
  ): Promise<DeduplicationResult> {
    const {
      importarApenasParcelaAtual = true,  // Padrão: só importa parcela do mês
      permitirDuplicatasExatas = false,   // Padrão: bloqueia duplicatas
      dataFaturaReferencia = new Date()   // Data da fatura sendo importada
    } = opcoes
    
    // Enriquecer ambas as listas
    const novas = this.enriquecerTransacoes(novasTransacoes)
    const existentes = this.enriquecerTransacoes(transacoesExistentes)
    
    // Criar índices para busca rápida
    const hashesExistentes = new Set(existentes.map(t => t.hashUnico))
    const gruposParcelamentoExistentes = new Map<string, EnrichedTransaction[]>()
    
    existentes.forEach(t => {
      if (t.grupoParcelamento) {
        if (!gruposParcelamentoExistentes.has(t.grupoParcelamento)) {
          gruposParcelamentoExistentes.set(t.grupoParcelamento, [])
        }
        gruposParcelamentoExistentes.get(t.grupoParcelamento)!.push(t)
      }
    })
    
    const paraImportar: TransactionForDeduplication[] = []
    const duplicatas: DuplicateTransaction[] = []
    const avisos: DeduplicationWarning[] = []
    
    for (const transacao of novas) {
      let deveImportar = true
      let motivo: string | null = null
      
      // ========================================
      // 1. VERIFICAR DUPLICATA EXATA
      // ========================================
      if (hashesExistentes.has(transacao.hashUnico)) {
        if (!permitirDuplicatasExatas) {
          deveImportar = false
          motivo = 'Transação idêntica já existe'
        } else {
          avisos.push({
            transacao,
            tipo: 'duplicata_exata',
            mensagem: 'Transação idêntica encontrada, mas permitindo importação'
          })
        }
      }
      
      // ========================================
      // 2. VERIFICAR PARCELAMENTO
      // ========================================
      if (deveImportar && transacao.isParcelamento && transacao.parcelamento) {
        const grupo = gruposParcelamentoExistentes.get(transacao.grupoParcelamento || '')
        
        if (grupo && grupo.length > 0) {
          // Parcelamento já existe no sistema
          
          if (importarApenasParcelaAtual) {
            // Verificar se é a parcela do mês da fatura
            const mesAnoFatura = this.extrairMesAno(dataFaturaReferencia)
            const mesAnoTransacao = this.extrairMesAno(transacao.data)
            
            if (mesAnoFatura === mesAnoTransacao) {
              // É a parcela do mês corrente
              
              // Verificar se essa parcela específica já existe
              const parcelaJaExiste = grupo.some(t => 
                t.parcelamento?.parcelaAtual === transacao.parcelamento?.parcelaAtual
              )
              
              if (parcelaJaExiste) {
                deveImportar = false
                motivo = `Parcela ${transacao.parcelamento.parcelaAtual}/${transacao.parcelamento.totalParcelas} já existe`
              } else {
                avisos.push({
                  transacao,
                  tipo: 'parcelamento_existente',
                  mensagem: `Parcelamento já existe. Importando apenas parcela ${transacao.parcelamento.parcelaAtual}/${transacao.parcelamento.totalParcelas}`,
                  grupoExistente: grupo
                })
              }
            } else {
              // Não é a parcela do mês da fatura
              deveImportar = false
              motivo = `Parcela ${transacao.parcelamento.parcelaAtual}/${transacao.parcelamento.totalParcelas} não pertence ao mês da fatura (${mesAnoFatura})`
            }
          } else {
            // Modo: importar todas as parcelas
            // Verificar se essa parcela específica já existe
            const parcelaJaExiste = grupo.some(t => 
              t.parcelamento?.parcelaAtual === transacao.parcelamento?.parcelaAtual
            )
            
            if (parcelaJaExiste) {
              deveImportar = false
              motivo = `Parcela ${transacao.parcelamento.parcelaAtual}/${transacao.parcelamento.totalParcelas} já foi importada anteriormente`
            }
          }
        }
      }
      
      // ========================================
      // 3. CLASSIFICAR
      // ========================================
      if (deveImportar) {
        paraImportar.push(transacao)
      } else {
        duplicatas.push({
          transacao,
          motivo: motivo || 'Motivo desconhecido'
        })
      }
    }
    
    return {
      paraImportar,
      duplicatas,
      avisos,
      estatisticas: {
        totalAnalisadas: novas.length,
        paraImportar: paraImportar.length,
        duplicatas: duplicatas.length,
        avisos: avisos.length
      }
    }
  }
  
  /**
   * Extrai mês/ano de uma data para comparação
   */
  extrairMesAno(data: string | Date): string {
    const d = typeof data === 'string' ? new Date(data) : data
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  
  /**
   * Agrupa transações por grupo de parcelamento
   * Útil para exibir no frontend
   */
  agruparPorParcelamento(transacoes: TransactionForDeduplication[]) {
    const grupos: Record<string, {
      id: string
      descricaoBase: string
      totalParcelas: number
      valorParcela: number
      parcelas: TransactionForDeduplication[]
    }> = {}
    const avulsas: TransactionForDeduplication[] = []
    
    const enriquecidas = this.enriquecerTransacoes(transacoes)
    
    enriquecidas.forEach(t => {
      if (t.grupoParcelamento) {
        if (!grupos[t.grupoParcelamento]) {
          grupos[t.grupoParcelamento] = {
            id: t.grupoParcelamento,
            descricaoBase: t.descricao.replace(/\(\d+\/\d+\)/, '').trim(),
            totalParcelas: t.parcelamento?.totalParcelas || 0,
            valorParcela: t.valor,
            parcelas: []
          }
        }
        grupos[t.grupoParcelamento].parcelas.push(t)
      } else {
        avulsas.push(t)
      }
    })
    
    return {
      parcelamentos: Object.values(grupos),
      avulsas
    }
  }
  
  /**
   * Valida se um conjunto de transações tem problemas de duplicação
   * Útil para preview antes de importar
   */
  async validarImportacao(
    novasTransacoes: TransactionForDeduplication[],
    transacoesExistentes: TransactionForDeduplication[],
    opcoes: DeduplicationOptions = {}
  ): Promise<DeduplicationResult & { valido: boolean; recomendacoes: Array<{ tipo: string; mensagem: string }> }> {
    const resultado = await this.filtrarDuplicatas(
      novasTransacoes,
      transacoesExistentes,
      opcoes
    )
    
    const temProblemas = resultado.duplicatas.length > 0 || resultado.avisos.length > 0
    
    return {
      ...resultado,
      valido: !temProblemas || !!opcoes.permitirDuplicatasExatas,
      recomendacoes: this.gerarRecomendacoes(resultado)
    }
  }
  
  /**
   * Gera recomendações baseadas na análise
   */
  gerarRecomendacoes(resultado: DeduplicationResult): Array<{ tipo: string; mensagem: string }> {
    const recomendacoes: Array<{ tipo: string; mensagem: string }> = []
    
    if (resultado.duplicatas.length > 0) {
      recomendacoes.push({
        tipo: 'warning',
        mensagem: `${resultado.duplicatas.length} transação(ões) duplicada(s) será(ão) ignorada(s)`
      })
    }
    
    const parcelamentosComAvisos = resultado.avisos.filter(a => 
      a.tipo === 'parcelamento_existente'
    )
    
    if (parcelamentosComAvisos.length > 0) {
      recomendacoes.push({
        tipo: 'info',
        mensagem: `${parcelamentosComAvisos.length} parcelamento(s) já existe(m). Importando apenas parcela do mês atual.`
      })
    }
    
    if (resultado.paraImportar.length === 0) {
      recomendacoes.push({
        tipo: 'error',
        mensagem: 'Nenhuma transação nova para importar. Todas já existem no sistema.'
      })
    }
    
    return recomendacoes
  }
}

