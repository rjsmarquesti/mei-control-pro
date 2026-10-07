-- ================================================================
-- MIGRATION 008: Trial Manual de 30 dias
-- Data: 2026-05-14
--
-- OBJETIVO: Substituir trial automático de 7 dias por trial manual
--   de 30 dias, ativado pelo usuário via CTA contextual no produto.
--   - Novos usuários entram como free (is_trial=false)
--   - Trial ativado via POST /api/trial/activate
--   - trial_activated_at registra quando o trial foi ativado
--   - Usuários existentes com trial ativo NÃO são afetados
-- ================================================================

BEGIN;

-- ================================================================
-- 1. Adicionar coluna trial_activated_at em profiles
-- ================================================================
ALTER TABLE sismei.profiles
  ADD COLUMN IF NOT EXISTS trial_activated_at timestamptz;

-- ================================================================
-- 2. Reescrever trigger: novos usuários começam como free
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
  v_plan         text := 'free';
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
    v_name, v_slug, v_plan, 'active', NEW.id,
    NEW.email, 9999, NULL, NULL
  )
  RETURNING id INTO v_tenant_id;

  -- Injetar tenant_id e plan no JWT imediatamente após cadastro
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}') ||
    jsonb_build_object('tenant_id', v_tenant_id::text, 'tenant_plan', v_plan)
  WHERE id = NEW.id;

  -- Features do plano free
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
    jsonb_build_object('plan', v_plan, 'is_trial', false, 'email', NEW.email));

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[sismei_handle_new_user] Erro para %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 3. Índice para trial_activated_at (consultas de lifecycle D3/D7/D14)
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_sismei_profiles_trial_activated
  ON sismei.profiles (trial_activated_at)
  WHERE trial_activated_at IS NOT NULL;

COMMIT;
