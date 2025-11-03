# 📥 Guia de Importação de Transações Parceladas

## 📋 Visão Geral

O sistema de importação de transações agora suporta **compras parceladas** de forma **simplificada e automática**! 

✅ **NOVO:** Informe apenas o valor total e o número de parcelas, e o sistema cria automaticamente todas as parcelas mês a mês!

## 🔧 Como Funciona

### Campos do Modelo de Importação

O modelo de importação inclui os seguintes campos:

| Campo | Obrigatório | Descrição | Exemplo |
|-------|-------------|-----------|---------|
| `data` | ✅ Sim | Data da transação (data da primeira parcela se parcelado) | `2025-01-25` |
| `descricao` | ✅ Sim | Descrição da despesa | `Notebook` |
| `valor` | ✅ Sim | **Valor total** (se gerando todas as parcelas) ou **valor da parcela** (se parcela específica) | `3000.00` ou `300.00` |
| `metodo_pagamento` | ⚠️ Opcional | Método: `credit`, `debit`, `cash`, `pix`, `boleto` | `credit` |
| `categoria` | ⚠️ Opcional | Nome da categoria (será criada se não existir) | `Eletrônicos` |
| `cartao` | ⚠️ Opcional | Nome do cartão (apenas para crédito/débito) | `Cartão Nubank` |
| `natureza_despesa` | ⚠️ Opcional | `fixed`, `variable` ou `installment` | `installment` |
| **`total_parcelas`** | ⚠️ **Novo** | **Número total de parcelas** (deixe `parcela_atual` vazio para criar todas automaticamente) | `10` |
| **`parcela_atual`** | ⚠️ **Novo** | **Deixe vazio** para criar todas as parcelas automaticamente, ou informe número específico (1, 2, 3...) para criar apenas aquela parcela | `1` ou deixe vazio |
| `observacoes` | ❌ Não | Observações adicionais | `Compra parcelada em 10x` |

## 📝 Exemplos de Uso

### Exemplo 1: Transação Única (sem parcelamento)

```csv
data,descricao,valor,metodo_pagamento,categoria,cartao,natureza_despesa,total_parcelas,parcela_atual,observacoes
2025-01-15,Supermercado,150.50,credit,Alimentação,,variable,1,1,Compras do mês
```

**Resultado:** Uma única transação de R$ 150,50 será criada.

### Exemplo 2: 🎯 Compra Parcelada (10x) - CRIAR TODAS AS PARCELAS AUTOMATICAMENTE (RECOMENDADO)

```csv
data,descricao,valor,metodo_pagamento,categoria,cartao,natureza_despesa,total_parcelas,parcela_atual,observacoes
2025-01-25,Notebook Dell,3000.00,credit,Eletrônicos,Cartão Nubank,installment,10,1,Compra parcelada em 10x sem juros
```

**✅ Resultado:** O sistema criará **automaticamente 10 transações**:
- Descrição: `Notebook Dell (1/10)`, `Notebook Dell (2/10)`, ..., `Notebook Dell (10/10)`
- Valor de cada parcela: R$ 300,00 (3000 ÷ 10)
- Datas: 25/01/2025, 25/02/2025, 25/03/2025, ..., 25/10/2025 (mês a mês)
- Natureza: `installment` (automática)
- **Uma única linha cria 10 transações!** 🚀

**💡 Dica:** Você também pode deixar `parcela_atual` vazio:

```csv
data,descricao,valor,metodo_pagamento,categoria,cartao,natureza_despesa,total_parcelas,parcela_atual,observacoes
2025-01-25,Notebook Dell,3000.00,credit,Eletrônicos,Cartão Nubank,installment,10,,Compra parcelada em 10x sem juros
```

### Exemplo 3: Compra Parcelada (5x) - Criar Todas Automaticamente

```csv
data,descricao,valor,metodo_pagamento,categoria,cartao,natureza_despesa,total_parcelas,parcela_atual,observacoes
2025-03-15,TV 55 polegadas,2500.00,credit,Eletrônicos,Cartão Itau,installment,5,,Compra parcelada em 5x
```

**✅ Resultado:** O sistema criará **automaticamente 5 transações** de R$ 500,00 cada (2500 ÷ 5):
- `TV 55 polegadas (1/5)` em 15/03/2025
- `TV 55 polegadas (2/5)` em 15/04/2025
- `TV 55 polegadas (3/5)` em 15/05/2025
- `TV 55 polegadas (4/5)` em 15/06/2025
- `TV 55 polegadas (5/5)` em 15/07/2025

### Exemplo 4: Criar Apenas Uma Parcela Específica (Opcional)

Se você quiser importar apenas uma parcela específica (ex: já pagou algumas parcelas):

```csv
data,descricao,valor,metodo_pagamento,categoria,cartao,natureza_despesa,total_parcelas,parcela_atual,observacoes
2025-02-25,Notebook Dell,300.00,credit,Eletrônicos,Cartão Nubank,installment,10,2,Já paguei a primeira parcela, importando a segunda
```

**Resultado:** Apenas uma transação será criada:
- Descrição: `Notebook Dell (2/10)`
- Valor: R$ 300,00
- Data: 25/02/2025
- Natureza: `installment`
- Parcela: 2 de 10

## ⚠️ Regras e Validações

### Regras de Parcelamento

1. **Geração Automática de Parcelas (RECOMENDADO):**
   - Informe `total_parcelas` (ex: `10`)
   - Deixe `parcela_atual` vazio OU informe `1`
   - Informe o **valor total** da compra
   - O sistema criará automaticamente todas as parcelas, calculando:
     - Valor de cada parcela = valor total ÷ total de parcelas
     - Data de cada parcela = data inicial + N meses (mês a mês)
   
