-- ================================================================
-- MIGRATION 011: Consentimento LGPD + Auditoria Imutável
-- Data: 2026-06-02
--
-- Cria:
--   sismei.consents       — registros de aceite dos termos (LGPD art. 7 e 8)
--   sismei.audit_logs     — trilha de auditoria imutável
--   sismei.lgpd_requests  — solicitações de portabilidade e exclusão (LGPD art. 18)
--   triggers de auditoria nas transactions
--   trigger de imutabilidade nos audit_logs
-- ================================================================

BEGIN;

-- ── 1. CONSENTIMENTOS LGPD ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sismei.consents (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid        NOT NULL,
  terms_version    text        NOT NULL,
  privacy_version  text        NOT NULL,
  ip               text,
  user_agent       text,
  accepted_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sismei.consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consents_insert_own" ON sismei.consents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "consents_select_own" ON sismei.consents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Índice para lookup por usuário
CREATE INDEX IF NOT EXISTS idx_sismei_consents_user
  ON sismei.consents(user_id, accepted_at DESC);

-- ── 2. AUDIT LOGS IMUTÁVEIS ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sismei.audit_logs (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        NOT NULL,
  action       text        NOT NULL,
  entity_type  text,
  entity_id    text,
  before_data  jsonb,
  after_data   jsonb,
  ip           text,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sismei.audit_logs ENABLE ROW LEVEL SECURITY;

-- Usuário pode ver apenas os próprios logs
CREATE POLICY "audit_select_own" ON sismei.audit_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Nenhuma policy de DELETE ou UPDATE → authenticated não pode apagar nem alterar
-- Service role bypassa RLS, mas o trigger abaixo bloqueia até service role

-- Trigger: impede DELETE e UPDATE mesmo por service role
CREATE OR REPLACE FUNCTION sismei.protect_audit_logs()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs são imutáveis: operação % não permitida.', TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_audit_logs ON sismei.audit_logs;
CREATE TRIGGER trg_protect_audit_logs
  BEFORE DELETE OR UPDATE ON sismei.audit_logs
  FOR EACH ROW EXECUTE FUNCTION sismei.protect_audit_logs();

-- Índices para consultas de auditoria
CREATE INDEX IF NOT EXISTS idx_sismei_audit_logs_user_date
  ON sismei.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sismei_audit_logs_action
  ON sismei.audit_logs(action, created_at DESC);

-- ── 3. TRIGGER DE AUDITORIA NAS TRANSACTIONS ──────────────────────────────────
-- Transactions são criadas/editadas/deletadas via browser (Supabase direto).
-- O trigger garante rastreabilidade independente da aplicação.

CREATE OR REPLACE FUNCTION sismei.audit_transaction_changes()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO sismei.audit_logs (user_id, action, entity_type, entity_id, after_data)
    VALUES (
      NEW.user_id,
      'create_transaction',
      'transaction',
      NEW.id::text,
      to_jsonb(NEW) - 'user_id'
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO sismei.audit_logs (user_id, action, entity_type, entity_id, before_data, after_data)
    VALUES (
      OLD.user_id,
      'update_transaction',
      'transaction',
      OLD.id::text,
      to_jsonb(OLD) - 'user_id',
      to_jsonb(NEW) - 'user_id'
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO sismei.audit_logs (user_id, action, entity_type, entity_id, before_data)
    VALUES (
      OLD.user_id,
      'delete_transaction',
      'transaction',
      OLD.id::text,
      to_jsonb(OLD) - 'user_id'
    );
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_transactions ON sismei.transactions;
CREATE TRIGGER trg_audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON sismei.transactions
  FOR EACH ROW EXECUTE FUNCTION sismei.audit_transaction_changes();

-- ── 4. SOLICITAÇÕES LGPD (art. 18) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sismei.lgpd_requests (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        NOT NULL,
  type         text        NOT NULL CHECK (type IN ('export', 'deletion')),
  status       text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  notes        text
);

ALTER TABLE sismei.lgpd_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lgpd_insert_own" ON sismei.lgpd_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "lgpd_select_own" ON sismei.lgpd_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_sismei_lgpd_user
  ON sismei.lgpd_requests(user_id, requested_at DESC);

COMMIT;
