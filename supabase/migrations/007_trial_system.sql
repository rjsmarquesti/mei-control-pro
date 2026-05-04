-- ================================================================
-- MIGRATION 007: Sistema de Trial Premium (7 dias)
-- Data: 2026-05-03
--
-- OBJETIVO: Substituir plano 'free' por trial premium de 7 dias.
--   - Novos usuários entram com plan=premium, is_trial=true, expires=+7d
--   - Ao expirar: status='trial_expired', plan='free' (via lifecycle)
--   - Admin pode restaurar trial ou deletar conta (após 40 dias)
-- ================================================================

BEGIN;

-- ================================================================
-- 1. Adicionar colunas de trial em profiles
-- ================================================================
ALTER TABLE sismei.profiles
  ADD COLUMN IF NOT EXISTS is_trial        boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;

-- ================================================================
-- 2. Expandir CHECK CONSTRAINT do status para incluir trial_expired
-- ================================================================
ALTER TABLE sismei.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE sismei.profiles
  ADD CONSTRAINT profiles_status_check
    CHECK (status IN ('active','blocked','suspended','trial_expired'));

-- ================================================================
-- 3. Índice para consultas de trial expirado (lifecycle check + admin)
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_sismei_profiles_trial
  ON sismei.profiles (is_trial, subscription_expires_at)
  WHERE is_trial = true;

CREATE INDEX IF NOT EXISTS idx_sismei_profiles_trial_expired
  ON sismei.profiles (status, subscription_expires_at)
  WHERE status = 'trial_expired';

-- ================================================================
-- 4. Reescrever trigger de novo usuário para iniciar trial premium
-- ================================================================
CREATE OR REPLACE FUNCTION public.sismei_handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_tenant_id    uuid;
  v_slug         text;
  v_base_slug    text;
  v_suffix       int;
  v_feature      jsonb;
  v_features     jsonb;
  v_name         text;
  v_plan         text        := 'premium';
  v_trial_expires timestamptz := now() + interval '7 days';
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data ->> 'name',
    NEW.raw_user_meta_data ->> 'full_name',
    split_part(COALESCE(NEW.email,'user'), '@', 1)
  );

  v_base_slug := regexp_replace(
    lower(split_part(COALESCE(NEW.email,'user'), '@', 1)),
    '[^a-z0-9]', '-', 'g'
  ) || '-' || substr(NEW.id::text, 1, 8);

  v_slug := v_base_slug;
  v_suffix := 0;
  WHILE EXISTS (SELECT 1 FROM sismei.tenants WHERE slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix;
  END LOOP;

  INSERT INTO sismei.tenants (
    name, slug, plan, status, owner_id,
    billing_email, max_users, trial_ends_at, subscription_expires_at
  ) VALUES (
    v_name, v_slug, v_plan, 'trial', NEW.id,
    NEW.email, 9999, v_trial_expires, v_trial_expires
  )
  RETURNING id INTO v_tenant_id;

  -- Injetar tenant_id e plan no JWT imediatamente após cadastro
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}') ||
    jsonb_build_object('tenant_id', v_tenant_id::text, 'tenant_plan', v_plan)
  WHERE id = NEW.id;

  -- Features completas do plano premium durante o trial
  v_features := public.sismei_default_features(v_plan);
  FOR v_feature IN SELECT * FROM jsonb_array_elements(v_features)
  LOOP
    INSERT INTO sismei.tenant_features (tenant_id, feature_key, enabled, config)
    VALUES (
      v_tenant_id,
      v_feature ->> 'key',
      (v_feature ->> 'enabled')::boolean,
      COALESCE(v_feature -> 'config', '{}')
    )
    ON CONFLICT (tenant_id, feature_key) DO NOTHING;
  END LOOP;

  INSERT INTO sismei.logs (tenant_id, user_id, action, resource, resource_id, metadata)
  VALUES (v_tenant_id, NEW.id, 'tenant_created', 'tenant', v_tenant_id::text,
    jsonb_build_object('plan', v_plan, 'is_trial', true, 'trial_expires', v_trial_expires, 'email', NEW.email));

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[sismei_handle_new_user] Erro para %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 5. Marcar usuários existentes com plano free como is_trial=false
--    (usuários antigos não são afetados pelo novo sistema)
-- ================================================================
UPDATE sismei.profiles
SET is_trial = false
WHERE is_trial = false; -- no-op, garante que DEFAULT foi aplicado

COMMIT;
