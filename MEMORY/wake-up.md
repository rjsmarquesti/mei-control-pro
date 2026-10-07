# Wake-Up — MEI Control Pro

> Claude: leia este arquivo no início de cada sessão antes de qualquer ação.

**Última sessão:** 2026-10-06
**Último deploy:** 2026-09-30 — tag `20260930c-v1.5.2` (confirmada em `producao/app` no EasyPanel em 06/10/2026)

---

## Estado Atual

### Arquitetura
- Monolito Next.js 14 (`^14.2.35`): frontend em `app/`, backend em 58 rotas `app/api/*`. Não existe backend separado.
- Banco: Postgres próprio (`producao/sismei-db`) via Prisma (`prisma/schema.prisma`, 15 models, migrations `init` e `add_trial_started_at`). Supabase foi removido por completo (stack `producao/supabase` destruído em 30/09/2026).
- Auth própria: bcryptjs + JWT de acesso (15 min) + refresh de 7 dias com `jti` revogável em `refresh_tokens`. Tokens no `localStorage` (`lib/session.ts`). Role admin conferida no banco a cada request (`lib/admin-auth.ts`).
- Isolamento multi-usuário: filtro explícito `userId` em toda rota de usuário (não há RLS).
- Rotas do n8n protegidas por header `x-n8n-secret`; webhook do Mercado Pago valida HMAC.
- Rate limit em memória no `middleware.ts` (instância única, aceito).

### O que está funcionando
- Planos: free (100 lançamentos/mês), basic, pro, premium, super_premium
- Módulos: dashboard, receitas/despesas, DAS, IRPF, relatórios avançados, CRM admin
- n8n workflows: mei-cadastro, mei-atendimento-whatsapp, mei-das-alerta, mei-lifecycle, relatórios mensais/anuais
- PWA instalável (manifest + ícones); landing (`/`) é HTML estático servido por `app/route.ts`
- WA `sismei` reconectada (verificado 21/06/2026) e backup automático diário (cron 02:00 UTC) — não reconfirmados desde então

### Em andamento
— (aguardando próxima feature)

### Issues abertas (revisão de código 06/10/2026)
- 🟢 `notifications/register`, `leads` e `auth/login-notify` endurecidos em 06/10/2026 (**corrigido no código, NÃO commitado/buildado/deployado**): register e login-notify exigem Bearer e usam os dados do dono do token (register só até 10 min após o cadastro); leads continua público mas força `status:'novo'` na criação, não altera status/notes de lead existente e valida e-mail/tamanhos; rate limit no `middleware.ts` (`/api/leads` 10/min, `/api/notifications/register` 5/min). `npm test` = 22 testes (`__tests__/`). `login/page.tsx` envia o token nas 2 chamadas. Efeito conhecido: cliente PWA antigo (JS em cache) leva 401 nessas 2 chamadas — só perde o aviso de WhatsApp.
- 🟡 MFA admin não existe na auth própria — **não ativar** `ADMIN_MFA_REQUIRED=true` (bloquearia todos os admins)
- 🟡 `Dockerfile` sem `HEALTHCHECK` e sem `prisma migrate deploy` no deploy (migrations são manuais)
- 🟡 Projeto sem testes automatizados
- Sobras do Supabase a limpar (com confirmação): `supabase/`, script `migrate:supabase`, `scripts/migrate-from-supabase.ts`, dependência `pg`, `services/api.ts` (axios sem uso), `*.supabase.co` em `next.config.mjs`, chaves antigas em `.env.local`/`.env.production`
- Bug histórico: build local precisa de `--build-arg NEXT_PUBLIC_APP_URL=https://app.sismeipro.com.br` explícito (Next.js inlina vars `NEXT_PUBLIC_*`)
- Bug histórico: editar package.json via PowerShell → usar `[System.IO.File]::WriteAllText` (evita BOM UTF-8)

---

## Contexto Crítico

- **Docker:** `rjsmarquesti/mei-control-pro:20260930c-v1.5.2` → EasyPanel: producao → app → Implantar
- **Banco:** `producao/sismei-db` (Postgres); `DATABASE_URL`, `JWT_SECRET` e `REFRESH_SECRET` são obrigatórios no env do `producao/app`
- **Evolution API:** instância `sismei` (NÃO alterar o nome)
- **Nome do produto:** MEI Control Pro (NUNCA "SisMEI" ou "Sismei")
- **Tags Docker:** formato `YYYYMMDD[letra]-v[semver]`, `--no-cache` obrigatório, passar `--build-arg` para vars `NEXT_PUBLIC_*`
- **PWA:** qualquer tag `<head>` nova (meta, PWA, analytics) precisa ir nos DOIS lugares: `app/layout.tsx` e `public/landingpage-sismei.html`
- **Prisma + Alpine:** `openssl` precisa estar instalado nos estágios `deps` e `runner` do Dockerfile (AP-042)
- **Git:** o código da migração Supabase→Prisma foi commitado só em 06/10/2026 (esteve 100% fora do git desde 30/09)

---

## Próximos Passos

Veja `MEMORY/inbox.md`.
