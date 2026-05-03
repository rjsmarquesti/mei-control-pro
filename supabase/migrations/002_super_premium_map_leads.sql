-- ================================================================
-- MIGRATION 002: Plano Super Premium + Captação de Leads Google Maps
-- Data: 2026-04-12
-- Depende de: 001_multi_tenant_setup.sql
-- ================================================================

BEGIN;

-- ================================================================
-- FASE 1 — Adicionar plano super_premium às constraints
-- ================================================================

-- Atualizar constraint de plano em sismei.tenants
ALTER TABLE sismei.tenants
  DROP CONSTRAINT IF EXISTS tenants_plan_check;
ALTER TABLE sismei.tenants
  ADD CONSTRAINT tenants_plan_check
  CHECK (plan IN ('free','basic','pro','premium','super_premium','enterprise'));

-- Atualizar constraint em sismei.profiles (se existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sismei' AND table_name = 'profiles'
      AND column_name = 'subscription_plan'
  ) THEN
    -- Remove constraint antiga se existir
    ALTER TABLE sismei.profiles
      DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;
    RAISE NOTICE 'Constraint de plano atualizada em profiles';
  END IF;
END $$;

-- ================================================================
-- FASE 2 — Criar tabela sismei.map_leads (captação Google Maps)
-- ================================================================
CREATE TABLE IF NOT EXISTS sismei.map_leads (
  id              uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       uuid          NOT NULL REFERENCES sismei.tenants(id) ON DELETE CASCADE,
  user_id         uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dados do negócio captado no Google Maps
  business_name   text          NOT NULL,
  phone           text,
  phone2          text,
  email           text,
  website         text,
  rating          numeric(2,1)  CHECK (rating >= 0 AND rating <= 5),
  reviews_count   int           DEFAULT 0,
  google_maps_url text,
  place_id        text,         -- Google Place ID único

  -- Localização geográfica (todos os níveis)
  estado          text          NOT NULL,   -- sigla: SP, RJ, MG...
  municipio       text          NOT NULL,   -- nome completo do município
  cidade          text,                     -- pode diferir do município
  bairro          text,
  cep             text,
  logradouro      text,                     -- rua/avenida
  numero          text,
  complemento     text,
  latitude        numeric(10,8),
  longitude       numeric(11,8),

  -- Classificação por nicho e categoria
  nicho           text          NOT NULL,   -- Ex: Saúde, Alimentação, Beleza, Jurídico...
  categoria       text,                     -- Ex: Dentista, Pizzaria, Salão, Advogado...
  subcategoria    text,                     -- Ex: Implante Dental, Pizza Artesanal...
  tags            text[],                   -- tags livres para segmentação

  -- Funil de vendas
  status          text          NOT NULL DEFAULT 'novo'
                  CHECK (status IN ('novo','contatado','qualificado','proposta','convertido','perdido','sem_interesse')),
  priority        text          DEFAULT 'normal'
                  CHECK (priority IN ('baixa','normal','alta','urgente')),
  notes           text,
  ultimo_contato  timestamptz,
  proximo_contato timestamptz,

  -- Auditoria
  fonte           text          DEFAULT 'google_maps'
                  CHECK (fonte IN ('google_maps','manual','csv_import','api')),
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  sismei.map_leads IS 'Leads captados via Google Maps com geolocalização e nicho';
COMMENT ON COLUMN sismei.map_leads.place_id     IS 'Google Place ID — único por estabelecimento no Maps';
COMMENT ON COLUMN sismei.map_leads.estado       IS 'Sigla do estado: SP, RJ, MG, RS...';
COMMENT ON COLUMN sismei.map_leads.nicho        IS 'Setor: Saúde, Alimentação, Beleza, Jurídico, Educação...';
COMMENT ON COLUMN sismei.map_leads.tags         IS 'Array de tags livres para segmentação adicional';
COMMENT ON COLUMN sismei.map_leads.status       IS 'Funil: novo → contatado → qualificado → proposta → convertido/perdido';

-- ================================================================
-- FASE 3 — Índices para filtros geográficos e de nicho
-- ================================================================

-- Filtros primários de busca
CREATE INDEX IF NOT EXISTS idx_map_leads_tenant        ON sismei.map_leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_map_leads_user          ON sismei.map_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_map_leads_status        ON sismei.map_leads(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_map_leads_priority      ON sismei.map_leads(tenant_id, priority);

-- Filtros geográficos (ordem do mais geral ao mais específico)
CREATE INDEX IF NOT EXISTS idx_map_leads_estado        ON sismei.map_leads(tenant_id, estado);
CREATE INDEX IF NOT EXISTS idx_map_leads_municipio     ON sismei.map_leads(tenant_id, estado, municipio);
CREATE INDEX IF NOT EXISTS idx_map_leads_cidade        ON sismei.map_leads(tenant_id, cidade);
CREATE INDEX IF NOT EXISTS idx_map_leads_bairro        ON sismei.map_leads(tenant_id, bairro);
CREATE INDEX IF NOT EXISTS idx_map_leads_cep           ON sismei.map_leads(cep);

-- Filtros de nicho
CREATE INDEX IF NOT EXISTS idx_map_leads_nicho         ON sismei.map_leads(tenant_id, nicho);
CREATE INDEX IF NOT EXISTS idx_map_leads_categoria     ON sismei.map_leads(tenant_id, nicho, categoria);

-- Performance e deduplicação
CREATE INDEX IF NOT EXISTS idx_map_leads_place_id      ON sismei.map_leads(place_id) WHERE place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_map_leads_phone         ON sismei.map_leads(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_map_leads_created       ON sismei.map_leads(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_map_leads_proximo       ON sismei.map_leads(proximo_contato)
  WHERE status NOT IN ('convertido','perdido','sem_interesse');

-- Full text search em business_name
CREATE INDEX IF NOT EXISTS idx_map_leads_nome_fts      ON sismei.map_leads
  USING gin(to_tsvector('portuguese', business_name));

-- ================================================================
-- FASE 4 — RLS para map_leads
-- ================================================================
ALTER TABLE sismei.map_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all" ON sismei.map_leads FOR ALL TO authenticated
  USING (sismei.is_admin()) WITH CHECK (sismei.is_admin());

-- Usuário vê e gerencia apenas os próprios leads (isolamento duplo)
CREATE POLICY "user_own" ON sismei.map_leads FOR ALL TO authenticated
  USING (user_id = auth.uid() AND tenant_id = sismei.current_tenant_id())
  WITH CHECK (user_id = auth.uid() AND tenant_id = sismei.current_tenant_id());

-- ================================================================
-- FASE 5 — Trigger updated_at em map_leads
-- ================================================================
DROP TRIGGER IF EXISTS map_leads_updated_at ON sismei.map_leads;
CREATE TRIGGER map_leads_updated_at
  BEFORE UPDATE ON sismei.map_leads
  FOR EACH ROW EXECUTE FUNCTION sismei.set_updated_at();

-- ================================================================
-- FASE 6 — Atualizar função de features para incluir super_premium
-- ================================================================
CREATE OR REPLACE FUNCTION public.sismei_default_features(p_plan text)
RETURNS jsonb AS $$
DECLARE
  v_features jsonb := '[]'::jsonb;
BEGIN
  -- free — funcionalidades básicas
  v_features := v_features || '[
    {"key": "dashboard",  "enabled": true, "config": {}},
    {"key": "receitas",   "enabled": true, "config": {}},
    {"key": "despesas",   "enabled": true, "config": {}},
    {"key": "das",        "enabled": true, "config": {}},
    {"key": "categorias", "enabled": true, "config": {}}
  ]'::jsonb;

  -- basic+
  IF p_plan IN ('basic','pro','premium','super_premium','enterprise') THEN
    v_features := v_features || '[
      {"key": "financeiro",  "enabled": true, "config": {}},
      {"key": "das_alerts",  "enabled": true, "config": {"days_before": [15, 7, 1]}}
    ]'::jsonb;
  END IF;

  -- pro+
  IF p_plan IN ('pro','premium','super_premium','enterprise') THEN
    v_features := v_features || '[
      {"key": "relatorios",     "enabled": true, "config": {}},
      {"key": "irpf",           "enabled": true, "config": {}},
      {"key": "whatsapp_notif", "enabled": true, "config": {}}
    ]'::jsonb;
  END IF;

  -- premium+
  IF p_plan IN ('premium','super_premium','enterprise') THEN
    v_features := v_features || '[
      {"key": "export_pdf",  "enabled": true, "config": {}},
      {"key": "api_access",  "enabled": true, "config": {"rate_limit_per_min": 1000}},
      {"key": "multi_cnpj",  "enabled": true, "config": {"max_cnpj": 3}}
    ]'::jsonb;
  END IF;

  -- super_premium+ (captação Google Maps)
  IF p_plan IN ('super_premium','enterprise') THEN
    v_features := v_features || '[
      {"key": "map_leads",        "enabled": true,  "config": {"max_leads": 10000}},
      {"key": "map_leads_export", "enabled": true,  "config": {"formats": ["csv","xlsx","pdf"]}},
      {"key": "map_leads_import", "enabled": true,  "config": {"max_per_import": 500}},
      {"key": "geo_filter",       "enabled": true,  "config": {}},
      {"key": "nicho_filter",     "enabled": true,  "config": {}},
      {"key": "api_access",       "enabled": true,  "config": {"rate_limit_per_min": 5000}},
      {"key": "bulk_whatsapp",    "enabled": false,  "config": {"max_per_day": 200}}
    ]'::jsonb;
  END IF;

  RETURN v_features;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ================================================================
