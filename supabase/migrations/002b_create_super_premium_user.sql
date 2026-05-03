-- ================================================================
-- Script: Criar / Atualizar usuário Super Premium
-- Execute APÓS a migration 002_super_premium_map_leads.sql
--
-- Opção A: Atualizar usuário existente para super_premium
-- Opção B: Criar novo usuário super_premium do zero
--
-- Escolha UMA das opções abaixo e execute apenas ela.
-- ================================================================

-- ================================================================
-- OPÇÃO A — Promover usuário EXISTENTE para Super Premium
-- Substitua 'email@exemplo.com' pelo email real do usuário
-- ================================================================

DO $$
DECLARE
  v_user_id       uuid;
  v_tenant_id     uuid;
  v_expires_at    timestamptz := now() + interval '365 days';
  v_target_email  text := 'email@exemplo.com';  -- ← SUBSTITUA AQUI
BEGIN
  -- Buscar usuário no auth
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_target_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário % não encontrado em auth.users', v_target_email;
  END IF;

  -- Atualizar profile (trigger cuida do resto)
  UPDATE sismei.profiles
  SET
    subscription_plan       = 'super_premium',
    subscription_expires_at = v_expires_at,
    updated_at              = now()
  WHERE id = v_user_id;

  -- Buscar tenant_id
  SELECT id INTO v_tenant_id FROM sismei.tenants WHERE owner_id = v_user_id;

  -- Atualizar tenant diretamente (trigger já faz, mas garantindo)
  UPDATE sismei.tenants
  SET
    plan                    = 'super_premium',
    subscription_expires_at = v_expires_at,
    max_users               = 9999,
    updated_at              = now()
  WHERE id = v_tenant_id;

  -- Atualizar JWT metadata
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}') ||
    jsonb_build_object('tenant_plan', 'super_premium')
  WHERE id = v_user_id;

  -- Habilitar TODAS as features super_premium
  INSERT INTO sismei.tenant_features (tenant_id, feature_key, enabled, config)
  VALUES
    (v_tenant_id, 'map_leads',        true, '{"max_leads": 10000}'),
    (v_tenant_id, 'map_leads_export', true, '{"formats": ["csv","xlsx","pdf"]}'),
    (v_tenant_id, 'map_leads_import', true, '{"max_per_import": 500}'),
    (v_tenant_id, 'geo_filter',       true, '{}'),
    (v_tenant_id, 'nicho_filter',     true, '{}'),
    (v_tenant_id, 'export_pdf',       true, '{}'),
    (v_tenant_id, 'api_access',       true, '{"rate_limit_per_min": 5000}'),
    (v_tenant_id, 'bulk_whatsapp',    false, '{"max_per_day": 200}')
  ON CONFLICT (tenant_id, feature_key) DO UPDATE
    SET enabled = true, config = EXCLUDED.config, updated_at = now();

  RAISE NOTICE '✓ Usuário % atualizado para Super Premium até %', v_target_email, v_expires_at;
  RAISE NOTICE '  user_id   = %', v_user_id;
  RAISE NOTICE '  tenant_id = %', v_tenant_id;
END $$;

-- ================================================================
-- OPÇÃO B — Criar NOVO usuário Super Premium (via admin API)
--
-- Não é possível criar usuário diretamente no PostgreSQL sem
-- chamar a API do GoTrue. Use uma destas alternativas:
--
-- 1. Via painel Supabase Studio:
--    Authentication → Users → Add User → preencher email/senha
--    Depois execute a OPÇÃO A acima para elevar ao super_premium
--
-- 2. Via API route /api/admin/users/create (já existente no app):
--    POST /api/admin/users/create
--    Body: { "name": "...", "email": "...", "password": "...", "plan": "super_premium" }
--
-- 3. Via script n8n ou curl:
--    curl -X POST https://app.sismeipro.com.br/api/admin/users/create \
--      -H "Content-Type: application/json" \
--      -d '{"name":"Nome","email":"email@dominio.com","password":"Senha@123","plan":"super_premium"}'
-- ================================================================

-- ================================================================
-- VERIFICAÇÃO: Conferir usuários super_premium
-- ================================================================
SELECT
  p.id,
  p.name,
  p.email,
  p.subscription_plan,
  p.subscription_expires_at,
  t.id AS tenant_id,
  t.plan AS tenant_plan,
  (SELECT COUNT(*) FROM sismei.tenant_features tf
   WHERE tf.tenant_id = t.id AND tf.enabled = true) AS features_ativas,
  (SELECT COUNT(*) FROM sismei.map_leads ml
   WHERE ml.tenant_id = t.id) AS total_leads
FROM sismei.profiles p
JOIN sismei.tenants t ON t.owner_id = p.id
WHERE p.subscription_plan = 'super_premium'
ORDER BY p.created_at DESC;
