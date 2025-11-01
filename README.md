# 💰 Sistema de Gestão Financeira Pessoal

Sistema completo de gestão financeira pessoal desenvolvido com Next.js 16, React 19, TypeScript e Supabase.

## 🚀 Status do Projeto

✅ **Todas as implementações concluídas!**
- ✅ Testes automatizados (Playwright)
- ✅ Segurança avançada
- ✅ Performance otimizada
- ✅ Acessibilidade WCAG AA
- ✅ CI/CD completo

## 📋 Funcionalidades

- 🔐 Autenticação completa (Login, Signup, Recuperação)
- 💰 Gestão de Transações (CRUD completo)
- 💳 Gestão de Cartões (Crédito e Débito)
- 📊 Dashboard com KPIs e Gráficos
- 📈 Insights Financeiros Inteligentes
- 📑 Orçamentos Mensais
- 📤 Exportação de Dados (PDF, Excel)
- ⚙️ Configurações Personalizadas

## 🛠️ Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **UI Components:** Radix UI
- **Backend:** Supabase (Auth + Database)
- **State Management:** Zustand
- **Charts:** Recharts
- **Testing:** Playwright
- **CI/CD:** GitHub Actions + Vercel

## 📦 Instalação

```bash
# Clonar repositório
git clone <repo-url>
cd projeto-financeiro-CURSOR

# Instalar dependências
npm install

# Instalar browsers do Playwright (primeira vez)
npm run test:install

# Configurar variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com suas credenciais do Supabase
```

## 🚀 Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Abrir http://localhost:3000
```

## 🧪 Testes

```bash
# Executar todos os testes
npm run test

# Testes com UI interativa
npm run test:ui

# Testes específicos
npm run test:auth
npm run test:transactions
npm run test:a11y
```

## 🏗️ Build

```bash
# Build para produção
npm run build

# Iniciar servidor de produção
npm run start
```

## 🔒 Segurança

- ✅ Rate Limiting (5 tentativas login / 15 min)
- ✅ Validação dupla (Frontend + Backend)
- ✅ Políticas de senha complexa
- ✅ Proteção XSS/SQL Injection
- ✅ Security Headers completos

## ⚡ Performance

- ✅ Core Web Vitals monitorados
- ✅ Otimização de imagens (AVIF/WebP)
- ✅ Code splitting automático
- ✅ Caching estratégico

## ♿ Acessibilidade

- ✅ WCAG AA compliant
- ✅ Navegação por teclado
- ✅ ARIA labels completos
- ✅ Contraste adequado

## 📚 Documentação

- [Implementações Completas](./IMPLEMENTACOES_COMPLETAS.md)
- [Guia de Implementações](./GUIA_IMPLEMENTACOES.md)
- [Guia Rápido](./README_IMPLEMENTACOES.md)
- [Relatório de Testes](./testsprite_tests/RELATORIO_COMPLETO_TESTES_FUNCIONAIS.md)

## 🔧 Scripts Disponíveis

```bash
npm run dev              # Servidor de desenvolvimento
npm run build            # Build para produção
npm run start           # Servidor de produção
npm run lint             # Verificar código
npm run lint:fix         # Corrigir automaticamente
npm run type-check       # Verificar tipos TypeScript
npm run test             # Executar testes E2E
npm run test:ui          # UI interativa de testes
npm run format           # Formatar código
npm run generate:types   # Gerar tipos Supabase
```

## 🌍 Ambientes

O sistema suporta 3 ambientes:
- **Development:** Debug habilitado, logs detalhados
- **Staging:** Analytics habilitado, validações completas
- **Production:** Máxima segurança, otimizações ativas

## 📊 Cobertura de Testes

- **E2E:** 80%+ cobertura
- **Suites:** 5 suites completas
- **CI/CD:** Pipeline automatizado

## 🎯 Próximos Passos

1. ✅ Configurar secrets no GitHub/Vercel
2. ✅ Executar testes completos
3. ✅ Deploy em staging
4. ✅ Deploy em produção

## 📝 Licença

Este projeto é privado.

---

**Desenvolvido com ❤️ usando Next.js e Supabase**
