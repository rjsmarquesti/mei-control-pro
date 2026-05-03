-- ================================================================
-- MIGRATION 001: Schema sismei + Multi-Tenant Setup
-- Data: 2026-04-12  |  Substitui versão anterior (nunca executada)
--
-- OBJETIVO: Cada app usa seu próprio schema no mesmo Supabase.
--   sismei     → MEI Control Pro
--   noroeste   → App Noroeste  (futuro)
--   agendamento → App Agendamento (futuro)
--
-- ESTRATÉGIA:
--   1. Cria schema sismei
--   2. Move tabelas existentes de public → sismei (sem perder dados)
--   3. Cria tabelas novas no schema sismei
--   4. 1 tenant por usuário MEI (isolamento de dados)
--   5. RLS baseado em tenant_id injetado no JWT
-- ================================================================

BEGIN;

-- ================================================================
-- FASE 1 — Criar schema sismei e conceder permissões
-- ================================================================
CREATE SCHEMA IF NOT EXISTS sismei;

-- Supabase usa esses roles internamente
GRANT USAGE ON SCHEMA sismei TO anon, authenticated, service_role;

-- Novas tabelas criadas no schema já herdam permissões
ALTER DEFAULT PRIVILEGES IN SCHEMA sismei
  GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA sismei
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA sismei
  GRANT SELECT, INSERT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA sismei
  GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA sismei
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- ================================================================
-- FASE 2 — Mover tabelas existentes de public → sismei
-- (índices, constraints e policies viajam junto automaticamente)
-- ================================================================
ALTER TABLE IF EXISTS public.profiles     SET SCHEMA sismei;
ALTER TABLE IF EXISTS public.das_payments SET SCHEMA sismei;
ALTER TABLE IF EXISTS public.leads        SET SCHEMA sismei;

-- Confirmar movimento
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sismei' AND table_name = 'profiles'
  ) THEN
    RAISE EXCEPTION 'FALHA: tabela profiles não está no schema sismei!';
  END IF;
  RAISE NOTICE 'OK: profiles, das_payments, leads movidas para sismei';
END $$;

-- ================================================================
-- FASE 3 — Criar tabelas novas no schema sismei
-- ================================================================

-- tenants: cada usuário MEI é seu próprio tenant
CREATE TABLE IF NOT EXISTS sismei.tenants (
  id                      uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name                    text        NOT NULL,
  slug                    text        NOT NULL,
  plan                    text        NOT NULL DEFAULT 'free'
                          CHECK (plan IN ('free','basic','pro','premium','enterprise')),
  status                  text        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','suspended','cancelled','trial')),
  owner_id                uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  max_users               int         NOT NULL DEFAULT 1,
  billing_email           text,
  billing_cycle           text        DEFAULT 'monthly'
                          CHECK (billing_cycle IN ('monthly','yearly')),
  trial_ends_at           timestamptz,
  subscription_expires_at timestamptz,
  metadata                jsonb       NOT NULL DEFAULT '{}',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenants_slug_unique UNIQUE (slug)
);

COMMENT ON TABLE  sismei.tenants IS 'MEI Control Pro — 1 tenant por usuário MEI';
COMMENT ON COLUMN sismei.tenants.slug IS 'Identificador único URL-safe do tenant';
COMMENT ON COLUMN sismei.tenants.metadata IS 'Dados extras: CNPJ, endereço, configurações específicas';

-- tenant_features: feature flags por tenant
CREATE TABLE IF NOT EXISTS sismei.tenant_features (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid    NOT NULL REFERENCES sismei.tenants(id) ON DELETE CASCADE,
  feature_key text    NOT NULL,
  enabled     boolean NOT NULL DEFAULT true,
  config      jsonb   NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_features_unique UNIQUE (tenant_id, feature_key)
);

COMMENT ON TABLE  sismei.tenant_features IS 'Feature flags por tenant — controla acesso a funcionalidades por plano';
COMMENT ON COLUMN sismei.tenant_features.feature_key IS 'Ex: das_alerts, irpf, relatorios, whatsapp_notif, export_pdf';

