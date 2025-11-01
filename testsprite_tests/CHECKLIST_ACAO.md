# ✅ Checklist de Ação - Próximos Passos

## 🚨 URGENTE - Faça Agora (15-30 minutos)

### ☐ 1. Configurar Variáveis de Ambiente do Supabase

**Status:** ⏳ PENDENTE - BLOQUEIO CRÍTICO

**Passo a Passo:**

```bash
# 1. Acesse o dashboard do Supabase
https://supabase.com/dashboard/project/mffeygimsgjliwifouox/settings/api

# 2. Copie as credenciais:
#    - Project URL
#    - Anon/Public Key

# 3. Crie o arquivo .env.local na raiz do projeto
# (Use seu editor de texto ou IDE)

# 4. Cole este conteúdo (substitua com suas credenciais):
NEXT_PUBLIC_SUPABASE_URL=https://mffeygimsgjliwifouox.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui

# 5. Salve o arquivo

# 6. Reinicie o servidor
# Pare o servidor atual (Ctrl+C no terminal)
npm run dev

# 7. Teste se funcionou
# Abra: http://localhost:3000
# Você deve ver a tela de login sem erros
```

**Documentação Completa:** `SETUP_SUPABASE.md`

---

## 📋 ALTA PRIORIDADE - Hoje/Amanhã (2-4 horas)

### ☐ 2. Validar Estrutura do Banco de Dados

**Status:** ⏳ PENDENTE

**Ações:**
- [ ] Acessar Supabase Table Editor
- [ ] Verificar se estas tabelas existem:
  - [ ] `profiles` (perfis de usuário)
  - [ ] `cards` (cartões)
  - [ ] `categories` (categorias)
  - [ ] `transactions` (transações)
  - [ ] `budgets` (orçamentos)
  - [ ] `insights` (insights)
  - [ ] `user_settings` (configurações)
- [ ] Se alguma tabela estiver faltando, criar conforme schema
- [ ] Verificar Row Level Security (RLS) ativado
- [ ] Testar policies básicas

**Tempo Estimado:** 1-2 horas

### ☐ 3. Criar Usuário de Teste

**Status:** ⏳ PENDENTE

**Ações:**
```bash
# 1. Acesse: http://localhost:3000/signup
# 2. Crie uma conta de teste:
#    Email: teste@exemplo.com
#    Senha: Teste123!
# 3. Confirme email (se necessário)
# 4. Faça login
```

**Tempo Estimado:** 10 minutos

### ☐ 4. Teste Manual - Fluxo Crítico 1: Autenticação

**Status:** ⏳ PENDENTE

**Casos de Teste:**
- [ ] TC002: Login com credenciais válidas
  - [ ] Acessar /login
  - [ ] Inserir email e senha
  - [ ] Clicar em "Entrar"
  - [ ] ✅ Verificar redirecionamento para /dashboard
  - [ ] ✅ Verificar que usuário está logado
  
- [ ] TC003: Login com senha incorreta
  - [ ] Acessar /login
  - [ ] Inserir email válido e senha incorreta
  - [ ] Clicar em "Entrar"
  - [ ] ✅ Verificar mensagem de erro
  - [ ] ✅ Verificar que não foi redirecionado

- [ ] TC005: Proteção de rotas
  - [ ] Fazer logout
  - [ ] Tentar acessar /dashboard diretamente
  - [ ] ✅ Verificar redirecionamento para /login

**Tempo Estimado:** 30 minutos

### ☐ 5. Teste Manual - Fluxo Crítico 2: Dashboard

**Status:** ⏳ PENDENTE

**Caso de Teste:**
- [ ] TC011: Dashboard carrega corretamente
  - [ ] Login realizado
  - [ ] Acessar /dashboard
  - [ ] ✅ Verificar KPIs exibidos:
    - [ ] Total Gasto
    - [ ] Média Diária
    - [ ] Projeção do Mês
    - [ ] Orçamento Usado
    - [ ] Saldo Disponível
    - [ ] Dias de Reserva
  - [ ] ✅ Verificar gráficos renderizam (podem estar vazios)
  - [ ] ✅ Verificar seção de insights
  - [ ] ✅ Verificar botão "Sair" funciona

**Tempo Estimado:** 20 minutos

---

## 🎯 MÉDIA PRIORIDADE - Esta Semana (4-8 horas)

### ☐ 6. Teste Manual - Transações

**Status:** ⏳ PENDENTE

**Casos de Teste:**
- [ ] TC007: CRUD de Transações
  - [ ] Criar nova transação (débito)
  - [ ] Criar nova transação (crédito)
  - [ ] Criar nova transação (PIX)
  - [ ] Editar transação existente
  - [ ] Excluir transação
  - [ ] Verificar reflexo no dashboard

- [ ] TC008: Filtros de Transações
  - [ ] Filtrar por data
  - [ ] Filtrar por categoria
  - [ ] Filtrar por cartão
  - [ ] Filtrar por tipo de pagamento
  - [ ] Buscar por descrição

**Tempo Estimado:** 2 horas

### ☐ 7. Teste Manual - Cartões

**Status:** ⏳ PENDENTE

**Caso de Teste:**
- [ ] TC006: Gestão de Cartões
  - [ ] Adicionar cartão de crédito
  - [ ] Adicionar cartão de débito
  - [ ] Adicionar mais cartões (testar sem limite)
  - [ ] Editar informações de cartão
  - [ ] Excluir cartão
  - [ ] Verificar cartões na lista de transações

