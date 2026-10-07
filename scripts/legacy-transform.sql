-- Transforma os dados do staging (schemas auth/sismei, estrutura antiga do Supabase)
-- para as tabelas Prisma reais (schema public). Roda uma vez, depois dropa o staging.

INSERT INTO public.users (
  id, email, password_hash, name, phone, city, company, cnpj, activity, mei_since,
  role, status, subscription_plan, subscription_expires_at, das_multa_pct, das_juros_pct,
  last_seen_at, lifecycle_notified, is_trial, trial_activated_at, email_confirmed_at,
  created_at, updated_at
)
SELECT
  u.id, u.email, u.encrypted_password, p.name, p.phone, p.city, p.company, p.cnpj, p.activity, p.mei_since,
  COALESCE(p.role, 'user'), COALESCE(p.status, 'active'), COALESCE(p.subscription_plan, 'free'),
  p.subscription_expires_at, COALESCE(p.das_multa_pct, 2.00), COALESCE(p.das_juros_pct, 1.00),
  p.last_seen_at, COALESCE(p.lifecycle_notified, '{}'::jsonb), COALESCE(p.is_trial, false),
  p.trial_activated_at, u.email_confirmed_at, COALESCE(u.created_at, now()), COALESCE(p.updated_at, now())
FROM auth.users u
LEFT JOIN sismei.profiles p ON p.id = u.id
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.transactions (id, user_id, type, description, category, value, date, status, created_at)
SELECT id, user_id, type, description, category, value, date, status, created_at
FROM sismei.transactions
WHERE user_id IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, user_id, name, type, color, created_at)
SELECT id, user_id, name, type, color, created_at
FROM sismei.categories
WHERE user_id IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.das_payments (id, user_id, value, due_date, status, competencia, paid_at, created_at)
SELECT id, user_id, value, due_date, status, competencia, paid_at, created_at
FROM sismei.das_payments
WHERE user_id IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.system_settings (key, value, label, updated_at)
SELECT key, value, label, COALESCE(updated_at, now())
FROM sismei.system_settings
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.leads (id, name, email, phone, city, status, notes, created_at, updated_at)
SELECT id, name, email, phone, city, status, notes, created_at, COALESCE(updated_at, created_at)
FROM sismei.leads
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.crm_notes (id, contact_id, contact_type, content, interaction_type, created_at)
SELECT id, contact_id, contact_type, content, interaction_type, created_at
FROM sismei.crm_notes
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.map_lead_nichos (id, nicho, categorias, emoji, ordem)
SELECT id, nicho, categorias, emoji, ordem
FROM sismei.map_lead_nichos
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.map_leads (
  id, user_id, business_name, phone, phone2, email, website, rating, reviews_count,
  google_maps_url, place_id, estado, municipio, cidade, bairro, cep, logradouro, numero,
  complemento, latitude, longitude, nicho, categoria, subcategoria, tags, status, priority,
  notes, ultimo_contato, proximo_contato, fonte, created_at, updated_at
)
SELECT
  id, user_id, business_name, phone, phone2, email, website, rating, reviews_count,
  google_maps_url, place_id, estado, municipio, cidade, bairro, cep, logradouro, numero,
  complemento, latitude, longitude, nicho, categoria, subcategoria, tags, status, priority,
  notes, ultimo_contato, proximo_contato, fonte, created_at, updated_at
FROM sismei.map_leads
WHERE user_id IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.consents (id, user_id, terms_version, privacy_version, ip, user_agent, accepted_at)
SELECT id, user_id, terms_version, privacy_version, ip, user_agent, accepted_at
FROM sismei.consents
WHERE user_id IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.audit_logs (id, user_id, action, entity_type, entity_id, before_data, after_data, ip, user_agent, created_at)
SELECT id, user_id, action, entity_type, entity_id, before_data, after_data, ip, user_agent, created_at
FROM sismei.audit_logs
WHERE user_id IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lgpd_requests (id, user_id, type, status, requested_at, completed_at, notes)
SELECT id, user_id, type, status, requested_at, completed_at, notes
FROM sismei.lgpd_requests
WHERE user_id IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.activations (id, email, activated_at, last_verified_at, revoked, revoked_at, revoke_reason)
SELECT id, email, activated_at, last_verified_at, revoked, revoked_at, revoke_reason
FROM sismei.activations
ON CONFLICT (id) DO NOTHING;

-- Limpeza: remove a área de staging (schemas com estrutura antiga)
DROP SCHEMA auth CASCADE;
DROP SCHEMA sismei CASCADE;