2. **Criar Parcela Específica (Opcional):**
   - Informe `total_parcelas` e `parcela_atual` (ex: `10` e `3`)
   - Informe o **valor da parcela específica**
   - Apenas aquela parcela será criada

3. **Transação Única:**
   - Deixe ambos os campos vazios ou ambos como `1`
   - Será tratado como transação única normal

### Valores Válidos
- `total_parcelas`: Entre 1 e 999
- `parcela_atual`: Entre 1 e 999 (quando especificado)
- `parcela_atual` não pode ser maior que `total_parcelas`

**Natureza da despesa:**
- Se `total_parcelas` > 1, a natureza será automaticamente definida como `installment`
- Se você especificar uma natureza diferente, ela será ignorada e alterada para `installment`

**Valor da transação:**
- **Se gerando todas as parcelas automaticamente:** Informe o **valor total** da compra. O sistema calculará o valor de cada parcela automaticamente.
- **Se criando parcela específica:** Informe o **valor daquela parcela específica**.

### Tratamento de Erros

O sistema validará e reportará erros para:
- ❌ Valores de parcelas inválidos (fora do range 1-999)
- ❌ Parcela atual maior que total de parcelas
- ❌ Formato de data inválido
- ❌ Categoria não encontrada e não pode ser criada

## 💡 Dicas e Boas Práticas

### 1. Estrutura Recomendada para Parcelas (Geração Automática)

Para facilitar o controle, recomenda-se:

- **Descrição clara:** Use uma descrição descritiva (ex: "Notebook Dell Inspiron 15")
- **Valor total:** Informe o valor total da compra - o sistema calcula cada parcela automaticamente
- **Data da primeira parcela:** Use a data em que a primeira parcela será paga - o sistema calcula as demais mês a mês
- **Total de parcelas:** Informe o número total de parcelas
- **Parcela atual:** Deixe vazio ou coloque `1` para criar todas automaticamente
- **Observações:** Adicione informações relevantes que se aplicam a todas as parcelas (ex: "10x sem juros")

### 2. Exemplo Completo: Notebook R$ 3.000 em 10x (SIMPLIFICADO!)

**✅ MÉTODO RECOMENDADO - Uma única linha cria todas as parcelas:**

```csv
data,descricao,valor,metodo_pagamento,categoria,cartao,natureza_despesa,total_parcelas,parcela_atual,observacoes
2025-01-25,Notebook Dell Inspiron 15,3000.00,credit,Eletrônicos,Cartão Nubank,installment,10,1,10x sem juros
```

**Resultado:** 10 transações criadas automaticamente:
- Parcela 1: R$ 300,00 em 25/01/2025
- Parcela 2: R$ 300,00 em 25/02/2025
- Parcela 3: R$ 300,00 em 25/03/2025
- ...
- Parcela 10: R$ 300,00 em 25/10/2025

**✅ Uma linha = 10 transações!** 🚀

**💡 Dica Extra:** Você também pode deixar `parcela_atual` vazio:

```csv
data,descricao,valor,metodo_pagamento,categoria,cartao,natureza_despesa,total_parcelas,parcela_atual,observacoes
2025-01-25,Notebook Dell Inspiron 15,3000.00,credit,Eletrônicos,Cartão Nubank,installment,10,,10x sem juros
```

Mesmo resultado - 10 transações criadas automaticamente!

## 🔍 Verificação Após Importação

Após importar, você pode verificar se as transações parceladas foram criadas corretamente:

1. Acesse **Transações**
2. Procure pela descrição que você usou
3. Verifique se aparece `(X/Y)` na descrição, indicando parcela X de Y
4. Confirme que o valor está correto
5. Verifique que a natureza está como `installment`

## ❓ Perguntas Frequentes

### P: Preciso importar todas as parcelas de uma vez?

**R:** Não! Isso agora é automático! 🎉
- **Opção 1 (Recomendada):** Informe apenas o valor total e o número de parcelas. O sistema cria todas automaticamente.
- **Opção 2:** Importe as parcelas conforme forem sendo pagas, informando `parcela_atual` específico.

### P: E se eu esquecer de preencher os campos de parcelamento?

**R:** Se você deixar os campos `total_parcelas` e `parcela_atual` vazios (ou ambos como `1`), a transação será criada como uma transação única normal, sem parcelamento.

### P: O valor deve ser o total ou o valor da parcela?

**R:** 
- **Se você deixar `parcela_atual` vazio ou colocar `1`:** Informe o **valor total** da compra. O sistema calculará automaticamente o valor de cada parcela (valor total ÷ número de parcelas).
- **Se você informar `parcela_atual` diferente de 1:** Informe o **valor daquela parcela específica**.

**Exemplo:** Notebook R$ 3.000 em 10x:
- Para criar todas: `valor=3000.00, total_parcelas=10, parcela_atual=` (vazio)
- Para criar apenas a 3ª parcela: `valor=300.00, total_parcelas=10, parcela_atual=3`

### P: Posso usar valores diferentes para cada parcela?

**R:** Sim! O sistema aceita valores diferentes para cada parcela. Isso é útil para parcelas com entrada diferente ou parcelas com valores ajustados.

## 📚 Recursos Adicionais

- **Modelo de Importação:** Baixe o modelo XLSX ou CSV pela interface de importação
- **Validação Automática:** O sistema valida todos os dados antes de importar
- **Relatórios de Erro:** Se houver erros, o sistema mostra quais linhas falharam e por quê

---

**Última atualização:** 27 de Janeiro de 2025  
**Versão:** 1.0

