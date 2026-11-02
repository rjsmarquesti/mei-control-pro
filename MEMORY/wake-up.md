# Wake-Up — MEI Control Pro

> Claude: leia este arquivo no início de cada sessão antes de qualquer ação.

**Última sessão:** 2026-11-02
**Último deploy:** 2026-11-02 — tag `20261101a-v1.5.6` (digest `sha256:d999ce55…`, `producao/app`; `/`, `/login`, `/captacao`, `/api/mei-config`, `/api/das/settings` 200, CSP presente, `/api/leads/status` sem segredo 401). Rollback: `20261025a-v1.5.5`. Commits `08d1eb2` + `58ea106`.

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
- PWA instalável: manifest com `id`, ícones any/maskable e atalhos; `InstallPrompt` (Android `beforeinstallprompt`, iOS instrução manual, dispensa 14 dias) só aparece dentro do `/dashboard`, mobile (`lg:hidden`); landing (`/`) é HTML estático servido por `app/route.ts`
- WA `sismei` reconectada (verificado 21/06/2026) e backup automático diário (cron 02:00 UTC) — não reconfirmados desde então

### Em andamento
- Teste do PWA em Android real (Chrome): login → `/dashboard` → aviso "Instalar" → instalar → abrir pelo ícone → atalhos. Motivo: alternativa à Play Store (app nativo suspenso). Ainda NÃO testado no navegador/aparelho.

### Issues abertas (revisão de código 06/10/2026)
- 🟢 `notifications/register`, `leads` e `auth/login-notify` endurecidos (commit `d31a77b`, **deployado em 07/10/2026 na `v1.5.3`**, verificado em produção por sondas sem escrita; golden path no navegador ainda NÃO testado): register e login-notify exigem Bearer e usam os dados do dono do token (register só até 10 min após o cadastro); leads continua público mas força `status:'novo'` na criação, não altera status/notes de lead existente e valida e-mail/tamanhos; rate limit no `middleware.ts` (`/api/leads` 10/min, `/api/notifications/register` 5/min). `npm test` = 22 testes (`__tests__/`). `login/page.tsx` envia o token nas 2 chamadas. Efeito conhecido: cliente PWA antigo (JS em cache) leva 401 nessas 2 chamadas — só perde o aviso de WhatsApp.
- 🟡 MFA admin não existe na auth própria — **não ativar** `ADMIN_MFA_REQUIRED=true` (bloquearia todos os admins)
- 🟡 `Dockerfile` sem `prisma migrate deploy` no deploy (migrations são manuais, decisão consciente: imagem standalone não tem o CLI). `HEALTHCHECK` adicionado na v1.5.6 (wget em `/api/mei-config`).
- ✅ Sobras do Supabase removidas na v1.5.6 (`supabase/`, script de migração, `pg`, `services/api.ts`, `*.supabase.co`). Sobram: dep `axios` sem uso e chaves antigas em `.env.local`/`.env.production` (não verificado).
- 🟡 `/captacao` não avisa mais o admin: o fetch ao webhook n8n `mei-lead` (workflow inexistente) foi removido na v1.5.6. Para ter o aviso, criar workflow `mei-lead` e disparar do servidor em `app/api/leads/route.ts` (só para lead novo). CSP ainda libera `connect-src` do n8n (pode apertar depois).
- 🟡 Backup diário: cron de 02/06 era do Postgres do Supabase (destruído); NÃO verificado se cobre `producao/sismei-db`. SSH ao VPS1 negado da máquina local em 02/11.
- Bug histórico: build local precisa de `--build-arg NEXT_PUBLIC_APP_URL=https://app.sismeipro.com.br` explícito (Next.js inlina vars `NEXT_PUBLIC_*`)
- Bug histórico: editar package.json via PowerShell → usar `[System.IO.File]::WriteAllText` (evita BOM UTF-8)

---

## Contexto Crítico

- **Docker:** `rjsmarquesti/mei-control-pro:20261101a-v1.5.6` → EasyPanel: producao → app (trocar imagem em `set_app_source_image` + deploy). Rollback: `20261025a-v1.5.5`. **Nunca usar `easypanel.ps1 inspect` nem `mcp__easypanel__inspect_app` para ver a imagem — imprimem o env sem máscara; usar `list`/`env`.**
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