**Tempo Estimado:** 1 hora

### ☐ 8. Teste Manual - Orçamentos

**Status:** ⏳ PENDENTE

**Caso de Teste:**
- [ ] TC010: Gestão de Orçamentos
  - [ ] Criar orçamento mensal para categoria
  - [ ] Verificar tracking de uso
  - [ ] Adicionar transação que exceda orçamento
  - [ ] Verificar alerta/notificação
  - [ ] Editar orçamento
  - [ ] Excluir orçamento

**Tempo Estimado:** 1 hora

### ☐ 9. Documentar Bugs Encontrados

**Status:** ⏳ PENDENTE

**Ações:**
- [ ] Criar arquivo `BUGS.md`
- [ ] Para cada bug encontrado, documentar:
  - Título descritivo
  - Passos para reproduzir
  - Comportamento esperado
  - Comportamento atual
  - Screenshot (se aplicável)
  - Prioridade (Crítico/Alto/Médio/Baixo)

**Tempo Estimado:** Conforme bugs encontrados

---

## 🔧 BAIXA PRIORIDADE - Próximas 2 Semanas (16-24 horas)

### ☐ 10. Configurar Testes Automatizados

**Status:** ⏳ PENDENTE

**Ações:**
```bash
# 1. Instalar Playwright
npm install -D @playwright/test

# 2. Inicializar
npx playwright install

# 3. Criar primeiro teste
mkdir -e e2e
# Criar arquivo: e2e/auth.spec.ts

# 4. Executar
npx playwright test
```

**Tempo Estimado:** 4-6 horas

### ☐ 11. Configurar Testes Unitários

**Status:** ⏳ PENDENTE

**Ações:**
```bash
# 1. Instalar Jest + React Testing Library
npm install -D jest @testing-library/react @testing-library/jest-dom

# 2. Configurar Jest para Next.js
# Criar: jest.config.js

# 3. Criar primeiro teste
mkdir -p src/__tests__
# Criar: src/__tests__/components/Button.test.tsx

# 4. Executar
npm test
```

**Tempo Estimado:** 4-6 horas

### ☐ 12. Implementar CI/CD

**Status:** ⏳ PENDENTE

**Ações:**
- [ ] Criar `.github/workflows/test.yml`
- [ ] Configurar GitHub Actions
- [ ] Adicionar steps:
  - [ ] Install dependencies
  - [ ] Run linter
  - [ ] Run type check
  - [ ] Run tests
  - [ ] Build
- [ ] Configurar deploy automático (Vercel)

**Tempo Estimado:** 2-3 horas

### ☐ 13. Melhorar Documentação

**Status:** ⏳ PENDENTE

**Ações:**
- [ ] Atualizar `README.md` com:
  - [ ] Setup completo
  - [ ] Estrutura do projeto
  - [ ] Como contribuir
  - [ ] Como testar
- [ ] Criar `CONTRIBUTING.md`
- [ ] Criar `.env.local.example`
- [ ] Adicionar badges (build status, coverage)

**Tempo Estimado:** 2-3 horas

### ☐ 14. Testes de Performance

**Status:** ⏳ PENDENTE

**Ações:**
- [ ] Executar Lighthouse audit
- [ ] Medir Core Web Vitals
- [ ] Identificar bottlenecks
- [ ] Implementar otimizações:
  - [ ] Code splitting
  - [ ] Lazy loading
  - [ ] Image optimization
  - [ ] Query optimization

**Tempo Estimado:** 4-6 horas

### ☐ 15. Testes de Segurança

**Status:** ⏳ PENDENTE

**Ações:**
- [ ] Validar RLS policies
- [ ] Testar SQL injection
- [ ] Testar XSS
- [ ] Verificar CSRF protection
- [ ] Audit de dependências
- [ ] Rate limiting

**Tempo Estimado:** 4-6 horas

---

## 📊 Progresso Geral

**Total de Tarefas:** 15

**Por Prioridade:**
- 🚨 Urgente: 1 tarefa (BLOQUEIO)
- 🔴 Alta: 4 tarefas
- 🟡 Média: 4 tarefas
- 🟢 Baixa: 6 tarefas

**Tempo Total Estimado:** 40-60 horas

**Status Atual:**
- ✅ Completadas: 0
- ⏳ Pendentes: 15
- 🚧 Em Progresso: 0

---

## 🎯 Foco Esta Semana

1. ⚡ **URGENTE:** Configurar Supabase (tarefa #1)
2. 🔴 **ALTA:** Validar banco de dados (tarefa #2)
3. 🔴 **ALTA:** Testes manuais de autenticação (tarefa #4)
4. 🔴 **ALTA:** Testes manuais de dashboard (tarefa #5)

**Meta da Semana:** Desbloquear e validar fluxos críticos

---

## 📞 Precisa de Ajuda?

**Documentos de Referência:**
- 📊 Relatório Completo: `testsprite_tests/RELATORIO_DE_TESTES.md`
- 🔧 Setup Supabase: `SETUP_SUPABASE.md`
- 📋 Resumo Executivo: `testsprite_tests/RESUMO_EXECUTIVO.md`
- 📖 Plano de Testes: `testsprite_tests/testsprite_frontend_test_plan.json`

**Próxima Ação Imediata:**
👉 **Configure o Supabase agora!** (tarefa #1)

---

*Última atualização: 31/10/2025*