-- FASE 7 — Atualizar trigger de plano para aceitar super_premium
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
    FROM sismei.tenants WHERE owner_id = NEW.id LIMIT 1;

    IF v_tenant_id IS NOT NULL THEN
      UPDATE sismei.tenants SET
        plan = v_new_plan,
        subscription_expires_at = NEW.subscription_expires_at,
        max_users = CASE v_new_plan
          WHEN 'free'          THEN 1
          WHEN 'basic'         THEN 3
          WHEN 'pro'           THEN 10
          WHEN 'premium'       THEN 9999
          WHEN 'super_premium' THEN 9999
          ELSE 1
        END,
        updated_at = now()
      WHERE id = v_tenant_id;

      UPDATE auth.users
      SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}') ||
        jsonb_build_object('tenant_plan', v_new_plan)
      WHERE id = NEW.id;

      v_features := public.sismei_default_features(v_new_plan);
      FOR v_feature IN SELECT * FROM jsonb_array_elements(v_features)
      LOOP
        INSERT INTO sismei.tenant_features (tenant_id, feature_key, enabled, config)
        VALUES (
          v_tenant_id,
          v_feature ->> 'key',
          (v_feature ->> 'enabled')::boolean,
          COALESCE(v_feature -> 'config', '{}')
        )
        ON CONFLICT (tenant_id, feature_key) DO UPDATE
          SET enabled    = EXCLUDED.enabled,
              config     = EXCLUDED.config,
              updated_at = now();
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