-- logs: auditoria imutável
CREATE TABLE IF NOT EXISTS sismei.logs (
  id          bigserial   PRIMARY KEY,
  tenant_id   uuid        REFERENCES sismei.tenants(id) ON DELETE CASCADE,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text        NOT NULL,
  resource    text,
  resource_id text,
  old_data    jsonb,
  new_data    jsonb,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE sismei.logs IS 'Auditoria — sem UPDATE/DELETE para usuários (imutável por design)';
COMMENT ON COLUMN sismei.logs.action IS 'Ex: tenant_created, plan_upgraded, das_paid, payment_approved';

-- ================================================================
-- FASE 4 — Adicionar tenant_id às tabelas migradas (nullable primeiro)
-- ================================================================
ALTER TABLE sismei.profiles
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES sismei.tenants(id) ON DELETE SET NULL;

ALTER TABLE sismei.das_payments
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES sismei.tenants(id) ON DELETE SET NULL;

ALTER TABLE sismei.leads
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES sismei.tenants(id) ON DELETE SET NULL;

-- ================================================================
-- FASE 5 — Função auxiliar: features padrão por plano
-- ================================================================
CREATE OR REPLACE FUNCTION public.sismei_default_features(p_plan text)
RETURNS jsonb AS $$
DECLARE
  v_features jsonb := '[]'::jsonb;
BEGIN
  -- Plano free — funcionalidades básicas
  v_features := v_features || '[
    {"key": "dashboard",  "enabled": true, "config": {}},
    {"key": "receitas",   "enabled": true, "config": {}},
    {"key": "despesas",   "enabled": true, "config": {}},
    {"key": "das",        "enabled": true, "config": {}},
    {"key": "categorias", "enabled": true, "config": {}}
  ]'::jsonb;

  -- Basic e acima
  IF p_plan IN ('basic','pro','premium','enterprise') THEN
    v_features := v_features || '[
      {"key": "financeiro",  "enabled": true, "config": {}},
      {"key": "das_alerts",  "enabled": true, "config": {"days_before": [15, 7, 1]}}
    ]'::jsonb;
  END IF;

  -- Pro e acima
  IF p_plan IN ('pro','premium','enterprise') THEN
    v_features := v_features || '[
      {"key": "relatorios",     "enabled": true, "config": {}},
      {"key": "irpf",           "enabled": true, "config": {}},
      {"key": "whatsapp_notif", "enabled": true, "config": {}}
    ]'::jsonb;
  END IF;

  -- Premium e acima
  IF p_plan IN ('premium','enterprise') THEN
    v_features := v_features || '[
      {"key": "export_pdf",  "enabled": true, "config": {}},
      {"key": "api_access",  "enabled": true, "config": {"rate_limit_per_min": 1000}},
      {"key": "multi_cnpj",  "enabled": true, "config": {"max_cnpj": 3}}
    ]'::jsonb;
  END IF;

  RETURN v_features;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ================================================================
-- FASE 6 — Backfill: criar 1 tenant por usuário existente
-- ================================================================
DO $$
DECLARE
  v_profile     RECORD;
  v_tenant_id   uuid;
  v_slug        text;
  v_base_slug   text;
  v_suffix      int;
  v_feature     jsonb;
  v_features    jsonb;
