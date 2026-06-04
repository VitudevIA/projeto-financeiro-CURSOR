/**
 * Sistema de reconhecimento automático de categorias
 * Baseado na descrição da transação e categorias reais do usuário
 * Usa histórico de transações para melhorar precisão
 */

export interface Category {
  id: string
  name: string
  type: 'income' | 'expense' | null
}

interface TransactionHistory {
  description: string
  category_id: string
  category_name: string
}

/**
 * Mapeia palavras-chave da descrição para categorias comuns
 * Usado como fallback quando não há histórico
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Alimentação': [
    'supermercado', 'mercado', 'padaria', 'bakery',
    'restaurante', 'lanchonete', 'pizzaria', 'hamburgueria',
    'delivery', 'ifood', 'uber eats', 'rappi',
    'comida', 'alimento', 'alimentação', 'alimentacao',
    'café', 'cafe', 'starbucks', 'cafeteria',
    'acai', 'açai', 'fast food', 'mc donalds', 'mcdonalds',
    'burger', 'subway', 'giraffas', 'outback', 'applebees'
  ],
  'Transporte': [
    'uber', '99', 'taxi', 'táxi',
    'combustível', 'combustivel', 'posto', 'gasolina', 'petrobras', 'shell', 'ipiranga',
    'estacionamento', 'parking', 'zona azul',
    'pedágio', 'pedagio', 'sem parar', 'conectcar', 'veloe',
    'ônibus', 'onibus', 'metro', 'metrô', 'transporte público',
    'bilhete único', 'cartão transporte', 'transporte'
  ],
  'Moradia': [
    'aluguel', 'rent',
    'condomínio', 'condominio',
    'iptu', 'ipvu', 'taxa',
    'energia', 'luz', 'eletricidade', 'ceb', 'cemig', 'copel', 'enel', 'light',
    'água', 'agua', 'saneamento', 'sanepar', 'sabesp', 'copasa', 'caesb',
    'gás', 'gas', 'gás natural', 'gas natural', 'comgas', 'petrobras gas',
    'internet', 'wi-fi', 'wifi', 'net', 'vivo', 'claro', 'oi', 'tim',
    'telefone', 'fixo', 'celular'
  ],
  'Saúde': [
    'farmacia', 'farmácia', 'drugstore', 'drogaria', 'pague menos', 'raia', 'drogasil',
    'médico', 'medico', 'doctor', 'consulta',
    'hospital', 'clinica', 'clínica',
    'laboratório', 'laboratorio', 'exame', 'delboni', 'fleury',
    'plano de saúde', 'plano saude', 'unimed', 'amil', 'sulamerica', 'bradesco saude',
    'odontologia', 'dentista', 'dental', 'odonto',
    'medicamento', 'remedio', 'remédio'
  ],
  'Educação': [
    'escola', 'colégio', 'colegio', 'university', 'universidade',
    'curso', 'faculdade',
    'material escolar', 'livro', 'didatico', 'didático',
    'mensalidade', 'matricula', 'matrícula',
    'ensino', 'educação', 'educacao', 'education',
    'kumon', 'khan academy', 'coursera', 'udemy'
  ],
  'Lazer': [
    'cinema', 'netflix', 'spotify', 'youtube premium', 'prime video', 'disney',
    'show', 'concerto', 'festival',
    'viagem', 'turismo', 'hotel', 'airbnb', 'booking',
    'praia', 'parque', 'diversão', 'diversao',
    'jogo', 'game', 'playstation', 'xbox', 'steam', 'nintendo',
    'bar', 'balada', 'festas', 'evento'
  ],
  'Vestuário': [
    'roupa', 'moda', 'fashion', 'vestuário', 'vestuario',
    'calçado', 'calcado', 'sapato', 'tenis', 'tênis',
    'acessorio', 'acessório', 'joia', 'relogio', 'relógio',
    'shein', 'zara', 'renner', 'riachuelo', 'c&a', 'h&m'
  ],
  'Eletrônicos': [
    'notebook', 'laptop', 'computador', 'pc',
    'smartphone', 'celular', 'iphone', 'samsung',
    'tablet', 'ipad',
    'tv', 'televisão', 'televisao',
    'eletronico', 'eletrônico', 'tech',
    'magazine luiza', 'magalu', 'casas bahia', 'extra', 'ponto frio',
    'amazon', 'mercado livre', 'mercadolivre'
  ],
  'Utilidades': [
    'conta', 'pagamento', 'boleto',
    'serviço', 'servico', 'service',
    'assinatura', 'assinatura mensal',
    'assinatura anual', 'plano'
  ],
  'Outros': []
}

/**
 * Camada 0: sanitização volátil em memória para busca/cruzamento.
 * Nunca persista o retorno desta função — a descrição bruta da fatura vai ao banco.
 */
