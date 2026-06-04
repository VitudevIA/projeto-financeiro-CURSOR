-- Ordem sequencial das transações na fatura importada (preserva cronologia do PDF)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS import_sequence INTEGER;

CREATE INDEX IF NOT EXISTS idx_transactions_import_sequence
  ON public.transactions (user_id, transaction_date DESC, import_sequence ASC NULLS LAST);