BEGIN
  RAISE NOTICE '=== Iniciando backfill — 1 tenant por usuário ===';

  FOR v_profile IN
    SELECT p.id, p.email, p.name, p.subscription_plan, p.subscription_expires_at
    FROM sismei.profiles p
    WHERE p.tenant_id IS NULL
    ORDER BY p.id
  LOOP
    -- Verificar se já existe tenant para este owner (idempotente)
    SELECT id INTO v_tenant_id
    FROM sismei.tenants
    WHERE owner_id = v_profile.id
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
      -- Slug único baseado no email
      v_base_slug := regexp_replace(
        lower(split_part(COALESCE(v_profile.email,'user'), '@', 1)),
        '[^a-z0-9]', '-', 'g'
      ) || '-' || substr(v_profile.id::text, 1, 8);

      v_slug := v_base_slug;
      v_suffix := 0;
      WHILE EXISTS (SELECT 1 FROM sismei.tenants WHERE slug = v_slug) LOOP
        v_suffix := v_suffix + 1;
        v_slug := v_base_slug || '-' || v_suffix;
      END LOOP;

      INSERT INTO sismei.tenants (
        name, slug, plan, status, owner_id, billing_email, max_users,
        subscription_expires_at
      ) VALUES (
        COALESCE(v_profile.name, split_part(COALESCE(v_profile.email,'user'), '@', 1)),
        v_slug,
        COALESCE(v_profile.subscription_plan, 'free'),
        'active',
        v_profile.id,
        v_profile.email,
        CASE COALESCE(v_profile.subscription_plan,'free')
          WHEN 'free'    THEN 1
          WHEN 'basic'   THEN 3
          WHEN 'pro'     THEN 10
          WHEN 'premium' THEN 9999
          ELSE 1
        END,
        v_profile.subscription_expires_at
      )
      RETURNING id INTO v_tenant_id;
    END IF;

    -- Ligar profile ao tenant
    UPDATE sismei.profiles
    SET tenant_id = v_tenant_id
    WHERE id = v_profile.id;

    -- Ligar das_payments do usuário ao tenant
    UPDATE sismei.das_payments
    SET tenant_id = v_tenant_id
    WHERE user_id = v_profile.id AND tenant_id IS NULL;

    -- Injetar tenant_id no JWT via app_metadata (sem precisar de re-login imediato)
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}') ||
      jsonb_build_object(
        'tenant_id',   v_tenant_id::text,
        'tenant_plan', COALESCE(v_profile.subscription_plan,'free')
      )
    WHERE id = v_profile.id;

    -- Features padrão do plano
    v_features := public.sismei_default_features(COALESCE(v_profile.subscription_plan,'free'));
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

    RAISE NOTICE 'Tenant criado: % → %', v_profile.email, v_tenant_id;
  END LOOP;

  -- Leads sem tenant → atribuir ao tenant do admin
  UPDATE sismei.leads l
  SET tenant_id = (
    SELECT t.id FROM sismei.tenants t
    JOIN sismei.profiles p ON p.id = t.owner_id
    WHERE p.role = 'admin'
    ORDER BY t.created_at
    LIMIT 1
  )
  WHERE l.tenant_id IS NULL;

  RAISE NOTICE '=== Backfill concluído ===';
END $$;

-- ================================================================
-- FASE 7 — Aplicar NOT NULL após backfill verificado
-- ================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sismei.profiles WHERE tenant_id IS NULL LIMIT 1) THEN
    ALTER TABLE sismei.profiles ALTER COLUMN tenant_id SET NOT NULL;
    RAISE NOTICE 'NOT NULL aplicado: sismei.profiles.tenant_id';
  ELSE
    RAISE WARNING 'profiles ainda tem NULLs em tenant_id — NOT NULL não aplicado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM sismei.das_payments WHERE tenant_id IS NULL LIMIT 1) THEN
    ALTER TABLE sismei.das_payments ALTER COLUMN tenant_id SET NOT NULL;
    RAISE NOTICE 'NOT NULL aplicado: sismei.das_payments.tenant_id';
  ELSE
    RAISE WARNING 'das_payments ainda tem NULLs em tenant_id — NOT NULL não aplicado';
  END IF;

  -- leads: nullable (leads anônimos do landing page chegam sem tenant)
  RAISE NOTICE 'sismei.leads.tenant_id mantido nullable (captação anônima)';
END $$;

-- ================================================================
-- FASE 8 — Funções auxiliares (schema sismei — específicas do app)
-- ================================================================

-- Lê tenant_id do JWT (app_metadata) — sem query, ultra-rápido
CREATE OR REPLACE FUNCTION sismei.jwt_tenant_id()
RETURNS uuid AS $$
  SELECT NULLIF(
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id'), ''
  )::uuid;
$$ LANGUAGE sql STABLE;

-- Tenant_id atual: JWT primeiro, fallback em sismei.profiles
CREATE OR REPLACE FUNCTION sismei.current_tenant_id()
RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  v_id := sismei.jwt_tenant_id();
  IF v_id IS NULL THEN
    SELECT tenant_id INTO v_id
    FROM sismei.profiles
    WHERE id = auth.uid()
    LIMIT 1;
  END IF;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Verifica se o usuário atual é admin do sistema MEI Control Pro
