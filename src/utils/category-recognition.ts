/**
 * Sistema de reconhecimento automático de categorias
 * Baseado na descrição da transação
 */

/**
 * Mapeia palavras-chave da descrição para categorias
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Alimentação': [
    'supermercado', 'mercado', 'padaria', 'padaria', 'bakery',
    'restaurante', 'lanchonete', 'pizzaria', 'hamburgueria',
    'delivery', 'ifood', 'uber eats', 'rappi',
    'comida', 'alimento', 'alimentação', 'alimentacao',
    'café', 'cafe', 'starbucks', 'cafeteria',
    'acai', 'açai', 'fast food', 'mc donalds', 'mcdonalds'
  ],
  'Transporte': [
    'uber', '99', 'taxi', 'táxi',
    'combustível', 'combustivel', 'posto', 'gasolina',
    'estacionamento', 'parking', 'zona azul',
    'pedágio', 'pedagio', 'sem parar',
    'ônibus', 'onibus', 'metro', 'metrô', 'transporte público',
    'bilhete único', 'cartão transporte', 'transporte'
  ],
  'Moradia': [
    'aluguel', 'aluguel', 'rent',
    'condomínio', 'condominio', 'condominio',
    'iptu', 'ipvu', 'taxa',
    'energia', 'luz', 'eletricidade', 'ceb', 'cemig', 'copel',
    'água', 'agua', 'saneamento', 'sanepar', 'sabesp',
    'gás', 'gas', 'gás natural', 'gas natural',
    'internet', 'wi-fi', 'wifi', 'net', 'vivo', 'claro', 'oi',
    'telefone', 'fixo', 'celular', 'tim', 'vivo', 'claro'
  ],
  'Saúde': [
    'farmacia', 'farmácia', 'drugstore', 'drogaria',
    'médico', 'medico', 'doctor', 'consulta',
    'hospital', 'clinica', 'clínica',
    'laboratório', 'laboratorio', 'exame',
    'plano de saúde', 'plano saude', 'unimed', 'amil', 'sulamerica',
    'odontologia', 'dentista', 'dental', 'odonto',
    'medicamento', 'remedio', 'remédio'
  ],
  'Educação': [
    'escola', 'colégio', 'colegio', 'university', 'universidade',
    'curso', 'faculdade', 'faculdade',
    'material escolar', 'livro', 'didatico', 'didático',
    'mensalidade', 'matricula', 'matrícula',
    'ensino', 'educação', 'educacao', 'education'
  ],
  'Lazer': [
    'cinema', 'netflix', 'spotify', 'youtube premium',
    'show', 'concerto', 'festival',
    'viagem', 'turismo', 'hotel', 'airbnb',
    'praia', 'parque', 'diversão', 'diversao',
    'jogo', 'game', 'playstation', 'xbox', 'steam',
    'bar', 'balada', 'festas', 'evento'
  ],
  'Vestuário': [
    'roupa', 'moda', 'fashion', 'vestuário', 'vestuario',
    'calçado', 'calcado', 'sapato', 'tenis', 'tênis',
    'acessorio', 'acessório', 'joia', 'relogio', 'relógio'
  ],
  'Eletrônicos': [
    'notebook', 'laptop', 'computador', 'pc',
    'smartphone', 'celular', 'iphone', 'samsung',
    'tablet', 'ipad',
    'tv', 'televisão', 'televisao',
    'eletronico', 'eletrônico', 'tech',
    'magazine luiza', 'magalu', 'casas bahia', 'extra', 'ponto frio',
    'amazon', 'mercado livre', 'mercado livre'
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
 * Reconhece categoria baseada na descrição da transação
 */
export function recognizeCategory(description: string): string {
  if (!description) return 'Outros'

  const normalizedDesc = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  // Verifica cada categoria e suas palavras-chave
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (normalizedDesc.includes(normalizedKeyword)) {
        return category
      }
    }
  }

  return 'Outros'
}

/**
 * Reconhece múltiplas categorias para um array de descrições
 * Retorna um mapa de descrição -> categoria
 */
export function recognizeCategories(descriptions: string[]): Map<string, string> {
  const categoryMap = new Map<string, string>()

  for (const desc of descriptions) {
    categoryMap.set(desc, recognizeCategory(desc))
  }

  return categoryMap
}

