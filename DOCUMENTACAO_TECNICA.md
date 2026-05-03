# MEI Control Pro — Documentação Técnica

**Versão em produção:** `20260430a` | **Atualizado em:** 2026-04-30
**Repositório local:** `C:\Users\Rogério\mei-control-pro`
**Produção:** https://app.sismeipro.com.br

---

Este documento descreve a arquitetura completa, as decisões de implementação e os procedimentos operacionais do MEI Control Pro. É destinado a desenvolvedores que precisam dar manutenção, adicionar funcionalidades ou operar a infraestrutura do sistema.

O sistema é uma aplicação Next.js 14 (App Router) com Supabase self-hosted como banco e autenticação, Mercado Pago para pagamentos e n8n para automações de WhatsApp e e-mail. Todo o ambiente roda em Docker no EasyPanel, num servidor único em `167.88.39.16`.

**Pontos de atenção antes de mexer em qualquer coisa:** variáveis `NEXT_PUBLIC_*` são gravadas no binário em tempo de build — alterar no EasyPanel sem rebuildar a imagem não tem efeito. O schema `sismei` precisa estar em `PGRST_DB_SCHEMAS` no PostgREST ou todas as queries falham silenciosamente. O proxy `/api/proxy` existe exclusivamente para contornar CORS do Supabase self-hosted — não remover. A cada deploy do Supabase no EasyPanel, os templates GoTrue do `docker-compose.yml` podem ser sobrescritos — verificar sempre.

A documentação segue a versão em produção `20260430a`. Qualquer divergência entre o que está escrito aqui e o comportamento real do sistema deve ser tratada atualizando este documento após a correção no código.
**Docker Hub:** `rjsmarquesti/mei-control-pro`

---

## 1. Visão Geral e Stack

MEI Control Pro é um SaaS de gestão financeira para MEIs. Arquitetura Next.js 14 App Router com Supabase self-hosted como backend, pagamentos via Mercado Pago e automações via n8n.

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js (App Router) | 14.2.5 |
| Linguagem | TypeScript | 5.x |
| Estilo | TailwindCSS + CSS Variables | 3.4.7 |
| Componentes UI | Radix UI (instalado manualmente) | 1.1.x |
| Ícones | Lucide React | 0.417.0 |
| Gráficos | Recharts | 2.12.7 |
| Animações | Framer Motion | 11.3.2 |
| Estado global | Zustand + persist middleware | 4.5.4 |
| HTTP client | Axios | 1.7.2 |
| Tema dark/light | next-themes | 0.3.0 |
| Auth + DB | Supabase self-hosted | @supabase/supabase-js 2.101.1 |
| Pagamentos | Mercado Pago SDK | 2.12.0 |
| Deploy | Docker standalone | Node 20 Alpine |

---

## 2. Arquitetura

```
Browser
  │
  ├─ NEXT_PUBLIC_APP_URL (baked no build)
  │
  ▼
Next.js App (app.sismeipro.com.br)
  │
  ├─ /api/proxy/[...path]  ──────────────────► Supabase (db.divulgabr.com.br)
  │      ↑ contorna CORS do browser            Kong :8000 → PostgREST, GoTrue, Storage
  │
  ├─ /api/checkout          ──────────────────► Mercado Pago API
  ├─ /api/webhook/mercadopago ◄───────────────── Mercado Pago (notificação de pagamento)
  │
  ├─ /api/auth/login-notify  ──────────────────► n8n webhook (mei-login-alerta)
  ├─ /api/notifications/das-alert ◄────────────  n8n cron (dispara alertas DAS)
  ├─ /api/lifecycle/check   ◄──────────────────  n8n cron diário 8:30 BRT
  │
  └─ Supabase server-side (service role)  ──────► Supabase direto (sem proxy)

n8n (n8n.divulgabr.com.br)
  └─ Evolution API (api.divulgabr.com.br) ──────► WhatsApp (instância: sismei, número: 5521980485675)
```

### Proxy CORS — detalhe crítico

O Supabase self-hosted (`db.divulgabr.com.br`) bloqueia requisições diretas do browser (CORS).

**Solução (`lib/supabase.ts`):**
```typescript
const getSupabaseUrl = () => {
  if (typeof window !== 'undefined') return `${window.location.origin}/api/proxy`
  return process.env.NEXT_PUBLIC_SUPABASE_URL
}
export const supabase = createClient(getSupabaseUrl(), supabaseAnonKey)
```

O proxy (`app/api/proxy/[...path]/route.ts`) repassa a requisição server-side com as keys corretas.

---

## 3. Estrutura de Diretórios

