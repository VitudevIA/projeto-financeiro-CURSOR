# 📋 Backlog de Evolução - REFERENCIASAPP

Este arquivo serve como repositório central de ideias, refatorações e melhorias contínuas para o aplicativo de finanças pessoais.

---

## 🔁 Módulo: Transações

### 1. Otimização de Busca Textual (Performance)
* **Status:** ⏳ Pendente
* **Descrição:** Atualmente, a busca por texto (`searchTerm`) na listagem é feita via filtro de memória no Client-side (`.filter()`)[cite: 2]. À medida que o banco crescer, isso pesará no navegador.
* **Solução:** Passar a busca para o Server-side dentro do `transactions-store.ts`, utilizando o operador `.ilike()` do Supabase.

### 2. Ordenação por Competência
* **Status:** ⏳ Pendente
* **Descrição:** A tabela de transações lista os itens ordenados estritamente pela data cronológica (`transaction_date`)[cite: 2].
* **Solução:** Alterar a ordenação primária para o `mes_referencia` e a secundária para a `transaction_date`[cite: 2], garantindo que a visualização reflita a linha do tempo exata do orçamento.

---

## 📊 Módulo: Dashboard

*(As próximas sugestões de melhorias de regras de negócio, gráficos e KPIs serão inseridas aqui conforme avançarmos no desenvolvimento).*

---

## 💳 Módulo: Cartões

---

## 💳 Módulo: Cartões & Dashboard (Cálculo de Competência por Fechamento)
* **Status:** ✅ Concluído com Sucesso (Junho 2026)
* **O que foi feito:** 1. Adicionados os campos obrigatórios `closing_day` e `due_day` na tabela/store de cartões e na interface de cadastro/edição.
  2. Criada a função utilitária `effectiveMesReferencia` para calcular dinamicamente o mês de competência das despesas no crédito usando o dia de fechamento do cartão.
  3. Refatorado o `dashboard-store.ts` para que todos os resumos, projeções e gráficos de pizza/linhas consumam a competência real baseada no fechamento em um range flexível de ±1 mês.