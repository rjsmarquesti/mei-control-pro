-- Tabelas-espelho da estrutura REAL do Supabase antigo (confirmada via pg_dump --schema-only
-- em 30/09/2026), criadas na base NOVA como staging temporário. Depois do pg_dump|psql
-- (rodado pelo usuário via SSH), a transformação roda em legacy-transform.sql e as
-- schemas `auth`/`sismei` são apagadas.

DROP SCHEMA IF EXISTS auth CASCADE;
DROP SCHEMA IF EXISTS sismei CASCADE;

CREATE SCHEMA auth;
CREATE TABLE auth.users (
  instance_id uuid, id uuid PRIMARY KEY, aud varchar(255), role varchar(255), email varchar(255),
  encrypted_password varchar(255), email_confirmed_at timestamptz, invited_at timestamptz,
  confirmation_token varchar(255), confirmation_sent_at timestamptz, recovery_token varchar(255),
  recovery_sent_at timestamptz, email_change_token_new varchar(255), email_change varchar(255),
  email_change_sent_at timestamptz, last_sign_in_at timestamptz, raw_app_meta_data jsonb,
  raw_user_meta_data jsonb, is_super_admin boolean, created_at timestamptz, updated_at timestamptz,
  phone text, phone_confirmed_at timestamptz, phone_change text, phone_change_token varchar(255),
  phone_change_sent_at timestamptz, email_change_token_current varchar(255),
  email_change_confirm_status smallint, banned_until timestamptz, reauthentication_token varchar(255),
  reauthentication_sent_at timestamptz, is_sso_user boolean, deleted_at timestamptz, is_anonymous boolean
);

CREATE SCHEMA sismei;

CREATE TABLE sismei.profiles (
  id uuid PRIMARY KEY, name text, email text, phone text, cnpj text, company text, activity text,
  city text, mei_since text, updated_at timestamptz, role text, status text, subscription_plan text,
  subscription_expires_at timestamptz, notes text, tenant_id uuid, last_seen_at timestamptz,
  lifecycle_notified jsonb, das_multa_pct numeric(5,2), das_juros_pct numeric(5,2),
  is_trial boolean, trial_started_at timestamptz, trial_activated_at timestamptz
);

CREATE TABLE sismei.transactions (
  id bigint PRIMARY KEY, user_id uuid, type text, description text, category text,
  value numeric(10,2), date date, status text, created_at timestamptz, tenant_id uuid
);

CREATE TABLE sismei.categories (
  id uuid PRIMARY KEY, user_id uuid, tenant_id uuid, name text, type text, color text, created_at timestamptz
);

CREATE TABLE sismei.das_payments (
  id bigint PRIMARY KEY, user_id uuid, value numeric(10,2), due_date date, status text,
  created_at timestamptz, paid_at timestamptz, competencia text, tenant_id uuid
);

CREATE TABLE sismei.leads (
  id uuid PRIMARY KEY, name text, email text, phone text, city text, status text,
  notes text, created_at timestamptz, updated_at timestamptz, tenant_id uuid
);

CREATE TABLE sismei.map_leads (
  id uuid PRIMARY KEY, tenant_id uuid, user_id uuid, business_name text, phone text, phone2 text,
  email text, website text, rating numeric(2,1), reviews_count int, google_maps_url text,
  place_id text, estado text, municipio text, cidade text, bairro text, cep text,
  logradouro text, numero text, complemento text, latitude numeric(10,8), longitude numeric(11,8),
  nicho text, categoria text, subcategoria text, tags text[], status text, priority text,
  notes text, ultimo_contato timestamptz, proximo_contato timestamptz, fonte text,
  created_at timestamptz, updated_at timestamptz
);

CREATE TABLE sismei.system_settings (
  key text PRIMARY KEY, value text, label text, updated_at timestamptz
);

CREATE TABLE sismei.crm_notes (
  id bigint PRIMARY KEY, contact_id uuid, contact_type text, content text,
  interaction_type text, created_at timestamptz
);

CREATE TABLE sismei.map_lead_nichos (
  id int PRIMARY KEY, nicho text, categorias text[], emoji text, ordem int
);

CREATE TABLE sismei.consents (
  id uuid PRIMARY KEY, user_id uuid, terms_version text, privacy_version text,
  ip text, user_agent text, accepted_at timestamptz
);

CREATE TABLE sismei.audit_logs (
  id uuid PRIMARY KEY, user_id uuid, action text, entity_type text, entity_id text,
  before_data jsonb, after_data jsonb, ip text, user_agent text, created_at timestamptz
);

CREATE TABLE sismei.lgpd_requests (
  id uuid PRIMARY KEY, user_id uuid, type text, status text, requested_at timestamptz,
  completed_at timestamptz, notes text
);

CREATE TABLE sismei.activations (
  id uuid PRIMARY KEY, email text, activated_at timestamptz, last_verified_at timestamptz,
  revoked boolean, revoked_at timestamptz, revoke_reason text
);