```
mei-control-pro/
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── crm/contacts/route.ts     # CRM unificado usuários+leads
│   │   │   ├── crm/notes/route.ts        # Notas de interação CRM
│   │   │   ├── leads/route.ts            # CRUD leads
│   │   │   ├── leads/convert/route.ts    # Lead → usuário auth
│   │   │   ├── settings/route.ts         # system_settings (das_default_value etc)
│   │   │   ├── stats/route.ts            # Estatísticas gerais
│   │   │   ├── users/route.ts            # Listagem/atualização usuários
│   │   │   └── users/create/route.ts     # Criar usuário admin
│   │   ├── auth/
│   │   │   ├── login-notify/route.ts     # Fire-and-forget: WhatsApp pós-login
│   │   │   └── update-password/route.ts  # Reset senha (service role)
│   │   ├── checkout/route.ts             # Criação preferência Mercado Pago
│   │   ├── das/settings/route.ts         # Lê valor padrão DAS de system_settings
│   │   ├── leads/
│   │   │   ├── route.ts                  # Captura lead (upsert por email)
│   │   │   └── status/route.ts           # Verifica status email (user/lead/not found)
│   │   ├── lifecycle/
│   │   │   ├── check/route.ts            # Detecta 7 eventos de ciclo de vida
│   │   │   └── mark-notified/route.ts    # Marca evento como notificado
│   │   ├── me/
│   │   │   ├── plan/route.ts             # Retorna plano do usuário
│   │   │   └── role/route.ts             # Retorna role (admin|user)
│   │   ├── notifications/das-alert/route.ts  # Cron n8n → alertas DAS
│   │   ├── profiles/upsert/route.ts      # Criar/atualizar profile (bypassa RLS)
│   │   ├── proxy/[...path]/route.ts      # Proxy CORS para Supabase
│   │   ├── reports/
│   │   │   ├── annual-summary/route.ts   # Resumo anual financeiro
│   │   │   └── monthly-summary/route.ts  # Resumo mensal financeiro
│   │   ├── webhook/mercadopago/route.ts  # Webhook pagamento MP (HMAC)
│   │   └── whatsapp/
│   │       ├── faturamento/route.ts      # Bot WA: dados de faturamento
│   │       ├── limite/route.ts           # Bot WA: faturamento vs limite MEI
│   │       └── user-context/route.ts     # Bot WA: contexto do usuário
│   ├── admin/
│   │   ├── configuracoes/page.tsx        # system_settings (valor DAS global)
│   │   ├── crm/page.tsx                  # CRM unificado usuários + leads + notas
│   │   ├── leads/page.tsx                # Lista de leads com funil
│   │   ├── pagamentos/page.tsx           # Histórico de pagamentos
│   │   ├── usuarios/page.tsx             # Gerenciar usuários e planos
│   │   ├── page.tsx                      # Painel admin (stats gerais)
│   │   └── layout.tsx                    # Layout admin com sidebar
│   ├── dashboard/
│   │   ├── assinatura/page.tsx           # Planos + checkout MP
│   │   ├── categorias/page.tsx           # Gerenciar categorias (Basic+)
│   │   ├── das/page.tsx                  # DAS: extrato + encargos (Pro+)
│   │   ├── despesas/page.tsx             # Lançar/listar despesas
│   │   ├── financeiro/page.tsx           # Análise fluxo de caixa (Basic+)
│   │   ├── irpf/page.tsx                 # Declaração IRPF (Premium)
│   │   ├── onboarding/page.tsx           # Wizard 2-passos pós-cadastro
│   │   ├── perfil/page.tsx               # Perfil + empresa + senha
│   │   ├── receitas/page.tsx             # Lançar/listar receitas
│   │   ├── relatorios/page.tsx           # Relatório anual + PDF (Pro+)
│   │   ├── relatorios-avancados/page.tsx # KPIs e projeções (Pro+)
│   │   └── page.tsx                      # Dashboard principal
│   ├── captacao/page.tsx                 # Landing page de captação de leads
│   ├── email-confirmado/page.tsx         # Feedback pós-confirmação de email
│   ├── login/page.tsx                    # Login + cadastro (toggle por query ?cadastro=1)
│   ├── nova-senha/page.tsx               # Redefinir senha (via token hash)
│   ├── privacidade/page.tsx              # Política de Privacidade (LGPD)
│   ├── recuperar-senha/page.tsx          # Solicitar link de reset
│   ├── route.ts                          # GET / → serve public/landingpage-sismei.html
│   ├── termos/page.tsx                   # Termos de Uso (LGPD)
│   ├── globals.css                       # Variáveis CSS + reset Tailwind
│   └── layout.tsx                        # Root layout (ThemeProvider, CookieBanner)
├── components/
│   ├── dashboard/
│   │   ├── DASCard.tsx                   # Card próximo DAS
│   │   ├── DASOnboardingModal.tsx         # Modal inicial sem DAS registrado
│   │   ├── MetricCard.tsx                # Card de métrica com skeleton
│   │   ├── QuickActions.tsx              # Botões de ação rápida
│   │   └── TransactionsTable.tsx         # Tabela transações com edição inline
│   ├── layout/
│   │   ├── DashboardLayout.tsx           # Wrapper com Header + Sidebar + MobileNav
│   │   ├── Header.tsx                    # Barra topo: tema, busca, user menu
│   │   ├── MobileNav.tsx                 # Menu móvel (drawer)
│   │   └── Sidebar.tsx                   # Menu lateral desktop
│   ├── forms/
│   │   └── TransactionForm.tsx           # Formulário receita/despesa
│   ├── plan/
│   │   └── PlanGate.tsx                  # Wrapper de acesso por plano
│   └── ui/
│       ├── CookieBanner.tsx              # Aviso cookies (LGPD)
│       ├── PrintButton.tsx               # Botão impressão
│       └── PrintSection.tsx              # Wrapper de área imprimível
├── hooks/
│   ├── useAdmin.ts                       # Checa role admin + expõe token
│   ├── useAuth.ts                        # Sessão Supabase + redirect
│   ├── useDashboard.ts                   # Carrega métricas, transações, gráficos
│   ├── useNotifications.ts               # Sistema de notificações in-app
│   ├── usePlan.ts                        # Plano atual + hasAccess()
│   └── useSearch.ts                      # Busca global (Ctrl+K)
├── lib/
│   ├── admin-auth.ts                     # requireAdmin() → valida Bearer + role
│   ├── plans.ts                          # Hierarquia, ROUTE_PLAN, PLAN_CONFIGS
│   ├── supabase.ts                       # Client browser (via proxy)
│   ├── supabase-server.ts                # Client server-side (service role)
│   ├── tenant.ts                         # Multi-tenant helpers + upgradeTenantPlan
│   └── utils.ts                          # cn(), formatCurrency(), formatDate()
├── services/
│   └── finance.ts                        # financeService: getDashboard, CRUD transações
├── store/
│   └── useAppStore.ts                    # Zustand store (user, metrics, brandSettings)
├── public/
│   ├── landingpage-sismei.html           # Landing page servida em GET /
│   ├── manual.html                       # Manual do usuário
│   ├── email-confirmacao-cadastro.html   # Template GoTrue confirmação
│   ├── email-recuperar-senha.html        # Template GoTrue recuperação
│   ├── email-mudanca-plano.html          # Template n8n mudança plano
│   ├── email-aviso-sistema.html          # Template n8n aviso geral
│   ├── logo.webp                         # Logo principal
│   └── logo-horizontal.webp             # Logo horizontal
├── n8n-workflows/                        # JSON dos workflows n8n exportados
│   ├── mei-cadastro.json
│   ├── mei-extrato-anual.json
│   ├── mei-extrato-mensal.json
│   └── mei-login-alerta.json
├── supabase/migrations/                  # Migrations SQL aplicadas
├── Dockerfile                            # Multi-stage: deps → builder → runner
├── next.config.mjs                       # output: standalone, remote images
└── package.json                          # version: 0.1.0
```

