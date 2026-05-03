-- ================================================================
-- FIX: Remover políticas duplicadas e recriar
-- Execute quando a migration 001 falhar com "policy already exists"
-- ================================================================

BEGIN;

-- Remover TODAS as políticas do schema sismei
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'sismei'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename
    );
    RAISE NOTICE 'Removida: % em %.%', r.policyname, r.schemaname, r.tablename;
  END LOOP;
END $$;

-- ---- sismei.tenants ----
ALTER TABLE sismei.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all"    ON sismei.tenants FOR ALL TO authenticated
  USING (sismei.is_admin()) WITH CHECK (sismei.is_admin());
CREATE POLICY "owner_read"   ON sismei.tenants FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "owner_update" ON sismei.tenants FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- ---- sismei.tenant_features ----
ALTER TABLE sismei.tenant_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all"  ON sismei.tenant_features FOR ALL TO authenticated
  USING (sismei.is_admin()) WITH CHECK (sismei.is_admin());
CREATE POLICY "user_read"  ON sismei.tenant_features FOR SELECT TO authenticated
  USING (tenant_id = sismei.current_tenant_id());

-- ---- sismei.logs ----
ALTER TABLE sismei.logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all"       ON sismei.logs FOR ALL TO authenticated
  USING (sismei.is_admin()) WITH CHECK (sismei.is_admin());
CREATE POLICY "user_read_own"   ON sismei.logs FOR SELECT TO authenticated
  USING (tenant_id = sismei.current_tenant_id() AND user_id = auth.uid());
CREATE POLICY "user_insert_own" ON sismei.logs FOR INSERT TO authenticated
  WITH CHECK (tenant_id = sismei.current_tenant_id());

-- ---- sismei.profiles ----
ALTER TABLE sismei.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all"       ON sismei.profiles FOR ALL TO authenticated
  USING (sismei.is_admin()) WITH CHECK (sismei.is_admin());
CREATE POLICY "user_read_own"   ON sismei.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY "user_update_own" ON sismei.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ---- sismei.das_payments ----
ALTER TABLE sismei.das_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all" ON sismei.das_payments FOR ALL TO authenticated
  USING (sismei.is_admin()) WITH CHECK (sismei.is_admin());
CREATE POLICY "user_own"  ON sismei.das_payments FOR ALL TO authenticated
  USING (user_id = auth.uid() AND tenant_id = sismei.current_tenant_id())
  WITH CHECK (user_id = auth.uid() AND tenant_id = sismei.current_tenant_id());

-- ---- sismei.leads ----
ALTER TABLE sismei.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all"   ON sismei.leads FOR ALL TO authenticated
  USING (sismei.is_admin()) WITH CHECK (sismei.is_admin());
CREATE POLICY "anon_insert" ON sismei.leads FOR INSERT TO anon
  WITH CHECK (true);

-- Verificar resultado
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'sismei'
ORDER BY tablename, policyname;

COMMIT;
