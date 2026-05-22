-- Schema inicial: Projeto Finanças Pessoais
-- Projeto: bgeevosysoxjzinqmdnp

-- Extensões
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Perfis (espelha auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  dashboard_data JSONB DEFAULT '{}'::jsonb NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  balance NUMERIC(14, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')),
  color TEXT,
  icon TEXT,
  is_system BOOLEAN DEFAULT false,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  brand TEXT,
  last_digits TEXT,
  "limit" NUMERIC(14, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  amount NUMERIC(14, 2) NOT NULL,
  description TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  payment_method TEXT NOT NULL DEFAULT 'pix',
  expense_nature TEXT,
  notes TEXT,
  installment_number INTEGER,
  total_installments INTEGER,
  is_recurring BOOLEAN DEFAULT false,
  recurring_type TEXT,
  deleted_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  month DATE NOT NULL,
  limit_amount NUMERIC(14, 2) NOT NULL,
  alert_percentage NUMERIC(5, 2),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.recurring_incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  expense_nature TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_categories_user_id ON public.categories(user_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX idx_budgets_user_month ON public.budgets(user_id, month);
CREATE INDEX idx_cards_user_id ON public.cards(user_id);
CREATE INDEX idx_insights_user_id ON public.insights(user_id);

-- Trigger: novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, full_name, is_admin, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_preferences (user_id, dashboard_data)
  VALUES (NEW.id, '{}'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.accounts (user_id, balance)
  SELECT NEW.id, 0
  WHERE NOT EXISTS (SELECT 1 FROM public.accounts WHERE user_id = NEW.id);

  INSERT INTO public.categories (name, type, user_id, is_system) VALUES
    ('Salário', 'income', NEW.id, false),
    ('Freelance', 'income', NEW.id, false),
    ('Investimentos', 'income', NEW.id, false),
    ('Outras receitas', 'income', NEW.id, false),
    ('Alimentação', 'expense', NEW.id, false),
    ('Transporte', 'expense', NEW.id, false),
    ('Moradia', 'expense', NEW.id, false),
    ('Saúde', 'expense', NEW.id, false),
    ('Educação', 'expense', NEW.id, false),
    ('Lazer', 'expense', NEW.id, false),
    ('Compras', 'expense', NEW.id, false),
    ('Outras despesas', 'expense', NEW.id, false);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER cards_updated_at BEFORE UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER budgets_updated_at BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER recurring_incomes_updated_at BEFORE UPDATE ON public.recurring_incomes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER recurring_expenses_updated_at BEFORE UPDATE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY users_select_own ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update_own ON public.users FOR UPDATE USING (auth.uid() = id);

-- user_preferences
CREATE POLICY user_preferences_select_own ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_preferences_insert_own ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_preferences_update_own ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- accounts
CREATE POLICY accounts_all_own ON public.accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- categories
CREATE POLICY categories_select_own ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY categories_insert_own ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY categories_update_own ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY categories_delete_own ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- cards
CREATE POLICY cards_all_own ON public.cards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- transactions
CREATE POLICY transactions_select_own ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY transactions_insert_own ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY transactions_update_own ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY transactions_delete_own ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- budgets
CREATE POLICY budgets_all_own ON public.budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- insights
CREATE POLICY insights_all_own ON public.insights FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- recurring_incomes
CREATE POLICY recurring_incomes_all_own ON public.recurring_incomes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- recurring_expenses
CREATE POLICY recurring_expenses_all_own ON public.recurring_expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