function sanitizeDescriptionForMatching(description: string): string {
  return description
    .replace(/^(?:EC|MP|DM|PIX|PG|COMPRA|PAGAMENTO)\s*\*\s*/gi, '')
    .replace(/(?:PARC\s*)?\(?(\d{1,2})\s*[\/de\s]+\s*(\d{1,2})\)?/gi, '')
    .replace(/\s\(?(\d{1,2})\/(\d{1,2})\)?/g, '')
    .replace(/\s\(\d{1,2}\/\d{1,2}\)\s*$/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normaliza texto removendo acentos e convertendo para lowercase
 */
function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}
/**
 * Calcula similaridade entre duas strings (já sanitizadas/normalizadas)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1)
  const s2 = normalizeText(str2)
  
  if (s1 === s2) return 1.0
  if (s1.includes(s2) || s2.includes(s1)) return 0.8
  
  // Verifica se palavras-chave se sobrepõem
  const words1 = s1.split(/\s+/)
  const words2 = s2.split(/\s+/)
  const commonWords = words1.filter(w => w.length > 2 && words2.includes(w))
  
  if (commonWords.length > 0) {
    return 0.6 + (commonWords.length / Math.max(words1.length, words2.length)) * 0.2
  }
  
  return 0
}

/**
 * Camada 1: busca categoria no histórico do usuário usando termos sanitizados
 */
function findCategoryFromHistory(
  sanitizedDescription: string,
  history: TransactionHistory[]
): { categoryId: string; categoryName: string; confidence: number } | null {
  if (!history || history.length === 0) return null
  if (!sanitizedDescription || sanitizedDescription.length < 2) return null

  const normalizedCurrent = normalizeText(sanitizedDescription)

  const categoryScores = new Map<string, { count: number; totalSimilarity: number; categoryName: string }>()

  for (const transaction of history) {
    const sanitizedHistory = sanitizeDescriptionForMatching(transaction.description)
    if (!sanitizedHistory) continue

    const normalizedHistory = normalizeText(sanitizedHistory)
    const similarity = calculateSimilarity(normalizedCurrent, normalizedHistory)

    if (similarity > 0.3) {
      const existing = categoryScores.get(transaction.category_id) || {
        count: 0,
        totalSimilarity: 0,
        categoryName: transaction.category_name,
      }

      existing.count++
      existing.totalSimilarity += similarity
      categoryScores.set(transaction.category_id, existing)
    }
  }

  let bestMatch: { categoryId: string; categoryName: string; confidence: number } | null = null
  let bestScore = 0

  for (const [categoryId, data] of categoryScores.entries()) {
    const avgSimilarity = data.totalSimilarity / data.count
    const frequencyBonus = Math.min(data.count / 10, 0.3)
    const score = avgSimilarity + frequencyBonus

    if (score > bestScore && score > 0.5) {
      bestScore = score
      bestMatch = {
        categoryId,
        categoryName: data.categoryName,
        confidence: score,
      }
    }
  }

  return bestMatch
}

/**
 * Camada 2: dicionário global de palavras-chave + match por nome de categoria
 */
function findCategoryByKeywords(
  sanitizedDescription: string,
  categories: Category[]
): { categoryId: string; categoryName: string; confidence: number } | null {
  if (!categories || categories.length === 0) return null
  if (!sanitizedDescription) return null

  const normalizedDesc = normalizeText(sanitizedDescription)
  
  // 1. Tenta match exato ou parcial no nome da categoria
  for (const category of categories) {
    const normalizedCategoryName = normalizeText(category.name)
    
    // Match exato
    if (normalizedDesc.includes(normalizedCategoryName) || normalizedCategoryName.includes(normalizedDesc)) {
      return {
        categoryId: category.id,
        categoryName: category.name,
        confidence: 0.9
      }
    }
    
    // Match por palavras
    const descWords = normalizedDesc.split(/\s+/)
    const categoryWords = normalizedCategoryName.split(/\s+/)
    const commonWords = descWords.filter(w => w.length > 2 && categoryWords.includes(w))
    
    if (commonWords.length > 0 && commonWords.length >= categoryWords.length * 0.5) {
      return {
        categoryId: category.id,
        categoryName: category.name,
        confidence: 0.7
      }
    }
  }
  
  // 2. Tenta match por palavras-chave conhecidas
  for (const [keywordCategory, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      const normalizedKeyword = normalizeText(keyword)
      if (normalizedDesc.includes(normalizedKeyword)) {
        // Encontra categoria correspondente no banco
        const matchingCategory = categories.find(c => 
          normalizeText(c.name) === normalizeText(keywordCategory) ||
          calculateSimilarity(c.name, keywordCategory) > 0.7
        )
        
        if (matchingCategory) {
          return {
            categoryId: matchingCategory.id,
            categoryName: matchingCategory.name,
            confidence: 0.6
          }
        }
      }
    }
  }
  
  // 3. Tenta match por similaridade no nome
  let bestMatch: { categoryId: string; categoryName: string; confidence: number } | null = null
  let bestSimilarity = 0
  
  for (const category of categories) {
    const similarity = calculateSimilarity(sanitizedDescription, category.name)
    if (similarity > bestSimilarity && similarity > 0.4) {
      bestSimilarity = similarity
      bestMatch = {
        categoryId: category.id,
        categoryName: category.name,
        confidence: similarity * 0.8
      }
    }
  }
  
  return bestMatch
}

/**
 * Reconhece categoria baseada na descrição bruta da transação.
 * A sanitização ocorre apenas em memória; a descrição original nunca é alterada.
 */
export async function recognizeCategory(
  description: string,
  categories: Category[],
  history?: TransactionHistory[]
): Promise<{ categoryId: string | null; categoryName: string | null; confidence: number }> {
  if (!description) {
    return { categoryId: null, categoryName: null, confidence: 0 }
  }

  const sanitizedForMatching = sanitizeDescriptionForMatching(description)

  // Camada 1: histórico do usuário (aprendizado por estabelecimento)
  if (history && history.length > 0) {
    const historyMatch = findCategoryFromHistory(sanitizedForMatching, history)
    if (historyMatch && historyMatch.confidence > 0.6) {
      return {
        categoryId: historyMatch.categoryId,
        categoryName: historyMatch.categoryName,
        confidence: historyMatch.confidence,
      }
    }
  }

  // Camada 2: dicionário global de palavras-chave
  if (categories && categories.length > 0) {
    const keywordMatch = findCategoryByKeywords(sanitizedForMatching, categories)
    if (keywordMatch) {
      return keywordMatch
    }
  }

  return { categoryId: null, categoryName: null, confidence: 0 }
}

/**
 * Versão simplificada para compatibilidade (retorna apenas nome)
 * @deprecated Use recognizeCategory com categorias do usuário
 */
export function recognizeCategoryLegacy(description: string): string {
  if (!description) return 'Outros'

  const normalizedDesc = normalizeText(sanitizeDescriptionForMatching(description))

  // Verifica cada categoria e suas palavras-chave
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      const normalizedKeyword = normalizeText(keyword)
      if (normalizedDesc.includes(normalizedKeyword)) {
        return category
      }
    }
  }

  return 'Outros'
}

/**
 * Reconhece múltiplas categorias para um array de descrições
 */
export async function recognizeCategories(
  descriptions: string[],
  categories: Category[],
  history?: TransactionHistory[]
): Promise<Map<string, { categoryId: string | null; categoryName: string | null }>> {
  const categoryMap = new Map<string, { categoryId: string | null; categoryName: string | null }>()

  for (const desc of descriptions) {
    const result = await recognizeCategory(desc, categories, history)
    categoryMap.set(desc, {
      categoryId: result.categoryId,
      categoryName: result.categoryName
    })
  }

  return categoryMap
}

