# 🔍 Diagnóstico do Erro 401 no Login

## 📋 Resumo do Problema

Ao tentar fazer login usando `http://localhost:3000`, você está recebendo:

```
POST https://mffeygimsgjliwifouox.supabase.co/auth/v1/token?grant_type=password 401 (Unauthorized)
```

## ✅ O que foi Verificado

1. **Arquivo `.env.local` criado** ✅
   - URL do Supabase configurada corretamente
   - Chave anônima configurada corretamente

2. **Banco de Dados** ✅
   - Tabela `users` existe e tem RLS configurado
   - Todos os usuários têm perfis na tabela `public.users`
   - Políticas RLS estão corretas

3. **Tratamento de Erros** ✅
   - Melhorado no código para exibir mensagens mais específicas

## 🔍 Possíveis Causas do Erro 401

### 1. "Invalid API key" - Chave Anônima Incorreta 🔴 (RESOLVIDO)

**Erro específico encontrado:**
```
{message: 'Invalid API key', status: 401, name: 'AuthApiError'}
```

**Causa:** A chave anônima (anon key) no arquivo `.env.local` estava incorreta ou desatualizada.

**Solução aplicada:**
✅ Arquivo `.env.local` atualizado com a chave correta obtida via MCP do Supabase
✅ Validação de variáveis de ambiente adicionada no código
✅ Cliente Supabase melhorado para detectar mudanças nas variáveis

**Importante:** Após atualizar o `.env.local`, **sempre reinicie o servidor de desenvolvimento**:
```bash
# Pare o servidor (Ctrl+C)
npm run dev
```

### 2. Credenciais Incorretas 🔴

O erro 401 também pode indicar que o **email ou senha estão incorretos**.

**Soluções:**

#### Opção A: Verificar Credenciais
Verifique se você está usando:
- O email correto (case-sensitive)
- A senha correta (sem espaços extras)

#### Opção B: Verificar Usuários Existentes
Execute no SQL Editor do Supabase:

```sql
-- Ver usuários existentes e seus emails confirmados
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC;
```

**Usuários existentes no sistema:**
- `testsprite@teste.com` ✅ (confirmado em 31/10)
- `victorfernandesexata@gmail.com` ✅ (confirmado em 28/10)
- `victormatheuss669@gmail.com` ✅ (confirmado em 28/10)
- `anaclar2505@gmail.com` ✅ (confirmado em 29/10)
- `victorfernandesdevia@gmail.com` ✅ (confirmado em 27/10)

#### Opção C: Resetar Senha
Se você não lembra a senha, use a opção "Esqueceu sua senha?" na tela de login.

#### Opção D: Criar Novo Usuário
Acesse `/signup` e crie uma nova conta.

### 2. Email Não Confirmado (Já Verificado) ✅

Todos os usuários no sistema têm email confirmado, então esta não é a causa.

### 3. Problema com a Configuração do Supabase Auth

**Verificar configuração de Email Auth:**

1. Acesse: https://supabase.com/dashboard/project/mffeygimsgjliwifouox/auth/providers
2. Verifique se "Email" está habilitado
3. Para desenvolvimento, você pode desabilitar "Confirm email" temporariamente

### 4. Problema com Variáveis de Ambiente

**Verificar `.env.local`:**

1. Certifique-se que o arquivo existe na raiz do projeto
2. Verifique se as variáveis estão corretas:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://mffeygimsgjliwifouox.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. **Reinicie o servidor** após criar/modificar o `.env.local`:
   ```bash
   # Pare o servidor (Ctrl+C)
   npm run dev
   ```

## 🛠️ Como Diagnosticar

### 1. Verificar Console do Navegador

Abra o DevTools (F12) e verifique:
- Aba **Console** - mensagens de erro detalhadas
- Aba **Network** - requisição para `/auth/v1/token` - ver o response body

### 2. Testar Login com Credenciais Conhecidas

Se você tiver acesso ao Supabase Dashboard, pode:
1. Ir em **Authentication → Users**
2. Selecionar um usuário
3. Clicar em **"Reset Password"** para definir uma nova senha conhecida
4. Tentar fazer login com essas credenciais

### 3. Verificar Logs do Supabase

No Supabase Dashboard:
1. **Logs → Auth**
2. Procurar por tentativas de login recentes
3. Ver mensagens de erro detalhadas

## ✅ Melhorias Aplicadas

1. **Tratamento de Erros Melhorado**
   - Mensagens mais específicas para erro 401
   - Logs detalhados no console para debug
   
2. **Documentação Criada**
   - Este arquivo de diagnóstico
   - Instruções claras de como resolver

## 📝 Próximos Passos Recomendados

1. **Tentar login novamente** com credenciais válidas
2. **Verificar console do navegador** para mensagens mais detalhadas
3. **Se ainda não funcionar:**
   - Criar um novo usuário via `/signup`
   - Ou resetar senha de um usuário existente
   - Ou verificar se há bloqueios no Supabase (rate limiting, etc.)

## 🔗 Links Úteis

- Dashboard do Projeto: https://supabase.com/dashboard/project/mffeygimsgjliwifouox
- Authentication Settings: https://supabase.com/dashboard/project/mffeygimsgjliwifouox/auth/providers
- SQL Editor: https://supabase.com/dashboard/project/mffeygimsgjliwifouox/sql
- Auth Logs: https://supabase.com/dashboard/project/mffeygimsgjliwifouox/logs/auth