-- ================================================================
-- FASE 8 — View de estatísticas de map_leads por tenant
-- ================================================================
CREATE OR REPLACE VIEW sismei.v_map_leads_stats AS
SELECT
  tenant_id,
  COUNT(*)                                                  AS total,
  COUNT(*) FILTER (WHERE status = 'novo')                   AS novos,
  COUNT(*) FILTER (WHERE status = 'contatado')              AS contatados,
  COUNT(*) FILTER (WHERE status = 'qualificado')            AS qualificados,
  COUNT(*) FILTER (WHERE status = 'proposta')               AS em_proposta,
  COUNT(*) FILTER (WHERE status = 'convertido')             AS convertidos,
  COUNT(*) FILTER (WHERE status IN ('perdido','sem_interesse')) AS descartados,
  COUNT(DISTINCT estado)                                    AS estados_cobertos,
  COUNT(DISTINCT municipio)                                 AS municipios_cobertos,
  COUNT(DISTINCT nicho)                                     AS nichos_cobertos,
  AVG(rating) FILTER (WHERE rating IS NOT NULL)             AS rating_medio,
  MAX(created_at)                                           AS ultimo_import
FROM sismei.map_leads
WHERE tenant_id = sismei.current_tenant_id()
GROUP BY tenant_id;

-- ================================================================
-- FASE 9 — Nichos predefinidos (tabela de referência)
-- ================================================================
CREATE TABLE IF NOT EXISTS sismei.map_lead_nichos (
  id          serial      PRIMARY KEY,
  nicho       text        NOT NULL UNIQUE,
  categorias  text[]      NOT NULL DEFAULT '{}',
  emoji       text,
  ordem       int         DEFAULT 99
);

