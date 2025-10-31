# 🔧 INSTRUÇÕES PARA CORREÇÃO - BUG-001: Erro na Página de Orçamentos

**Bug ID:** BUG-001  
**Severidade:** 🟡 MÉDIA  
**Status:** 🔴 ABERTO  
**Tempo Estimado:** 2-4 horas

---

## 📋 RESUMO DO BUG

**Erro:** `column categories_1.type does not exist`  
**Página Afetada:** `/budgets` (Orçamentos)  
**Impacto:** Página completamente inacessível

---

## 🔍 DIAGNÓSTICO

### Sintomas
- Ao acessar `/budgets`, aparece erro de SQL
- Erro indica que a coluna `type` não existe na tabela `categories`
- Query SQL está tentando fazer JOIN ou SELECT incluindo `categories.type`

### Causa Raiz
A query no código está tentando acessar `categories.type`, mas essa coluna não existe no schema do banco de dados.

---

## 🛠️ PASSOS PARA CORREÇÃO

### ETAPA 1: Verificar Schema Atual

1. **Acesse o Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/mffeygimsgjliwifouox
   ```

2. **Navegue para:** Table Editor > `categories`

3. **Verifique as colunas existentes:**
   - `id`
   - `name`
   - `color`
   - `icon`
   - `user_id`
   - `created_at`
   - **❓ `type` existe?**

---

### ETAPA 2: Escolher Solução

#### ✅ SOLUÇÃO A: Adicionar Coluna `type` (RECOMENDADO)

**Quando usar:** Se a coluna `type` faz sentido no modelo de dados (ex: categorizar como "receita" ou "despesa")

**SQL para executar no Supabase:**

```sql
-- 1. Adicionar coluna type
ALTER TABLE categories 
ADD COLUMN type VARCHAR(20) DEFAULT 'expense';

-- 2. Adicionar constraint para garantir valores válidos
ALTER TABLE categories 
ADD CONSTRAINT categories_type_check 
CHECK (type IN ('income', 'expense'));

-- 3. Atualizar registros existentes (se necessário)
UPDATE categories 
SET type = 'expense' 
WHERE type IS NULL OR type = '';

-- 4. Criar índice para performance
CREATE INDEX idx_categories_type ON categories(type);