CREATE OR REPLACE FUNCTION sismei.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM sismei.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Verifica feature flag do tenant atual
CREATE OR REPLACE FUNCTION sismei.tenant_has_feature(p_key text)
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT enabled FROM sismei.tenant_features
     WHERE tenant_id = sismei.current_tenant_id()
       AND feature_key = p_key
     LIMIT 1),
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Registra auditoria (chamada por API routes server-side)
CREATE OR REPLACE FUNCTION sismei.audit_log(
  p_action      text,
  p_resource    text    DEFAULT NULL,
  p_resource_id text    DEFAULT NULL,
  p_old_data    jsonb   DEFAULT NULL,
  p_new_data    jsonb   DEFAULT NULL,
  p_metadata    jsonb   DEFAULT '{}'
) RETURNS void AS $$
  INSERT INTO sismei.logs
    (tenant_id, user_id, action, resource, resource_id, old_data, new_data, metadata)
  VALUES (
    sismei.current_tenant_id(), auth.uid(),
    p_action, p_resource, p_resource_id, p_old_data, p_new_data, p_metadata
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ================================================================
-- FASE 9 — Trigger: criar tenant ao registrar novo usuário
-- ================================================================
CREATE OR REPLACE FUNCTION public.sismei_handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_tenant_id uuid;
  v_slug      text;
  v_base_slug text;
  v_suffix    int;
  v_feature   jsonb;
  v_features  jsonb;
  v_name      text;
  v_plan      text := 'free';
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
    billing_email, max_users, trial_ends_at
  ) VALUES (
    v_name, v_slug, v_plan, 'active', NEW.id,
    NEW.email, 1, now() + interval '30 days'
  )
  RETURNING id INTO v_tenant_id;

  -- Injetar tenant_id no JWT imediatamente após cadastro
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}') ||
    jsonb_build_object('tenant_id', v_tenant_id::text, 'tenant_plan', v_plan)
  WHERE id = NEW.id;

  -- Features padrão do plano free
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
    jsonb_build_object('plan', v_plan, 'email', NEW.email));

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca bloquear o cadastro por erro no trigger
  RAISE WARNING '[sismei_handle_new_user] Erro para %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sismei_on_user_created ON auth.users;
CREATE TRIGGER sismei_on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sismei_handle_new_user();

-- ================================================================
-- FASE 10 — Trigger: preencher tenant_id no profile automaticamente
-- ================================================================
CREATE OR REPLACE FUNCTION sismei.auto_set_profile_tenant()
RETURNS trigger AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT (raw_app_meta_data ->> 'tenant_id')::uuid
    INTO v_tenant_id
    FROM auth.users
    WHERE id = NEW.id;
    NEW.tenant_id := v_tenant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS before_profile_insert_set_tenant ON sismei.profiles;
CREATE TRIGGER before_profile_insert_set_tenant
  BEFORE INSERT ON sismei.profiles
  FOR EACH ROW EXECUTE FUNCTION sismei.auto_set_profile_tenant();

-- ================================================================
-- FASE 11 — Trigger: sincronizar plano entre profile ↔ tenant
-- ================================================================
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_sismei_profile_plan_updated ON sismei.profiles;
CREATE TRIGGER on_sismei_profile_plan_updated
  AFTER UPDATE OF subscription_plan ON sismei.profiles
  FOR EACH ROW EXECUTE FUNCTION sismei.sync_plan_on_profile_update();

-- ================================================================
-- FASE 12 — Trigger: updated_at automático
-- ================================================================
CREATE OR REPLACE FUNCTION sismei.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenants_updated_at ON sismei.tenants;
CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON sismei.tenants
  FOR EACH ROW EXECUTE FUNCTION sismei.set_updated_at();

DROP TRIGGER IF EXISTS tenant_features_updated_at ON sismei.tenant_features;
CREATE TRIGGER tenant_features_updated_at
  BEFORE UPDATE ON sismei.tenant_features
  FOR EACH ROW EXECUTE FUNCTION sismei.set_updated_at();

-- ================================================================
-- FASE 13 — RLS: políticas de isolamento por schema
-- ================================================================

