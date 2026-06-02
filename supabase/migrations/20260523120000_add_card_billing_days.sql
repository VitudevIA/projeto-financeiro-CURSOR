-- Dias de fechamento e vencimento da fatura (competência de crédito)
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS closing_day INTEGER,
  ADD COLUMN IF NOT EXISTS due_day INTEGER;

UPDATE public.cards
SET
  closing_day = COALESCE(closing_day, 25),
  due_day = COALESCE(due_day, 10)
WHERE closing_day IS NULL OR due_day IS NULL;

ALTER TABLE public.cards
  ALTER COLUMN closing_day SET NOT NULL,
  ALTER COLUMN due_day SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cards_closing_day_range') THEN
    ALTER TABLE public.cards
      ADD CONSTRAINT cards_closing_day_range CHECK (closing_day >= 1 AND closing_day <= 31);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cards_due_day_range') THEN
    ALTER TABLE public.cards
      ADD CONSTRAINT cards_due_day_range CHECK (due_day >= 1 AND due_day <= 31);
  END IF;
END $$;

COMMENT ON COLUMN public.cards.closing_day IS 'Dia do mês em que a fatura fecha (1-31)';
COMMENT ON COLUMN public.cards.due_day IS 'Dia do mês em que a fatura vence (1-31)';
