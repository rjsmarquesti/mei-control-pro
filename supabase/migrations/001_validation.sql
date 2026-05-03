-- ================================================================
-- VALIDATION: Verificar saúde da migration 001
-- Execute após a migration para confirmar integridade
-- ================================================================

-- 1. Tenants criados
SELECT
  COUNT(*)                                      AS total_tenants,
  COUNT(*) FILTER (WHERE plan = 'free')         AS free,
  COUNT(*) FILTER (WHERE plan = 'basic')        AS basic,
  COUNT(*) FILTER (WHERE plan = 'pro')          AS pro,
  COUNT(*) FILTER (WHERE plan = 'premium')      AS premium,
  COUNT(*) FILTER (WHERE status = 'active')     AS active,
  COUNT(*) FILTER (WHERE status != 'active')    AS inactive
FROM public.tenants;

-- 2. Profiles sem tenant_id (deve ser 0)
SELECT COUNT(*) AS profiles_sem_tenant FROM public.profiles WHERE tenant_id IS NULL;

-- 3. DAS payments sem tenant_id (deve ser 0)
SELECT COUNT(*) AS das_sem_tenant FROM public.das_payments WHERE tenant_id IS NULL;

-- 4. Usuários sem tenant_id no app_metadata
SELECT COUNT(*) AS usuarios_sem_tenant_jwt
FROM auth.users
WHERE raw_app_meta_data ->> 'tenant_id' IS NULL;

-- 5. Políticas RLS ativas por tabela
SELECT tablename, rowsecurity AS rls_ativo
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('tenants','tenant_features','logs','profiles','das_payments','leads')
ORDER BY tablename;

-- 6. Políticas por tabela
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 7. Features por tenant (deve ter pelo menos 5 features free por tenant)
SELECT
  t.name,
  t.plan,
  COUNT(tf.id) AS total_features,
  COUNT(*) FILTER (WHERE tf.enabled) AS features_ativas
FROM public.tenants t
LEFT JOIN public.tenant_features tf ON tf.tenant_id = t.id
GROUP BY t.id, t.name, t.plan
ORDER BY t.name;

-- 8. Índices criados
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 9. Triggers ativos
SELECT trigger_name, event_object_table, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
   OR event_object_schema = 'auth'
ORDER BY event_object_table, trigger_name;

-- 10. Funções criadas
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'jwt_tenant_id', 'current_tenant_id', 'is_system_admin',
    'tenant_has_feature', 'audit_log', 'get_default_features',
    'handle_new_user_tenant', 'set_profile_tenant_id',
    'sync_tenant_plan_on_profile_update', 'set_updated_at'
  )
ORDER BY routine_name;

-- 11. Verificar integridade referencial (tenants ↔ profiles)
SELECT
  COUNT(*) FILTER (WHERE t.id IS NULL) AS profiles_tenant_invalido
FROM public.profiles p
LEFT JOIN public.tenants t ON t.id = p.tenant_id;

-- 12. Testar funções auxiliares (execute como usuário autenticado, não service_role)
-- SELECT public.jwt_tenant_id();        -- deve retornar UUID
-- SELECT public.current_tenant_id();    -- deve retornar UUID
-- SELECT public.is_system_admin();      -- true/false
-- SELECT public.tenant_has_feature('das'); -- true para usuários que têm a feature
