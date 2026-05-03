-- ================================================================
-- MIGRATION 003: Lifecycle Tracking de Clientes
-- Data: 2026-04-16
-- Depende de: 001_multi_tenant_setup.sql
-- Propósito: Suporte ao sistema de engajamento omnichannel
--   - last_seen_at: rastreia último acesso para detectar inativos
--   - lifecycle_notified: evita spam de alertas (registra última notificação por tipo)
-- ================================================================

BEGIN;

-- ================================================================
-- FASE 1 — Adicionar colunas de lifecycle em sismei.profiles
-- ================================================================

-- Último acesso registrado pelo app (atualizado em cada /api/me/role)
ALTER TABLE sismei.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Histórico de notificações lifecycle para evitar reenvio
-- Estrutura: { "plano_expirando": "2026-04-10", "plano_expirado_d0": "2026-04-12", ... }
ALTER TABLE sismei.profiles
  ADD COLUMN IF NOT EXISTS lifecycle_notified JSONB NOT NULL DEFAULT '{}';

-- ================================================================
-- FASE 2 — Índices para queries de lifecycle (executadas diariamente)
-- ================================================================

-- Query A: Planos expirando em 5 dias (assinantes pagos)
CREATE INDEX IF NOT EXISTS idx_sismei_profiles_expires_plan
  ON sismei.profiles(subscription_expires_at, subscription_plan)
  WHERE status = 'active' AND subscription_plan != 'free';

-- Query D: Usuários inativos há 7+ dias (só assinantes)
CREATE INDEX IF NOT EXISTS idx_sismei_profiles_last_seen
  ON sismei.profiles(last_seen_at)
  WHERE subscription_plan != 'free';

-- ================================================================
-- FASE 3 — Verificação
-- ================================================================
DO $$
DECLARE
  v_col_last_seen   boolean;
  v_col_notified    boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sismei' AND table_name = 'profiles'
      AND column_name = 'last_seen_at'
  ) INTO v_col_last_seen;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sismei' AND table_name = 'profiles'
      AND column_name = 'lifecycle_notified'
  ) INTO v_col_notified;

  RAISE NOTICE '╔════════════════════════════════════════╗';
  RAISE NOTICE '║  MIGRATION 003 — Lifecycle Tracking   ║';
  RAISE NOTICE '╠════════════════════════════════════════╣';
  RAISE NOTICE '║  last_seen_at       : %                ║', CASE WHEN v_col_last_seen  THEN 'OK  ' ELSE 'FAIL' END;
  RAISE NOTICE '║  lifecycle_notified : %                ║', CASE WHEN v_col_notified   THEN 'OK  ' ELSE 'FAIL' END;
  RAISE NOTICE '╚════════════════════════════════════════╝';
END $$;

COMMIT;