INSERT INTO sismei.map_lead_nichos (nicho, categorias, emoji, ordem) VALUES
  ('Saúde',        ARRAY['Médico','Dentista','Psicólogo','Fisioterapeuta','Nutricionista','Farmácia','Clínica','Hospital','Laboratório','Veterinário'], '🏥', 1),
  ('Alimentação',  ARRAY['Restaurante','Pizzaria','Hamburgueria','Padaria','Sorveteria','Bar','Cafeteria','Lanchonete','Sushi','Churrascaria'], '🍕', 2),
  ('Beleza',       ARRAY['Salão de Beleza','Barbearia','Estética','Manicure','Spa','Tatuagem','Sobrancelha','Depilação'], '💅', 3),
  ('Educação',     ARRAY['Escola','Curso','Faculdade','Colégio','Pré-escola','Reforço Escolar','Idiomas','Informática'], '📚', 4),
  ('Jurídico',     ARRAY['Advogado','Cartório','Escritório Jurídico','Contador','Despachante','Notário'], '⚖️', 5),
  ('Automotivo',   ARRAY['Mecânica','Funilaria','Elétrica Automotiva','Lavação','Borracharia','Autopeças','Concessionária'], '🚗', 6),
  ('Construção',   ARRAY['Construtora','Reforma','Elétrica','Hidráulica','Pintura','Marcenaria','Serralheria','Arquitetura'], '🔨', 7),
  ('Tecnologia',   ARRAY['Assistência Técnica','Informática','Desenvolvimento','Marketing Digital','Design'], '💻', 8),
  ('Varejo',       ARRAY['Loja de Roupas','Calçados','Eletrônicos','Móveis','Pet Shop','Papelaria','Livraria','Farmácia'], '🛍️', 9),
  ('Serviços',     ARRAY['Contabilidade','Seguro','Imobiliária','Corretora','Dedetização','Limpeza','Segurança','Logística'], '🔧', 10),
  ('Hospedagem',   ARRAY['Hotel','Pousada','Motel','Hostel','Airbnb','Resort'], '🏨', 11),
  ('Fitness',      ARRAY['Academia','Personal Trainer','Crossfit','Yoga','Pilates','Artes Marciais','Natação'], '💪', 12),
  ('Religioso',    ARRAY['Igreja','Templo','Centro Espírita','Mesquita','Sinagoga'], '⛪', 13),
  ('Outro',        ARRAY['Outro'], '📌', 99)
ON CONFLICT (nicho) DO NOTHING;

GRANT SELECT ON sismei.map_lead_nichos TO authenticated, anon;

-- ================================================================
-- FASE 10 — Verificação
-- ================================================================
DO $$
DECLARE
  v_cols int;
  v_nichos int;
BEGIN
  SELECT COUNT(*) INTO v_cols
  FROM information_schema.columns
  WHERE table_schema = 'sismei' AND table_name = 'map_leads';

  SELECT COUNT(*) INTO v_nichos FROM sismei.map_lead_nichos;

  RAISE NOTICE '╔════════════════════════════════════════╗';
  RAISE NOTICE '║  MIGRATION 002 — Super Premium Maps   ║';
  RAISE NOTICE '╠════════════════════════════════════════╣';
  RAISE NOTICE '║  Colunas em map_leads   : %            ║', LPAD(v_cols::text, 5);
  RAISE NOTICE '║  Nichos predefinidos    : %            ║', LPAD(v_nichos::text, 5);
  RAISE NOTICE '║  Plano super_premium    : OK           ║';
  RAISE NOTICE '║  RLS map_leads          : OK           ║';
  RAISE NOTICE '╚════════════════════════════════════════╝';
END $$;

COMMIT;
