-- ================================================================
-- MIGRATION 004: Criar transactions e categories em sismei
-- Data: 2026-04-25
-- Contexto: transactions nunca foi criada, categories nunca existiu
-- ================================================================

BEGIN;

-- ================================================================
-- PARTE 1 — Criar sismei.transactions (não existia em lugar algum)
-- ================================================================

CREATE TABLE IF NOT EXISTS sismei.transactions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID REFERENCES sismei.tenants(id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN ('revenue', 'expense')),
  description TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'Outros',
  value       NUMERIC(10, 2) NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  status      TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sismei_transactions_user_date ON sismei.transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sismei_transactions_type      ON sismei.transactions (type);
CREATE INDEX IF NOT EXISTS idx_sismei_transactions_tenant    ON sismei.transactions (tenant_id);

-- ================================================================
-- PARTE 2 — RLS para sismei.transactions
-- ================================================================

-- Remover políticas antigas (criadas em public)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
    WHERE schemaname = 'sismei' AND tablename = 'transactions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON sismei.transactions', r.policyname);
  END LOOP;
END $$;

ALTER TABLE sismei.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all" ON sismei.transactions FOR ALL TO authenticated
  USING (sismei.is_admin()) WITH CHECK (sismei.is_admin());

CREATE POLICY "user_own" ON sismei.transactions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ================================================================
-- PARTE 3 — Trigger: auto-set tenant_id em transactions
-- ================================================================

CREATE OR REPLACE FUNCTION sismei.auto_set_transaction_tenant()
RETURNS trigger AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT id INTO NEW.tenant_id
    FROM sismei.tenants
    WHERE owner_id = NEW.user_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS before_transaction_insert_set_tenant ON sismei.transactions;
CREATE TRIGGER before_transaction_insert_set_tenant
  BEFORE INSERT ON sismei.transactions
  FOR EACH ROW EXECUTE FUNCTION sismei.auto_set_transaction_tenant();

-- ================================================================
-- PARTE 4 — Criar sismei.categories
-- ================================================================

CREATE TABLE IF NOT EXISTS sismei.categories (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  uuid        REFERENCES sismei.tenants(id) ON DELETE SET NULL,
  name       text        NOT NULL,
  type       text        NOT NULL CHECK (type IN ('revenue', 'expense')),
  color      text        NOT NULL DEFAULT '#7C3AED',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sismei.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all" ON sismei.categories FOR ALL TO authenticated
  USING (sismei.is_admin()) WITH CHECK (sismei.is_admin());

CREATE POLICY "user_own" ON sismei.categories FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger: auto-set tenant_id em categories
CREATE OR REPLACE FUNCTION sismei.auto_set_category_tenant()
RETURNS trigger AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT id INTO NEW.tenant_id
    FROM sismei.tenants
    WHERE owner_id = NEW.user_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS before_category_insert_set_tenant ON sismei.categories;
CREATE TRIGGER before_category_insert_set_tenant
  BEFORE INSERT ON sismei.categories
  FOR EACH ROW EXECUTE FUNCTION sismei.auto_set_category_tenant();

-- Índices
CREATE INDEX IF NOT EXISTS idx_sismei_categories_user ON sismei.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_sismei_categories_tenant ON sismei.categories(tenant_id);

-- ================================================================
-- PARTE 5 — Corrigir das_payments: trigger para auto-set tenant_id
-- ================================================================

-- O insert em das/page.tsx não envia tenant_id — o trigger resolve sem mudar o código
CREATE OR REPLACE FUNCTION sismei.auto_set_das_tenant()
RETURNS trigger AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT id INTO NEW.tenant_id
    FROM sismei.tenants
    WHERE owner_id = NEW.user_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS before_das_insert_set_tenant ON sismei.das_payments;
CREATE TRIGGER before_das_insert_set_tenant
  BEFORE INSERT ON sismei.das_payments
  FOR EACH ROW EXECUTE FUNCTION sismei.auto_set_das_tenant();

-- ================================================================
-- PARTE 6 — Verificação
-- ================================================================

DO $$
DECLARE
  v_trans   boolean;
  v_cats    boolean;
  v_das_trg boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sismei' AND table_name = 'transactions'
  ) INTO v_trans;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sismei' AND table_name = 'categories'
  ) INTO v_cats;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'sismei' AND event_object_table = 'das_payments'
      AND trigger_name = 'before_das_insert_set_tenant'
  ) INTO v_das_trg;

  RAISE NOTICE '╔══════════════════════════════════════╗';
  RAISE NOTICE '║  MIGRATION 004 — VERIFICAÇÃO         ║';
  RAISE NOTICE '╠══════════════════════════════════════╣';
  RAISE NOTICE '║  sismei.transactions existe : %      ║', v_trans;
  RAISE NOTICE '║  sismei.categories existe   : %      ║', v_cats;
  RAISE NOTICE '║  trigger das_payments       : %      ║', v_das_trg;
  RAISE NOTICE '╚══════════════════════════════════════╝';
END $$;

COMMIT;