---

## 4. Banco de Dados — Schema `sismei`

Supabase self-hosted em `db.divulgabr.com.br`. Todas as tabelas estão no schema `sismei`.

> **CRÍTICO:** `PGRST_DB_SCHEMAS=public,storage,graphql_public,sismei` deve estar nas variáveis do PostgREST no EasyPanel. Sem isso, todas as queries ao schema `sismei` retornam erro silenciosamente.

### Tabelas

#### `profiles`
```sql
id                      uuid PRIMARY KEY   -- FK auth.users.id
name                    text
email                   text
phone                   text
city                    text
company                 text               -- nome da empresa
cnpj                    text
activity                text               -- ramo de atividade
mei_since               text               -- data de abertura (YYYY-MM-DD)
role                    text               -- 'user' | 'admin'
status                  text               -- 'active' | 'blocked' | 'suspended'
subscription_plan       text               -- 'free' | 'basic' | 'pro' | 'premium' | 'super_premium'
subscription_expires_at timestamptz
das_multa_pct           numeric            -- % multa DAS (default 2.00)
das_juros_pct           numeric            -- % juros DAS mensal (default 1.00)
last_seen_at            timestamptz        -- último acesso
lifecycle_notified      jsonb              -- { tipo: iso_date_string }
updated_at              timestamptz
```
**RLS:** usuário lê/edita apenas o próprio. Operações admin usam service role (bypassa RLS).

#### `transactions`
```sql
id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY
user_id     uuid NOT NULL   -- FK profiles.id
type        text            -- 'revenue' | 'expense'
description text
category    text
value       numeric
date        date
status      text            -- 'completed' | 'pending' | 'cancelled'
created_at  timestamptz
updated_at  timestamptz
```
**RLS:** usuário vê apenas os próprios registros.

#### `das_payments`
```sql
id          uuid PRIMARY KEY
user_id     uuid            -- FK profiles.id
competencia text            -- 'YYYY-MM'
value       numeric
due_date    date
paid_at     timestamptz     -- NULL se não pago
status      text            -- 'pending' | 'paid' | 'overdue'
```

#### `leads`
```sql
id          uuid PRIMARY KEY
name        text
email       text
phone       text
city        text
status      text            -- 'novo' | 'contatado' | 'convertido' | 'perdido'
notes       text
created_at  timestamptz
```
> **Atenção:** `leads` **não** tem coluna `updated_at`. Não enviar esse campo em updates.

#### `system_settings`
```sql
key         text PRIMARY KEY  -- ex: 'das_default_value'
value       text              -- ex: '70.60'
label       text
updated_at  timestamptz
```
**RLS:** admin full access; usuários read-only.
Dado inicial: `das_default_value = '70.60'`

#### `crm_notes`
```sql
id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY
contact_id      uuid NOT NULL
contact_type    text NOT NULL DEFAULT 'lead'
content         text NOT NULL
interaction_type text NOT NULL DEFAULT 'note'
created_at      timestamptz NOT NULL DEFAULT now()
```

#### `tenants` (estrutura multi-tenant)
```sql
id                      uuid PRIMARY KEY
name, slug              text
owner_id                uuid       -- FK profiles.id
plan                    text       -- TenantPlan
status                  text       -- 'active' | 'suspended' | 'cancelled' | 'trial'
max_users               int
billing_email           text
billing_cycle           text       -- 'monthly' | 'yearly'
trial_ends_at           timestamptz
subscription_expires_at timestamptz
metadata                jsonb
created_at              timestamptz
```

#### `tenant_features`
```sql
id          bigint PRIMARY KEY
tenant_id   uuid    -- FK tenants.id
feature_key text    -- ver FEATURES enum em lib/tenant.ts
enabled     boolean
config      jsonb
```

#### `logs` (auditoria)
```sql
id          bigint PRIMARY KEY
tenant_id   uuid
user_id     uuid
action      text    -- 'payment_approved', 'user_created', etc.
resource    text
resource_id text
old_data    jsonb
new_data    jsonb
metadata    jsonb
created_at  timestamptz
```

### Migrations aplicadas

| Arquivo | Descrição |
|---------|-----------|
| `001_multi_tenant_setup.sql` | Setup core multi-tenant |
| `001_fix_policies.sql` | RLS policies |
| `001_validation.sql` | Constraints de validação |
| `002_super_premium_map_leads.sql` | Plano super_premium + tabela map_leads |
| `003_lifecycle_tracking.sql` | Campos last_seen_at + lifecycle_notified |
| `004_fix_transactions_categories.sql` | Fix categorização de transações |
| `005_das_settings.sql` | system_settings + das_multa_pct/juros_pct |

