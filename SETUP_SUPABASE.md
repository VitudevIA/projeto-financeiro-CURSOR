# 🔧 Configuração do Supabase

## ⚠️ Problema Atual

A aplicação não está funcionando porque as variáveis de ambiente do Supabase não estão configuradas.

**Erro:**
```
@supabase/ssr: Your project's URL and API key are required to create a Supabase client!
```

## 📋 Passos para Configuração

### 1. Acessar o Dashboard do Supabase

Acesse: https://supabase.com/dashboard/project/mffeygimsgjliwifouox/settings/api

### 2. Obter as Credenciais

No dashboard, você encontrará:
- **Project URL**: `https://mffeygimsgjliwifouox.supabase.co`
- **Anon/Public Key**: Uma chave longa começando com `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. Criar o Arquivo .env.local

Na raiz do projeto, crie um arquivo chamado `.env.local` com o seguinte conteúdo:

```env
NEXT_PUBLIC_SUPABASE_URL=https://mffeygimsgjliwifouox.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

**Exemplo completo:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://mffeygimsgjliwifouox.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZmV5Z2ltc2dqbGl3aWZvdW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTAwMDAwMDAsImV4cCI6MTg0NzY4MDAwMH0.example-signature
```

### 4. Reiniciar o Servidor

Após criar o arquivo `.env.local`:

```bash
# Pare o servidor (Ctrl+C)
# Reinicie:
npm run dev
```

### 5. Verificar se Funcionou

Acesse: http://localhost:3000

- ✅ Se funcionar: Você verá a página de login
- ❌ Se não funcionar: Verifique se copiou as credenciais corretamente

## 🔐 Segurança

- ⚠️ **NUNCA** commite o arquivo `.env.local` no Git
- ✅ O arquivo `.env.local` já está no `.gitignore`
- ✅ Use apenas a chave "anon/public" (não use a service_role key no frontend)

## 📚 Estrutura do Banco de Dados

Para o sistema funcionar completamente, você precisará das seguintes tabelas no Supabase:

### Tabelas Principais:
- `profiles` - Perfis de usuário
- `cards` - Cartões de crédito/débito
- `categories` - Categorias de transações
- `transactions` - Transações financeiras
- `budgets` - Orçamentos mensais
- `insights` - Insights financeiros
- `user_settings` - Configurações do usuário

### Relacionamentos:
- `users (auth.users)` → `profiles` (1:N)
- `users` → `cards` (1:N)
- `users` → `transactions` (1:N)
- `cards` → `transactions` (1:N)
- `categories` → `transactions` (1:N)
- `users` → `budgets` (1:N)

## 🔄 Próximos Passos Após Configuração

1. ✅ Configurar variáveis de ambiente
2. ✅ Criar as tabelas no Supabase
3. ✅ Configurar RLS (Row Level Security) policies
4. ✅ Testar fluxo de autenticação
5. ✅ Testar CRUD de transações

## ❓ Precisa de Ajuda?

Se você não tem acesso ao projeto Supabase ou perdeu as credenciais:

1. Faça login em: https://supabase.com
2. Acesse o projeto: https://supabase.com/dashboard/project/mffeygimsgjliwifouox
3. Vá em Settings → API
4. Copie as credenciais necessárias