-- 5. Verificar resultado
SELECT id, name, type FROM categories LIMIT 10;
```

**Após executar SQL:**
1. Regenerar tipos TypeScript:
   ```bash
   npm run generate:types
   ```

2. Testar a página de orçamentos:
   ```
   http://localhost:3000/budgets
   ```

---

#### ✅ SOLUÇÃO B: Remover Referência no Código

**Quando usar:** Se a coluna `type` não é realmente necessária para o funcionamento

**Passos:**

1. **Localizar arquivo da página de orçamentos:**
   ```bash
   src/app/(protected)/budgets/page.tsx
   ```

2. **Buscar por query que usa `categories.type`:**
   ```typescript
   // Procure por algo como:
   .select('*, categories(*, type)')
   // ou
   .select('categories.type')
   ```

3. **Remover referência ao `type`:**
   ```typescript
   // ANTES:
   .select('*, categories(id, name, type, color, icon)')
   
   // DEPOIS:
   .select('*, categories(id, name, color, icon)')
   ```

4. **Verificar stores relacionados:**
   ```bash
   src/lib/stores/budget-store.ts
   src/lib/stores/category-store.ts
   ```

5. **Buscar por `categories.type` em todo o projeto:**
   ```bash
   # No terminal:
   grep -r "categories.*type" src/
   ```

6. **Remover todas as referências encontradas**

---

### ETAPA 3: Testar Correção

1. **Reiniciar servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

2. **Fazer login:**
   ```
   Email: victorfernandesexata@gmail.com
   Senha: 12345678
   ```

3. **Navegar para Orçamentos:**
   ```
   http://localhost:3000/budgets
   ```

4. **Verificar:**
   - ✅ Página carrega sem erro
   - ✅ Mensagem de estado vazio aparece (se sem orçamentos)
   - ✅ Botão "Novo Orçamento" funciona

---

## 🎯 VALIDAÇÃO PÓS-CORREÇÃO

### Checklist de Validação

- [ ] Página `/budgets` carrega sem erro
- [ ] Possível criar novo orçamento
- [ ] Possível editar orçamento
- [ ] Possível excluir orçamento
- [ ] Dashboard reflete dados de orçamento
- [ ] KPI "Orçamento Usado" atualiza corretamente
- [ ] Sem erros no console do navegador
- [ ] Sem erros no terminal do servidor

---

## 📁 ARQUIVOS POTENCIALMENTE ENVOLVIDOS

### Arquivos a Verificar:

1. **Página de Orçamentos:**
   ```
   src/app/(protected)/budgets/page.tsx
   ```

2. **Store de Orçamentos:**
   ```
   src/lib/stores/budget-store.ts
   ```

3. **Store de Categorias:**
   ```
   src/lib/stores/category-store.ts
   ```

4. **Tipos Supabase:**
   ```
   src/types/supabase.ts
   ```

5. **Componentes de Orçamento:**
   ```
   src/components/budgets/*.tsx
   ```

---

## 🔍 COMANDOS ÚTEIS

### Buscar referências a `categories.type`:
```bash
grep -r "categories.*type" src/
```

### Regenerar tipos TypeScript:
```bash
npm run generate:types
```

### Reiniciar servidor:
```bash
npm run dev
```

### Ver logs do Supabase:
Acesse o Dashboard > Logs > Database

---

## 📊 ANÁLISE DE IMPACTO

### O que está quebrado:
- ❌ Página de orçamentos

### O que continua funcionando:
- ✅ Login/Logout
- ✅ Dashboard
- ✅ Transações
- ✅ Cartões
- ✅ Configurações
- ✅ Todos os outros módulos

### Urgência:
🟡 **MÉDIA** - Sistema utilizável sem orçamentos, mas funcionalidade importante

---

## 🚀 PRÓXIMOS PASSOS APÓS CORREÇÃO

1. **Testar CRUD completo de orçamentos:**
   - Criar orçamento
   - Editar orçamento
   - Excluir orçamento

2. **Validar integração com dashboard:**
   - KPI "Orçamento Usado" deve funcionar
   - Alertas de orçamento devem aparecer

3. **Criar teste automatizado:**
   ```typescript
   test('deve carregar página de orçamentos', async () => {
     await page.goto('/budgets');
     await expect(page.locator('h1')).toContainText('Orçamentos');
   });
   ```

4. **Documentar correção:**
   - Atualizar este documento com solução aplicada
   - Registrar no changelog do projeto

---

## 📝 TEMPLATE DE COMMIT

```
fix(budgets): corrige erro "column categories.type does not exist"

- Adiciona coluna 'type' na tabela categories
- Atualiza query para incluir type
- Regenera tipos TypeScript
- Testa página de orçamentos

Resolve: BUG-001
Fixes: #[número-da-issue]
```

---

## 🆘 AJUDA ADICIONAL

### Se a correção não funcionar:

1. **Limpar cache do Next.js:**
   ```bash
   rm -rf .next
   npm run dev
   ```

2. **Verificar tipos estão atualizados:**
   ```bash
   npm run generate:types
   cat src/types/supabase.ts | grep -A 10 "categories"
   ```

3. **Verificar conexão Supabase:**
   ```bash
   # Verifique .env.local
   cat .env.local | grep SUPABASE
   ```

4. **Consultar logs detalhados:**
   - Abrir DevTools (F12)
   - Aba Network > filtrar por "error"
   - Aba Console > ver mensagens de erro completas

---

## 💡 DICA PRO

Para evitar esse tipo de erro no futuro:

1. **Sempre regenerar tipos após mudanças no schema:**
   ```bash
   npm run generate:types
   ```

2. **Usar TypeScript strict mode**

3. **Criar migration files para todas as mudanças de schema**

4. **Testar queries no SQL Editor do Supabase antes de usar no código**

---

**Boa sorte com a correção! 🚀**

Se precisar de ajuda, consulte:
- `testsprite_tests/RELATORIO_COMPLETO_TESTES_FUNCIONAIS.md`
- Documentação do Supabase: https://supabase.com/docs
- README do projeto

---

*Documento criado em: 31/10/2025*  
*Última atualização: 31/10/2025*