### Armadilha crítica — NULL no PostgreSQL
`.neq('campo', 'valor')` **não** retorna linhas onde o campo é NULL.
Use `.or('campo.eq.val,campo.is.null')` para incluir NULLs, ou `.in('campo', ['val1', 'val2'])` para filtros inclusivos.

---

## 5. API Routes

Todas as rotas são `force-dynamic`. Autenticação admin usa `requireAdmin()` de `lib/admin-auth.ts` (Bearer token + role='admin' na tabela profiles).

### Proxy

| Método | Rota | Descrição |
|--------|------|-----------|
| ALL | `/api/proxy/[...path]` | Proxy transparente browser → Supabase. Contorna CORS. |

### Autenticação

| Método | Rota | Auth | Params | Retorno |
|--------|------|------|--------|---------|
| POST | `/api/auth/login-notify` | Nenhuma | `{ userId }` | `{ ok: true }` |
| POST | `/api/auth/update-password` | Bearer (opcional) | `{ password, accessToken }` | `{ ok: true }` |

### Usuário

| Método | Rota | Auth | Retorno |
|--------|------|------|---------|
| POST | `/api/me/role` | Bearer | `{ role: 'admin' \| 'user' }` |
| POST | `/api/me/plan` | Bearer | `{ plan, expires_at }` |

### Perfil

| Método | Rota | Auth | Params | Retorno |
|--------|------|------|--------|---------|
| POST | `/api/profiles/upsert` | Service role | `{ id, name, email, phone, city }` | `{ ok: true }` |

### Leads

| Método | Rota | Auth | Params | Retorno |
|--------|------|------|--------|---------|
| POST | `/api/leads` | Nenhuma | `{ name, email, phone, city, status?, notes? }` | `{ ok: true }` |
| GET | `/api/leads/status` | Nenhuma | `?email=X` | `{ status, plan?, userId?, leadId? }` |

Valores de status: `'convertido'` | `'novo'` | `'contatado'` | `'perdido'` | `'nao_encontrado'`

### Checkout e Pagamento

| Método | Rota | Auth | Params | Retorno |
|--------|------|------|--------|---------|
| POST | `/api/checkout` | Bearer (requerido) | `{ plan, userEmail }` | `{ url: string }` |
| POST | `/api/webhook/mercadopago` | HMAC (x-signature) | Body MP | `{ ok: true }` |
| GET | `/api/webhook/mercadopago` | Nenhuma | — | `{ ok: true }` (handshake MP) |

**Planos válidos para checkout:**
`basic`, `pro`, `premium`, `basic_annual`, `pro_annual`, `premium_annual`

**Preços:**
```
basic:          R$ 19,90   (1 mês)
pro:            R$ 39,90   (1 mês)
premium:        R$ 59,90   (1 mês)
basic_annual:   R$ 191,04  (12 meses — 20% OFF)
pro_annual:     R$ 382,56  (12 meses — 20% OFF)
premium_annual: R$ 574,08  (12 meses — 20% OFF)
```

### DAS

| Método | Rota | Auth | Retorno |
|--------|------|------|---------|
| GET | `/api/das/settings` | Bearer | `{ das_default_value, das_multa_pct, das_juros_pct }` |

