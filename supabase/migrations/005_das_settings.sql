-- ================================================================
-- MIGRATION 005: system_settings + encargos DAS por tenant
-- Data: 2026-04-25
-- ================================================================

BEGIN;

-- ================================================================
-- PARTE 1 — Tabela de configurações globais (admin)
-- ================================================================

CREATE TABLE IF NOT EXISTS sismei.system_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  label      text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sismei.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all" ON sismei.system_settings FOR ALL TO authenticated
  USING (sismei.is_admin()) WITH CHECK (sismei.is_admin());

CREATE POLICY "user_read" ON sismei.system_settings FOR SELECT TO authenticated
  USING (true);

INSERT INTO sismei.system_settings (key, value, label) VALUES
  ('das_default_value', '70.60', 'Valor padrão do DAS (R$)')
ON CONFLICT (key) DO NOTHING;

-- ================================================================
-- PARTE 2 — Encargos por tenant em sismei.profiles
-- ================================================================

ALTER TABLE sismei.profiles
  ADD COLUMN IF NOT EXISTS das_multa_pct numeric(5,2) DEFAULT 2.00,
  ADD COLUMN IF NOT EXISTS das_juros_pct numeric(5,2) DEFAULT 1.00;

-- ================================================================
-- PARTE 3 — Verificação
-- ================================================================

DO $$
DECLARE
  v_settings boolean;
  v_multa    boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sismei' AND table_name = 'system_settings'
  ) INTO v_settings;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sismei' AND table_name = 'profiles'
      AND column_name = 'das_multa_pct'
  ) INTO v_multa;

  RAISE NOTICE '╔══════════════════════════════════════╗';
  RAISE NOTICE '║  MIGRATION 005 — VERIFICAÇÃO         ║';
  RAISE NOTICE '╠══════════════════════════════════════╣';
  RAISE NOTICE '║  sismei.system_settings existe : %   ║', v_settings;
  RAISE NOTICE '║  profiles.das_multa_pct existe : %   ║', v_multa;
  RAISE NOTICE '╚══════════════════════════════════════╝';
END $$;

COMMIT;
