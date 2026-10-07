-- ================================================================
-- MIGRATION 009: Fix trigger sync_plan_on_profile_update
-- Data: 2026-05-16
--
-- PROBLEMA: A função sismei.sync_plan_on_profile_update não tinha
--   EXCEPTION handler. Qualquer falha interna (ex: UPDATE auth.users,
--   INSERT em logs) causava rollback de TODA a transação, incluindo
--   o UPDATE em profiles.subscription_plan. O admin via "sucesso"
--   na UI (sem verificação de resposta) mas o dado nunca era salvo.
--
-- SOLUÇÃO: Adicionar EXCEPTION WHEN OTHERS para isolar falhas internas
--   do trigger sem reverter o UPDATE principal em profiles.
-- ================================================================

BEGIN;

CREATE OR REPLACE FUNCTION sismei.sync_plan_on_profile_update()
RETURNS trigger AS $$
DECLARE
  v_tenant_id uuid;
  v_feature   jsonb;
  v_features  jsonb;
  v_new_plan  text;
BEGIN
  IF OLD.subscription_plan IS DISTINCT FROM NEW.subscription_plan THEN
    v_new_plan := COALESCE(NEW.subscription_plan, 'free');

    SELECT id INTO v_tenant_id
    FROM sismei.tenants
    WHERE owner_id = NEW.id
    LIMIT 1;

    IF v_tenant_id IS NOT NULL THEN
      UPDATE sismei.tenants SET
        plan                    = v_new_plan,
        subscription_expires_at = NEW.subscription_expires_at,
        max_users = CASE v_new_plan
          WHEN 'free'    THEN 1
          WHEN 'basic'   THEN 3
          WHEN 'pro'     THEN 10
          WHEN 'premium' THEN 9999
          ELSE 1
        END,
        updated_at = now()
      WHERE id = v_tenant_id;

      UPDATE auth.users
      SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}') ||
        jsonb_build_object('tenant_plan', v_new_plan)
      WHERE id = NEW.id;

      -- Habilitar features do novo plano (nunca remove, só adiciona)
      v_features := public.sismei_default_features(v_new_plan);
      FOR v_feature IN SELECT * FROM jsonb_array_elements(v_features)
      LOOP
        INSERT INTO sismei.tenant_features (tenant_id, feature_key, enabled, config)
        VALUES (
          v_tenant_id, v_feature ->> 'key',
          (v_feature ->> 'enabled')::boolean,
          COALESCE(v_feature -> 'config', '{}')
        )
        ON CONFLICT (tenant_id, feature_key) DO UPDATE
          SET enabled = true, updated_at = now();
      END LOOP;

      INSERT INTO sismei.logs (tenant_id, user_id, action, resource, resource_id, old_data, new_data)
      VALUES (v_tenant_id, NEW.id, 'plan_changed', 'subscription', v_tenant_id::text,
        jsonb_build_object('plan', OLD.subscription_plan),
        jsonb_build_object('plan', v_new_plan));
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca reverter o UPDATE em profiles por falha na sincronização secundária
  RAISE WARNING '[sync_plan_on_profile_update] Falha ao sincronizar plano para usuario %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