### Notificações e Lifecycle

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/notifications/das-alert` | Header `x-n8n-secret` | Disparado pelo n8n (cron diário às 9h) |
| POST | `/api/lifecycle/check` | Header `x-n8n-secret` | Detecta 7 eventos de ciclo de vida |
| PATCH | `/api/lifecycle/mark-notified` | Header `x-n8n-secret` | Marca evento como notificado em `lifecycle_notified` |

**Eventos detectados pelo lifecycle/check:**
1. `plano_expirando` — expira em ≤5 dias (notifica 1x a cada 4 dias)
2. `plano_expirado_d0` — expirou 0-1 dias atrás
3. `plano_expirado_d3` — expirou 2-4 dias atrás
4. `plano_expirado_d7` — expirou 5-8 dias atrás
5. `limite_mei` — faturamento ≥75% de R$ 81.000
6. `inativo` — sem acesso há ≥7 dias (notifica 1x a cada 14 dias)
7. `marco_30d` — 30 dias como cliente (1x por ano)

### Relatórios

| Método | Rota | Auth | Retorno |
|--------|------|------|---------|
| POST | `/api/reports/monthly-summary` | Bearer | Resumo mensal financeiro |
| POST | `/api/reports/annual-summary` | Bearer | Resumo anual + dados IRPF |

### WhatsApp (Bot)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET/POST | `/api/whatsapp/faturamento` | n8n | Dados de faturamento para o bot |
| GET | `/api/whatsapp/limite` | n8n | Faturamento vs limite MEI R$ 81k |
| GET | `/api/whatsapp/user-context` | n8n | Contexto completo do usuário para o bot |

### Admin

Todas as rotas `/api/admin/*` exigem header `Authorization: Bearer <token>` de usuário com `role='admin'`.

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/admin/stats` | Total usuários, ativos, leads, assinantes |
| GET | `/api/admin/users` | Lista usuários (auth.users + join profiles) |
| PATCH | `/api/admin/users` | Atualiza plano/status de usuário |
| DELETE | `/api/admin/users` | Remove do auth.users (invalida login) |
| POST | `/api/admin/users/create` | Cria usuário com senha |
| GET | `/api/admin/leads` | Lista leads (exceto status 'convertido') |
| PATCH | `/api/admin/leads` | Atualiza status/notes do lead |
| DELETE | `/api/admin/leads` | Remove lead |
| POST | `/api/admin/leads/convert` | Lead → auth user + profile + reset senha |
| GET/PATCH | `/api/admin/settings` | Lê/atualiza system_settings |
| GET | `/api/admin/crm/contacts` | Lista unificada usuários + leads |
| GET/POST/DELETE | `/api/admin/crm/notes` | CRUD notas de interação CRM |

---

## 6. Autenticação e Controle de Planos

### Fluxo de login
1. `supabase.auth.signInWithPassword()` → JWT retornado
2. Chama `/api/me/role` com Bearer token → verifica `profiles.role`
3. Se admin → redireciona `/admin`; se user → redireciona `/dashboard`
4. Fire-and-forget: `POST /api/auth/login-notify` (WhatsApp via n8n)

### Fluxo de cadastro
1. `supabase.auth.signUp()` com `emailRedirectTo: /email-confirmado`
2. `POST /api/profiles/upsert` (service role) — cria profile com `role='user'`, `status='active'`, `subscription_plan='free'`
3. `POST /api/leads` — captura como lead para CRM
4. `POST https://n8n.divulgabr.com.br/webhook/mei-cadastro` — boas-vindas WA + email
5. `POST https://n8n.divulgabr.com.br/webhook/mei-nutricao-trigger` — inicia sequência de nutrição
6. Redirect → `/dashboard/onboarding`

### Controle de planos

**`lib/plans.ts`**
```typescript
type Plan = 'free' | 'basic' | 'pro' | 'premium'

// Hierarquia: free(0) < basic(1) < pro(2) < premium(3)
const PLAN_LEVEL: Record<Plan, number>

// Plano mínimo por rota
const ROUTE_PLAN: Record<string, Plan>

hasAccess(userPlan, requiredPlan): boolean
// planos desconhecidos (ex: 'super_premium') recebem nível premium automaticamente
```

**`components/plan/PlanGate.tsx`**
```tsx
<PlanGate requiredPlan="pro">
  <ConteudoProtegido />
</PlanGate>
// Se userPlan < requiredPlan → exibe modal de upgrade
```

**`hooks/usePlan.ts`**
```typescript
const { plan, expiresAt, loading, can, hasAccess } = usePlan()
// can('/dashboard/das') → boolean
// hasAccess('pro') → boolean
```

### Limite free
20 lançamentos por mês (receitas + despesas). Verificado em `services/finance.ts → checkFreeMonthlyLimit()` antes de `createRevenue` e `createExpense`. Lança `Error` se ultrapassado.

### Recuperação de senha
`supabase.auth.updateUser()` falha via proxy CORS em Supabase self-hosted.
**Solução:** `POST /api/auth/update-password` recebe `{ password, accessToken }`, decodifica JWT localmente para obter `sub` (userId), chama `supabase.auth.admin.updateUserById(userId, { password })`.

---

## 7. Hooks Customizados

### `useAuth`
- Monitora `supabase.auth.onAuthStateChange()`
- Redireciona `/login` se sessão inválida
- Atualiza `useAppStore.setUser()` com dados do profile

### `usePlan`
- Chama `GET /api/me/plan` (Bearer token)
- Verifica `subscription_expires_at` vs data atual
- Expõe `can(route)` e `hasAccess(plan)`

### `useDashboard`
- Chama em paralelo: `financeService.getDashboard()`, `getTransactions()`, `getChartData()`, `getCategoryData()`
- Dependência do `refreshKey` do Zustand — incrementar `bumpRefresh()` força re-fetch
- Retorna skeleton enquanto `isLoading = true`

### `useAdmin`
- Chama `GET /api/me/role` e `supabase.auth.getSession()`
- Expõe `isAdmin: boolean` e `token: string` para `Authorization` header nas páginas admin
- Padrão `af` (adminFetch) nas páginas:
```typescript
const af = (url: string, init?: RequestInit) =>
  fetch(url, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${token ?? ''}` } })
```

---

## 8. State Management — Zustand

**`store/useAppStore.ts`** com `persist` (localStorage, apenas `brandSettings`):

```typescript
interface AppStore {
  user: UserProfile | null
  metrics: DashboardMetrics
  transactions: Transaction[]
  chartData: ChartData[]
  categoryData: CategoryData[]
  isLoading: boolean
  selectedPeriod: 'monthly' | 'yearly'
  refreshKey: number
  brandSettings: {
    primaryColor: string   // default '#7C3AED'
    companyName: string    // default 'MEI Control Pro'
    theme: 'dark' | 'light'
    typography: string
  }
  // Actions
  setUser, setMetrics, setTransactions, setChartData,
  setCategoryData, setLoading, setSelectedPeriod,
  bumpRefresh, setBrandSettings
}
```

---

## 9. Fluxo de Pagamento — Mercado Pago (end-to-end)

```
1. Usuário → /dashboard/assinatura → seleciona plano + período

2. Frontend:
   POST /api/checkout
   { plan: 'pro_annual', userEmail: 'user@email.com' }
   Authorization: Bearer <token>

3. checkout/route.ts:
   - Valida token → extrai userId
   - Busca planConfig em PLAN_PRICES
   - Cria Preference no MP SDK:
     {
       items: [{ id: plan, title, quantity: 1, unit_price, currency_id: 'BRL' }],
       payer: { email: userEmail },
       external_reference: `${userId}|${plan}`,
       back_urls: { success, failure, pending },
       auto_return: 'approved',
       notification_url: APP_URL + '/api/webhook/mercadopago',
       statement_descriptor: 'MEI CONTROL PRO',
     }
   - Retorna { url: result.init_point }

4. Frontend redireciona para init_point (página checkout MP)

5. Usuário paga (cartão/PIX/boleto)

6. MP envia POST /api/webhook/mercadopago:
   Headers: x-signature: "ts=xxx,v1=yyy", x-request-id: "zzz"
   Body: { type: "payment", data: { id: "payment_id" } }

7. webhook/route.ts:
   a. Valida HMAC: HMAC-SHA256(MP_WEBHOOK_SECRET, "id:{data.id};request-id:{x-request-id};ts:{ts}") == v1
   b. Se type != 'payment' → return ok (ignora outros eventos)
   c. Busca Payment pelo id via MP SDK
   d. Se payment.status != 'approved' → return ok (ignora pendente/recusado)
   e. Extrai userId + rawPlan de external_reference
   f. isAnnual = rawPlan.endsWith('_annual')
   g. plan = rawPlan.replace('_annual', '')
   h. expires = hoje + (isAnnual ? 365 : 30) dias
   i. upgradeTenantPlan(userId, plan, expires.toISOString())
      → UPDATE profiles SET subscription_plan=plan, subscription_expires_at=expires WHERE id=userId
   j. logAuditEvent(action: 'payment_approved', resource: 'subscription')
   k. return { ok: true }

8. Usuario volta para /dashboard/assinatura?status=success&plan=pro_annual
   - usePlan hook re-fetch → nova UI desbloqueada
```

---

## 10. Integrações n8n

**Base URL:** `https://n8n.divulgabr.com.br/webhook/`
**Evolution API:** `https://api.divulgabr.com.br` | Instância: `sismei` | Número: `5521980485675`

### Workflows

#### `mei-cadastro` (ID: LmrpBwHCCvzW7irr)
- **Trigger:** `POST /webhook/mei-cadastro`
- **Payload:** `{ name, email, phone, city }`
- **Ações:**
  1. Formatar dados (normaliza telefone → phoneWA)
  2. Se tem telefone → WhatsApp boas-vindas (instância sismei)
  3. WhatsApp admin (`5521980485675`)
  4. Email de boas-vindas (template dark)
  5. Email interno → `comercial@sismeipro.com.br`

#### `mei-atendimento-whatsapp` (ID: IrqKhzFzIMYV8zcc)
- **Trigger:** Evolution API → n8n (webhook path: `sismei-atendimento`)
- **Total de nós:** 19
- **Fluxo:**
  ```
  Webhook → Extrair → Validar → Adicionar Horário → Verificar Horário (IF isOpen)
    TRUE  → Detectar Intenção → Switch (7 outputs)
              0:menu      → Enviar menu completo
              1:suporte   → Resposta suporte + Notificar Admin (paralelo do Switch)
              2:planos    → Resposta planos
              3:das       → Link gov.br
              4:financeiro → sendText (não sendMedia — bug Evolution API)
              5:humano    → Resposta humano + Notificar Admin (paralelo do Switch)
              6:fallback  → Resposta padrão
    FALSE → [3 paralelos]:
              WA Fora do Horário (cliente)
              Admin WA Fora do Horário (5521980485675)
              Email Fora do Horário (suporte@sismeipro.com.br)
  ```
- **Horário:** Seg-Sex 9h-18h (BRT)
- **Detecção de intenção:** regex `(^|\s)word(\s|$)` para números 1-5
- **CRÍTICO:** `Notificar Admin Suporte` (case:1) e `Notificar Admin Humano` (case:5) conectados **diretamente do Switch** (paralelo) — NÃO encadeados após os HTTP nodes de resposta. Se encadeados, `$json` vira a resposta da Evolution API e perde os dados do cliente.

#### `mei-das-alerta` (ID: IcS1sFHcdRyvZUoz)
- **Trigger:** `POST /api/notifications/das-alert` (n8n cron às 9h)
- Filtra usuários planos pro/premium com DAS vencendo em 15, 7 ou 1 dia
- Envia WhatsApp e email de alerta

#### `mei-lifecycle` — Endpoint: `POST /api/lifecycle/check`
- Chamado pelo n8n às 8:30 BRT
- Header obrigatório: `x-n8n-secret`
- Detecta 7 eventos, marca em `profiles.lifecycle_notified` via `PATCH /api/lifecycle/mark-notified`

#### `Login Alerta` (ID: 7JTns8L1rAD12s6n)
- **Status:** ⚠️ Webhook OK mas instância WA `sismei` pode estar desconectada — reconectar via QR Code no painel Evolution se necessário

#### Relatório Mensal (ID: fZpE0SYwlm9yrA84) e Anual (ID: ENeDLUbluhKpVMee)
- Schedules automáticos
- Chamam `/api/reports/monthly-summary` e `/api/reports/annual-summary`

### SMTP n8n
- **Credencial ID:** `f0odLFtQ36i26f5L` (nome: "SMTP Sismei Pro")
- **Host:** smtp.hostinger.com:587
- **User:** suporte@sismeipro.com.br

### Armadilha n8n — perda de `$json`
Ao encadear após um nó `HTTP Request`, `$json` passa a ser o response body da requisição HTTP, não mais os dados originais. Para enviar notificações admin **com dados do cliente**, conectar o nó de notificação **diretamente ao Switch/IF** em paralelo com a resposta ao cliente.

---

## 11. Infraestrutura

### EasyPanel (producao)

| Serviço | Descrição | Arquivo config |
|---------|-----------|---------------|
| `producao_app` | Next.js (Swarm mode) | `/etc/easypanel/projects/producao/app/service.json` |
| `producao_supabase` | Supabase compose | `/etc/easypanel/projects/producao/supabase/code/supabase/code/docker-compose.yml` |
| `producao_n8n` | n8n | EasyPanel UI |
| `empresa_sismeipro` | nginx:alpine redirect | `sismeipro.com.br → app.sismeipro.com.br` |

**IP do servidor:** `167.88.39.16`
**Acesso SSH:** `ssh -i ~/.ssh/id_ed25519 root@167.88.39.16`

### Docker

**Build local:**
```bash
docker build --no-cache \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://db.divulgabr.com.br \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key> \
  --build-arg NEXT_PUBLIC_APP_URL=https://app.sismeipro.com.br \
  -t rjsmarquesti/mei-control-pro:<tag> .
```

**Verificar env baked no checkout:**
```bash
docker run --rm --entrypoint sh rjsmarquesti/mei-control-pro:<tag> \
  -c "grep -o 'app\.[a-z]*\.com\.br' /app/.next/server/app/api/checkout/route.js"
```

**Push:**
```bash
docker push rjsmarquesti/mei-control-pro:<tag>
```

**Deploy no servidor:**
```bash
docker pull rjsmarquesti/mei-control-pro:<tag>
docker service update --image rjsmarquesti/mei-control-pro:<tag> producao_app
```

**Confirmar:**
```bash
docker ps --format 'table {{.Names}}\t{{.Image}}' | grep app
```

**Convenção de tags:** `YYYYMMDD` + letra (`a`, `b`, ... `z`) — ex: `20260430a`

### Supabase self-hosted

**CRÍTICO — docker-compose.yml:** Os seguintes valores devem estar **hardcoded** (não como `${VAR}`) no serviço `auth`:
```yaml
GOTRUE_SITE_URL: https://app.sismeipro.com.br
GOTRUE_MAILER_TEMPLATES_CONFIRMATION: https://app.sismeipro.com.br/email-confirmacao-cadastro.html
GOTRUE_MAILER_TEMPLATES_RECOVERY: https://app.sismeipro.com.br/email-recuperar-senha.html
```

A cada deploy do Supabase no EasyPanel, essas linhas podem ser sobrescritas. Verificar com:
```bash
docker exec producao_supabase-auth-1 env | grep GOTRUE_SITE_URL
docker exec producao_supabase-auth-1 env | grep GOTRUE_MAILER_TEMPLATES
```

Se sumirem:
```bash
cd /etc/easypanel/projects/producao/supabase/code/supabase/code
docker compose -p producao_supabase up -d --force-recreate auth
```

**Backup do banco:**
```bash
docker exec producao_supabase-db-1 pg_dump -U supabase_admin -n sismei \
  --no-owner --no-acl -F c -f /tmp/backup.dump
docker cp producao_supabase-db-1:/tmp/backup.dump /root/backups/backup_$(date +%Y%m%d).dump
```

---

## 12. Variáveis de Ambiente

### App (EasyPanel → producao → app)

| Variável | Tipo | Descrição |
|----------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Build arg + runtime | URL do Supabase: `https://db.divulgabr.com.br` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Build arg + runtime | Chave anon do Supabase (JWT) |
| `NEXT_PUBLIC_APP_URL` | **Build arg (baked)** | `https://app.sismeipro.com.br` — CRÍTICO: usado no checkout |
| `SUPABASE_SERVICE_ROLE_KEY` | Runtime only | Chave service role (bypassa RLS) — nunca expor ao browser |
| `MERCADOPAGO_ACCESS_TOKEN` | Runtime only | Token de produção MP |
| `MERCADOPAGO_WEBHOOK_SECRET` | Runtime only | Secret para validar assinatura HMAC do webhook MP |

> `NEXT_PUBLIC_*` são baked no build. Alterar esses valores exige rebuild da imagem. Valores em `service.json` (runtime) não afetam variáveis baked.

### Supabase (EasyPanel → producao → supabase)

| Variável | Descrição |
|----------|-----------|
| `POSTGRES_PASSWORD` | Senha do PostgreSQL |
| `JWT_SECRET` | Secret para assinar JWTs |
| `ANON_KEY` | Chave anon (mesma que NEXT_PUBLIC_SUPABASE_ANON_KEY) |
| `SERVICE_ROLE_KEY` | Chave service role |
| `API_EXTERNAL_URL` | `https://db.divulgabr.com.br` |
| `GOTRUE_SITE_URL` | `https://app.sismeipro.com.br` |
| `GOTRUE_URI_ALLOW_LIST` | `https://app.sismeipro.com.br/**,...` |
| `ADDITIONAL_REDIRECT_URLS` | `https://app.sismeipro.com.br/nova-senha` |
| `SMTP_HOST` / `SMTP_PORT` | `smtp.hostinger.com` / `587` |
| `SMTP_USER` | `suporte@sismeipro.com.br` |
| `ENABLE_EMAIL_AUTOCONFIRM` | `false` |
| `PGRST_DB_SCHEMAS` | `public,storage,graphql_public,sismei` |

---

## 13. Deploy — Passo a Passo

1. **Certifique-se que o código está correto** (sem erros TypeScript)
2. **Build da imagem** com os build args corretos (especialmente `NEXT_PUBLIC_APP_URL`)
3. **Verifique o env baked** no checkout (grep no JS compilado)
4. **Push para Docker Hub**
5. **Atualize `service.json`** no servidor (campo `source.image`)
6. **Deploy no Swarm** via `docker service update`
7. **Confirme** que o container rodando tem a nova tag

Scripts de verificação úteis:
```bash
# Confirmar tag em produção
docker ps --format '{{.Names}}\t{{.Image}}' | grep app

# Ver log do container
docker service logs producao_app --tail 50

# Listar todas as tags da imagem no servidor
docker images rjsmarquesti/mei-control-pro --format 'table {{.Tag}}\t{{.CreatedAt}}'
```

---

## 14. Padrões de Código e Convenções

1. **API routes:** sempre `export const dynamic = 'force-dynamic'` + service role client
2. **Leituras de plano/role:** sempre via API route (nunca Supabase direto do client — RLS bloqueia)
3. **CORS:** toda chamada Supabase do browser passa pelo proxy `/api/proxy`
4. **TypeScript Set iteration:** usar `Array.from(new Set(...))` — não `[...new Set(...)]`
5. **DAS:** app NUNCA processa pagamentos — apenas registra/acompanha
6. **Export PDF:** usar `window.print()` — sem biblioteca externa
7. **n8n sendMedia:** não funciona com URL externa na Evolution API — usar `sendText`
8. **String vazia em JSX (avatar):** usar `||` não `??`: `((u.name || u.email || '?')[0] ?? '?').toUpperCase()`
9. **Campos de texto no banco:** normalizar strings vazias para `null` nas API routes: `name: name || null`
10. **motion.* em tabelas:** nunca usar `motion.tr`, `motion.td`, `motion.tbody` — causa hydration mismatch. Usar `<tr>` simples com classes Tailwind
11. **Inner components:** nunca definir componentes dentro de outros componentes React — React recria o tipo a cada render causando unmount/crash. Mover para module-level
12. **Plan access:** sempre usar `PlanGate` ou `usePlan` — nunca verificar plano manualmente nas páginas
13. **Admin fetch:** sempre usar o padrão `af` com `Authorization: Bearer ${token}` em páginas admin

---

## 15. Problemas Conhecidos e Soluções

### CORS — Supabase self-hosted
**Problema:** Browser não pode chamar `db.divulgabr.com.br` diretamente.
**Solução:** `lib/supabase.ts` detecta `typeof window !== 'undefined'` e usa o proxy `/api/proxy`.

### PGRST_DB_SCHEMAS — Schema sismei não encontrado
**Sintoma:** Admin não redireciona para `/admin` (role retorna `'user'` pelo catch). Todas as queries ao schema `sismei` falham silenciosamente.
**Causa:** `PGRST_DB_SCHEMAS` no PostgREST não inclui `sismei`.
**Solução:** Definir `PGRST_DB_SCHEMAS=public,storage,graphql_public,sismei` **apenas** na seção `# API - PostgREST` do Supabase. Não duplicar no `.env`.

### NEXT_PUBLIC_* baked no build
**Problema:** Alterar `NEXT_PUBLIC_APP_URL` no EasyPanel (runtime env) não afeta o JS compilado.
**Causa:** `NEXT_PUBLIC_*` são substituídos pelo Next.js em tempo de build, não de execução.
**Solução:** Sempre passar como `--build-arg` no `docker build`. Verificar o valor baked com grep no JS compilado antes do push.

### GoTrue templates sobrescritos no deploy do Supabase
**Sintoma:** Emails de confirmação/recuperação de senha param de funcionar ou apontam para URL errada.
**Causa:** O EasyPanel pode sobrescrever o `docker-compose.yml` do Supabase em deploys.
**Solução:** Hardcodar os valores no YAML (não usar `${VAR}`). Verificar após cada deploy do Supabase.

### NULL no PostgreSQL com `.neq()`
**Problema:** `.neq('status', 'convertido')` não retorna leads com `status = NULL`.
**Solução:** `.or('status.eq.novo,status.is.null')` ou `.in('status', ['novo', 'contatado'])`.

### `supabase.auth.updateUser()` via proxy
**Problema:** Falha com CORS em Supabase self-hosted quando chamado do client.
**Solução:** API route `/api/auth/update-password` usa `admin.updateUserById()` via service role server-side.

### Build com cache do Docker
**Sintoma:** `CACHED [builder 4/5] COPY . .` (tempo < 1s) — o código novo não entrou na imagem.
**Solução:** `docker build --no-cache ...`

---

## 16. Design System

### Cores (CSS Variables — `app/globals.css`)

```css
/* Dark (default) */
--background:       230 35% 6%    /* #0A0A14 */
--surface:          230 30% 9%
--surface-elevated: 230 25% 12%
--border:           230 20% 16%
--primary:          #7C3AED

