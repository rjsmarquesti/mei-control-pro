-- ── Tabela: transactions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('revenue', 'expense')),
  description TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'Outros',
  value       NUMERIC(10, 2) NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  status      TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabela: das_payments ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS das_payments (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  value      NUMERIC(10, 2) NOT NULL,
  due_date   DATE NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS (Row Level Security) ──────────────────────────────────────────────────
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE das_payments ENABLE ROW LEVEL SECURITY;

-- Cada usuário só vê seus próprios dados
CREATE POLICY "transactions: user owns data"
  ON transactions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "das_payments: user owns data"
  ON das_payments FOR ALL
  USING (auth.uid() = user_id);

-- ── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);
CREATE INDEX IF NOT EXISTS idx_das_payments_user ON das_payments (user_id, due_date);

-- ── Dados de exemplo (opcional) ───────────────────────────────────────────────
-- Substitua o UUID abaixo pelo seu user_id real (Supabase → Authentication → Users)
-- INSERT INTO transactions (user_id, type, description, category, value, date, status) VALUES
--   ('00000000-0000-0000-0000-000000000000', 'revenue', 'Cliente X — Dev Web',    'Serviços',     500.00,  '2025-04-06', 'completed'),
--   ('00000000-0000-0000-0000-000000000000', 'expense', 'Plano de Internet',       'Infraestrutura', 120.00, '2025-04-05', 'completed'),
--   ('00000000-0000-0000-0000-000000000000', 'revenue', 'Consultoria Serviço Y',   'Consultoria',  800.00,  '2025-04-04', 'completed'),
--   ('00000000-0000-0000-0000-000000000000', 'revenue', 'Cliente Z — Landing Page','Serviços',    1250.00,  '2025-04-02', 'completed');

-- INSERT INTO das_payments (user_id, value, due_date, status) VALUES
--   ('00000000-0000-0000-0000-000000000000', 70.60, '2025-04-20', 'pending');