-- ---- sismei.tenants ----
ALTER TABLE sismei.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all"        ON sismei.tenants FOR ALL  TO authenticated
  USING (sismei.is_admin()) WITH CHECK (sismei.is_admin());

CREATE POLICY "owner_read"       ON sismei.tenants FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "owner_update"     ON sismei.tenants FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- ---- sismei.tenant_features ----
ALTER TABLE sismei.tenant_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all"        ON sismei.tenant_features FOR ALL  TO authenticated
  USING (sismei.is_admin()) WITH CHECK (sismei.is_admin());

CREATE POLICY "user_read"        ON sismei.tenant_features FOR SELECT TO authenticated
  USING (tenant_id = sismei.current_tenant_id());

-- ---- sismei.logs ----
ALTER TABLE sismei.logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all"        ON sismei.logs FOR ALL  TO authenticated
  USING (sismei.is_admin()) WITH CHECK (sismei.is_admin());

CREATE POLICY "user_read_own"    ON sismei.logs FOR SELECT TO authenticated
  USING (tenant_id = sismei.current_tenant_id() AND user_id = auth.uid());

CREATE POLICY "user_insert_own"  ON sismei.logs FOR INSERT TO authenticated
  WITH CHECK (tenant_id = sismei.current_tenant_id());

-- ---- sismei.profiles (recriar políticas — as antigas usavam public schema) ----
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
    WHERE schemaname = 'sismei' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON sismei.profiles', r.policyname);
  END LOOP;
END $$;

ALTER TABLE sismei.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all"        ON sismei.profiles FOR ALL  TO authenticated
  USING (sismei.is_admin()) WITH CHECK (sismei.is_admin());

CREATE POLICY "user_read_own"    ON sismei.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "user_update_own"  ON sismei.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ---- sismei.das_payments ----
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
    WHERE schemaname = 'sismei' AND tablename = 'das_payments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON sismei.das_payments', r.policyname);
  END LOOP;
END $$;

ALTER TABLE sismei.das_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all"        ON sismei.das_payments FOR ALL  TO authenticated
  USING (sismei.is_admin()) WITH CHECK (sismei.is_admin());

-- Dupla camada: user_id + tenant_id
CREATE POLICY "user_own"         ON sismei.das_payments FOR ALL  TO authenticated
  USING (user_id = auth.uid() AND tenant_id = sismei.current_tenant_id())
  WITH CHECK (user_id = auth.uid() AND tenant_id = sismei.current_tenant_id());

-- ---- sismei.leads ----
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
    WHERE schemaname = 'sismei' AND tablename = 'leads'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON sismei.leads', r.policyname);
  END LOOP;
END $$;

ALTER TABLE sismei.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all"        ON sismei.leads FOR ALL  TO authenticated
  USING (sismei.is_admin()) WITH CHECK (sismei.is_admin());

-- Landing page anônima insere leads sem autenticação
CREATE POLICY "anon_insert"      ON sismei.leads FOR INSERT TO anon
  WITH CHECK (true);

-- ================================================================
-- FASE 14 — Índices para performance
-- ================================================================

-- tenants
CREATE INDEX IF NOT EXISTS idx_sismei_tenants_owner      ON sismei.tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_sismei_tenants_plan_status ON sismei.tenants(plan, status);
CREATE INDEX IF NOT EXISTS idx_sismei_tenants_expires     ON sismei.tenants(subscription_expires_at)
  WHERE status = 'active';