/* Light */
--background: 230 25% 97%
--surface:    0 0% 100%
```

### Cores dos planos
- Gratuito: `#6B7280`
- Basic: `#06B6D4`
- Pro: `#7C3AED`
- Premium: `#F59E0B`

### Email templates — padrão visual
- Fundo: `#0b0b18` | Header gradiente: `#1e0840 → #0d1b3e`
- Barra: `linear-gradient(90deg, #7C3AED, #06B6D4)`
- Body: `#12121f` | Botão: `linear-gradient(135deg, #7C3AED, #4F46E5)`
- Logo: `https://app.sismeipro.com.br/logo.webp`

### Sintaxe de templates de email
- **GoTrue** (confirmação/recuperação): `{{ .ConfirmationURL }}` (sintaxe Go)
- **n8n** (outros): `{{nome}}`, `{{email}}` (sem ponto)

---

## 17. Informações do Sistema

| Item | Valor |
|------|-------|
| Domínio app | app.sismeipro.com.br |
| Supabase | db.divulgabr.com.br |
| n8n | n8n.divulgabr.com.br |
| Evolution API | api.divulgabr.com.br |
| Instância WhatsApp | sismei (número: 5521980485675) |
| Admin | suporte@sismeipro.com.br |
| Comercial | comercial@sismeipro.com.br |
| CNPJ | 50.406.025/0001-68 |
| Docker Hub user | rjsmarquesti |
| Servidor IP | 167.88.39.16 |

---

## 18. Roadmap

| Feature | Status | Observações |
|---------|--------|-------------|
| IRPF Anual completo | Em desenvolvimento | Tela existe, lógica pendente |
| Multi-CNPJ | Planejado | PLAN_LIMITS já define maxCnpj por plano |
| Aplicativo Mobile | Planejado | React Native com mesmo backend |
| Integrações bancárias | Planejado | Sincronização automática de extrato |
| API pública | Planejado | FEATURES.API_ACCESS já mapeado em tenant.ts |
| IA/Insights | Futuro | Recomendações baseadas no histórico |
| WhatsApp Bot avançado | Parcial | Bot básico ativo, endpoints /api/whatsapp/* prontos |
