-- ================================================================
-- ROLLBACK: Reverter migration 001 — USE SOMENTE EM EMERGÊNCIA
-- ATENÇÃO: Este script REMOVE dados de tenants/features/logs
-- NÃO afeta profiles, das_payments ou leads (apenas remove tenant_id)
-- ================================================================

BEGIN;

-- 1. Remover triggers
DROP TRIGGER IF EXISTS on_auth_user_created_tenant    ON auth.users;
DROP TRIGGER IF EXISTS before_profile_insert_set_tenant ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_plan_updated        ON public.profiles;
DROP TRIGGER IF EXISTS set_tenants_updated_at         ON public.tenants;
DROP TRIGGER IF EXISTS set_tenant_features_updated_at ON public.tenant_features;

-- 2. Remover funções
DROP FUNCTION IF EXISTS public.handle_new_user_tenant()       CASCADE;
DROP FUNCTION IF EXISTS public.set_profile_tenant_id()        CASCADE;
DROP FUNCTION IF EXISTS public.sync_tenant_plan_on_profile_update() CASCADE;
DROP FUNCTION IF EXISTS public.jwt_tenant_id()                CASCADE;
DROP FUNCTION IF EXISTS public.current_tenant_id()            CASCADE;
DROP FUNCTION IF EXISTS public.is_system_admin()              CASCADE;
DROP FUNCTION IF EXISTS public.tenant_has_feature(text)       CASCADE;
DROP FUNCTION IF EXISTS public.audit_log(text,text,text,jsonb,jsonb,jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.get_default_features(text)     CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at()               CASCADE;

-- 3. Remover views
DROP VIEW IF EXISTS public.v_my_tenant      CASCADE;
DROP VIEW IF EXISTS public.v_admin_tenants  CASCADE;

-- 4. Remover coluna tenant_id das tabelas existentes
ALTER TABLE public.profiles     DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.das_payments DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE public.leads        DROP COLUMN IF EXISTS tenant_id;

-- 5. Remover tabelas novas (CASCADE remove foreign keys e políticas)
DROP TABLE IF EXISTS public.tenant_features CASCADE;
DROP TABLE IF EXISTS public.logs            CASCADE;
DROP TABLE IF EXISTS public.tenants         CASCADE;

-- 6. Remover roles
-- (comentado por segurança — descomente se necessário)
-- DROP ROLE IF EXISTS analytics_reader;
-- DROP ROLE IF EXISTS migration_runner;

-- 7. Limpar app_metadata dos usuários (remover tenant_id)
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data - 'tenant_id' - 'tenant_plan';

-- 8. Recriar políticas RLS originais em profiles (antes da migration)
-- profiles: apenas o próprio usuário vê/edita
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

COMMIT;

-- Verificar rollback
SELECT
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name IN ('tenants','tenant_features','logs'))
  AS tabelas_novas_restantes,   -- deve ser 0
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND column_name = 'tenant_id'
     AND table_name IN ('profiles','das_payments','leads'))
  AS colunas_tenant_id_restantes;  -- deve ser 0
