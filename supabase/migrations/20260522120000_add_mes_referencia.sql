-- Mês de competência (desvinculado da data cronológica da compra)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS mes_referencia TEXT;

-- Backfill: competência = mês da data da transação
UPDATE public.transactions
SET mes_referencia = TO_CHAR(transaction_date::date, 'YYYY-MM')
WHERE mes_referencia IS NULL;

ALTER TABLE public.transactions
  ALTER COLUMN mes_referencia SET NOT NULL;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_mes_referencia_format
  CHECK (mes_referencia ~ '^\d{4}-(0[1-9]|1[0-2])$');

CREATE INDEX IF NOT EXISTS idx_transactions_mes_referencia
  ON public.transactions(user_id, mes_referencia);

COMMENT ON COLUMN public.transactions.mes_referencia IS
  'Mês de competência da despesa/receita (YYYY-MM). Usado no Total Gasto do dashboard.';