-- tenant_features
CREATE INDEX IF NOT EXISTS idx_sismei_features_tenant    ON sismei.tenant_features(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sismei_features_lookup    ON sismei.tenant_features(tenant_id, feature_key);

-- logs (alto volume)
CREATE INDEX IF NOT EXISTS idx_sismei_logs_tenant_time   ON sismei.logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sismei_logs_user_time     ON sismei.logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sismei_logs_action        ON sismei.logs(action);
CREATE INDEX IF NOT EXISTS idx_sismei_logs_resource      ON sismei.logs(resource, resource_id);

-- profiles
CREATE INDEX IF NOT EXISTS idx_sismei_profiles_tenant    ON sismei.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sismei_profiles_role      ON sismei.profiles(role);
CREATE INDEX IF NOT EXISTS idx_sismei_profiles_plan      ON sismei.profiles(subscription_plan);

-- das_payments
CREATE INDEX IF NOT EXISTS idx_sismei_das_tenant         ON sismei.das_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sismei_das_user_tenant    ON sismei.das_payments(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_sismei_das_due_pending    ON sismei.das_payments(due_date)
  WHERE status = 'pending';

-- leads
CREATE INDEX IF NOT EXISTS idx_sismei_leads_tenant       ON sismei.leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sismei_leads_status       ON sismei.leads(status);
CREATE INDEX IF NOT EXISTS idx_sismei_leads_tenant_status ON sismei.leads(tenant_id, status);

-- ================================================================
-- FASE 15 — Roles do banco
-- ================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'analytics_reader') THEN
    CREATE ROLE analytics_reader NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'migration_runner') THEN
    CREATE ROLE migration_runner NOLOGIN;
  END IF;
END $$;

GRANT USAGE ON SCHEMA sismei TO analytics_reader, migration_runner;
GRANT SELECT ON sismei.tenants, sismei.tenant_features, sismei.logs, sismei.profiles TO analytics_reader;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA sismei TO migration_runner;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA sismei TO migration_runner;

-- ================================================================
-- FASE 16 — Views
-- ================================================================
CREATE OR REPLACE VIEW sismei.v_my_tenant AS
SELECT
  t.id, t.name, t.slug, t.plan, t.status,
  t.max_users, t.billing_email, t.trial_ends_at,
  t.subscription_expires_at, t.metadata, t.created_at,
  (
    SELECT jsonb_object_agg(
      tf.feature_key,
      jsonb_build_object('enabled', tf.enabled, 'config', tf.config)
    )
    FROM sismei.tenant_features tf
    WHERE tf.tenant_id = t.id
  ) AS features
FROM sismei.tenants t
WHERE t.owner_id = auth.uid();

COMMENT ON VIEW sismei.v_my_tenant IS 'Tenant + features do usuário atual';

-- ================================================================
-- FASE 17 — Verificação final
-- ================================================================
DO $$
DECLARE
  v_tenants   int; v_profiles  int;
  v_null_p    int; v_features  int;
  v_null_das  int; v_rls       int;
BEGIN
  SELECT COUNT(*) INTO v_tenants  FROM sismei.tenants;
  SELECT COUNT(*) INTO v_profiles FROM sismei.profiles;
  SELECT COUNT(*) INTO v_null_p   FROM sismei.profiles     WHERE tenant_id IS NULL;
  SELECT COUNT(*) INTO v_features FROM sismei.tenant_features;
  SELECT COUNT(*) INTO v_null_das FROM sismei.das_payments  WHERE tenant_id IS NULL;
  SELECT COUNT(*) INTO v_rls
    FROM pg_tables
    WHERE schemaname = 'sismei'
      AND tablename IN ('tenants','tenant_features','logs','profiles','das_payments','leads')
      AND rowsecurity = true;

  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════╗';
  RAISE NOTICE '║  MIGRATION 001 sismei — RESUMO FINAL  ║';
  RAISE NOTICE '╠════════════════════════════════════════╣';
  RAISE NOTICE '║  Tenants criados        : %            ║', LPAD(v_tenants::text, 5);
  RAISE NOTICE '║  Profiles migrados      : %            ║', LPAD(v_profiles::text, 5);
  RAISE NOTICE '║  Profiles sem tenant_id : %            ║', LPAD(v_null_p::text, 5);
  RAISE NOTICE '║  Features criadas       : %            ║', LPAD(v_features::text, 5);
  RAISE NOTICE '║  DAS sem tenant_id      : %            ║', LPAD(v_null_das::text, 5);
  RAISE NOTICE '║  Tabelas com RLS ativo  : %/6          ║', v_rls;
  RAISE NOTICE '╚════════════════════════════════════════╝';
  RAISE NOTICE '';

  IF v_null_p > 0 THEN
    RAISE WARNING '% profiles sem tenant_id. Execute validation.sql para detalhar.', v_null_p;
  END IF;
  IF v_rls < 6 THEN
    RAISE WARNING 'Nem todas as tabelas têm RLS ativo.';
  END IF;
END $$;

COMMIT;
