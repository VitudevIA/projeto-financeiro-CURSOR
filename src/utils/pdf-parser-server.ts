/**
 * Função auxiliar para processar PDF no servidor usando pdf-parse
 * Criado como arquivo separado para garantir compatibilidade com Next.js
 * 
 * Usa pdf-parse v1.1.1 que é simples, estável e funciona perfeitamente no Node.js
 * sem requerer workers, canvas ou outras dependências complexas
 */

// Esta função só é usada no servidor (Node.js)
// Next.js permite require em API routes
export async function extractTextFromPDFServer(buffer: Buffer): Promise<string> {
  try {
    // Validações CRÍTICAS antes de processar
    
    // 1. Verifica se buffer existe
    if (!buffer) {
      throw new Error('Buffer é null ou undefined')
    }
    
    // 2. Verifica se é realmente um Buffer
    if (!Buffer.isBuffer(buffer)) {
      const bufferType = typeof buffer
      const bufferConstructor = buffer?.constructor?.name
      throw new Error(
        `Buffer não é uma instância válida de Buffer. ` +
        `Tipo recebido: ${bufferType}, Constructor: ${bufferConstructor}. ` +
        `Isso pode indicar que uma string ou caminho de arquivo foi passado em vez de Buffer.`
      )
    }
    
    // 3. Verifica se não é uma string
    if (typeof buffer === 'string') {
      throw new Error('Erro: Buffer é uma string. Isso indica que um caminho de arquivo pode ter sido passado acidentalmente.')
    }
    
    // 4. Verifica se não está vazio
    if (buffer.length === 0) {
      throw new Error('Buffer vazio fornecido para processamento de PDF')
    }
    
    // 5. Log para debug
    console.log('[PDF Parser Server] Validando Buffer:', {
      isBuffer: Buffer.isBuffer(buffer),
      bufferLength: buffer.length,
      bufferType: typeof buffer,
      firstBytes: buffer.slice(0, 10).toString('hex'),
    })

    // 6. Verifica se o buffer tem o header correto de PDF (%PDF)
    const pdfHeader = buffer.slice(0, 4).toString('ascii')
    if (pdfHeader !== '%PDF') {
      throw new Error(`Arquivo não é um PDF válido. Header inválido. Header encontrado: "${pdfHeader}" (esperado: "%PDF")`)
    }

    // Importa pdf-parse dinamicamente
    // CRÍTICO: pdf-parse/index.js tem código que verifica !module.parent
    // Se module.parent não existir, entra em modo debug e tenta ler arquivo de teste
    // SOLUÇÃO: Importar diretamente de lib/pdf-parse.js que não tem esse código problemático
    
    let pdfParse: any
    try {
      const path = require('path')
      const fs = require('fs')
      
      // Resolve o caminho do pdf-parse instalado
      let pdfParseLibPath: string
      try {
        // Tenta encontrar o arquivo lib/pdf-parse.js diretamente
        const pdfParseMainPath = require.resolve('pdf-parse')
        pdfParseLibPath = path.join(path.dirname(pdfParseMainPath), 'lib', 'pdf-parse.js')
        
        // Verifica se o arquivo existe
        if (!fs.existsSync(pdfParseLibPath)) {
          throw new Error(`Arquivo lib/pdf-parse.js não encontrado em: ${pdfParseLibPath}`)
        }
        
        // Limpa cache para garantir que não há problemas
        if (require.cache[pdfParseLibPath]) {
          delete require.cache[pdfParseLibPath]
        }
        if (require.cache[pdfParseMainPath]) {
          delete require.cache[pdfParseMainPath]
        }
        
        // Importa diretamente do arquivo lib (evita o index.js problemático)
        // lib/pdf-parse.js exporta a função diretamente via module.exports
        pdfParse = require(pdfParseLibPath)
        
        // Valida que conseguimos a função
        if (typeof pdfParse !== 'function') {
          throw new Error(`lib/pdf-parse.js não exportou uma função. Tipo: ${typeof pdfParse}`)
        }
        
        console.log('[PDF Parser] pdf-parse carregado diretamente de lib/pdf-parse.js (evitando modo debug)')
      } catch (libError) {
        // Fallback: se não conseguir do lib, tenta require normal
        // Mas antes, garante que module.parent existe para evitar modo debug
        console.warn('[PDF Parser] Fallback: usando require normal, garantindo module.parent:', libError)
        
        // Cria um módulo filho fictício para garantir que module.parent existe
        const Module = require('module')
        const currentModule = module
        
        // Garante que temos parent definido
        if (!currentModule.parent) {
          // Cria um parent temporário
          ;(currentModule as any).parent = {
            id: __filename,
            filename: __filename,
            loaded: false,
          }
        }
        
        try {
          const pdfParseModule = require('pdf-parse')
          pdfParse = pdfParseModule?.default || pdfParseModule
        } finally {
          // Restaura estado original se necessário
          // (não precisamos fazer nada aqui normalmente)
        }
      }
      
      // Valida que conseguimos uma função
      if (typeof pdfParse !== 'function') {
        // Tenta extrair de diferentes formatos de exportação
        if (pdfParse && typeof pdfParse === 'object') {
          pdfParse = pdfParse.default || pdfParse.pdfParse || pdfParse
        }
        
        // Se ainda não é função, último recurso
        if (typeof pdfParse !== 'function') {
          throw new Error(
            `pdf-parse não exportou uma função. Tipo: ${typeof pdfParse}, ` +
            `Keys: ${Object.keys(pdfParse || {}).join(', ')}`
          )
        }
      }
    } catch (requireError) {
      const errorMsg = requireError instanceof Error ? requireError.message : 'Erro desconhecido'
      const errorStack = requireError instanceof Error ? requireError.stack : undefined
      
      console.error('[PDF Parser] Erro ao carregar pdf-parse:')
      console.error('Mensagem:', errorMsg)
      if (errorStack) {
        console.error('Stack:', errorStack)
      }
      
      throw new Error(
        `Biblioteca pdf-parse não pôde ser carregada. ` +
        `Certifique-se de que pdf-parse está instalado (npm install pdf-parse). ` +
        `Erro: ${errorMsg}`
      )
    }

    // Validação final: garante que temos uma função válida
    if (typeof pdfParse !== 'function') {
      console.error('[PDF Parser] pdf-parse exportado como:', typeof pdfParse)
      console.error('[PDF Parser] pdf-parse keys:', Object.keys(pdfParse || {}))
      throw new Error(
        `pdf-parse não está exportado como função após todas as tentativas. ` +
        `Tipo: ${typeof pdfParse}. Verifique a instalação da biblioteca.`
      )
    }
    
    // pdf-parse aceita Buffer diretamente e retorna uma Promise
    // IMPORTANTE: Passa APENAS o buffer, sem opções adicionais que podem causar problemas
    // O pdf-parse v1.1.1 aceita Buffer diretamente
    // 
    // CUIDADO: Se passar uma string, pdf-parse tentará ler como caminho de arquivo!
    // Por isso, validamos intensamente que é um Buffer antes de passar
    
    // Validação final: garante que não é uma string
    if (typeof buffer === 'string' || buffer instanceof String) {
      throw new Error(
        'ERRO CRÍTICO: Buffer é uma string! pdf-parse tentará ler como arquivo do disco. ' +
        'Isso causará erro ENOENT. Verifique a conversão File -> Buffer.'
      )
    }
    
    console.log('[PDF Parser Server] Chamando pdf-parse com Buffer:', {
      bufferLength: buffer.length,
      isBuffer: Buffer.isBuffer(buffer),
    })
    
    let data: any
    try {
      // IMPORTANTE: Passa APENAS o Buffer, sem nenhuma opção
      // pdf-parse v1.1.1 aceita Buffer diretamente
      // Se passar opções incorretas, pode causar problemas
      data = await pdfParse(buffer)
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : 'Erro desconhecido'
      const errorStack = parseError instanceof Error ? parseError.stack : undefined
      
      // Verifica se o erro é sobre arquivo não encontrado (indica que foi passado caminho)
      if (errorMessage.includes('ENOENT') || errorMessage.includes('no such file')) {
        throw new Error(
          `ERRO: pdf-parse tentou ler um arquivo do disco em vez de processar o Buffer. ` +
          `Isso indica que uma string/caminho foi passado em vez de Buffer. ` +
          `Erro: ${errorMessage}. ` +
          `Verifique a conversão do arquivo para Buffer.`
        )
      }
      
      // Se não for erro de arquivo, tenta com opções mínimas
      console.warn('[PDF Parser Server] Primeira tentativa falhou, tentando com opções:', errorMessage)
      try {
        data = await pdfParse(buffer, { max: 0 })
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido'
        throw new Error(
          `Erro ao processar PDF com pdf-parse. ` +
          `Tentativa 1: ${errorMessage}. ` +
          `Tentativa 2: ${fallbackMessage}. ` +
          `Verifique se o PDF está corrompido ou protegido por senha.`
        )
      }
    }
    
    // Retorna o texto extraído
    const extractedText = data?.text || ''
    
    // Log informações sobre o PDF processado
    console.log('[PDF Parser Server] PDF processado:', {
      numPages: data?.numpages || 'N/A',
      numRender: data?.numrender || 'N/A',
      textLength: extractedText.length,
      version: data?.version || 'N/A',
    })
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('Nenhum texto encontrado no PDF. O arquivo pode estar protegido por senha ou ser uma imagem digitalizada.')
    }
    
    // Log de uma amostra maior do texto para debug
    console.log(`[PDF Parser Server] Texto completo extraído (${extractedText.length} caracteres):`)
    console.log('[PDF Parser Server] Primeiros 2000 caracteres:', extractedText.substring(0, 2000))
    console.log('[PDF Parser Server] Últimos 500 caracteres:', extractedText.substring(Math.max(0, extractedText.length - 500)))
    
    return extractedText
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('Erro detalhado ao processar PDF:')
    console.error('Mensagem:', errorMessage)
    if (errorStack) {
      console.error('Stack trace:', errorStack)
    }
    
    // Evita encadear mensagens de erro
    if (errorMessage.includes('Erro ao processar PDF:')) {
      throw error
    }
    
    throw new Error(`Erro ao processar PDF: ${errorMessage}`)
  }
}

