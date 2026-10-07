# Inbox — MEI Control Pro

Tasks pendentes para próximas sessões.

---

## Ações manuais obrigatórias (não automatizáveis)

- [x] **Reconectar instância WA `sismei`** ✅ verificado 21/06/2026 (não reconfirmado desde então — se notificações WA pararem, checar de novo)

- [x] **Migration 011 aplicada** ✅ (2026-06-02 — consents, audit_logs, lgpd_requests, triggers)

- [x] ~~Verificar migrations 006–009 no banco~~ — obsoleto (30/09/2026): Supabase removido; o schema agora vem de `prisma/migrations` (Postgres `producao/sismei-db`)
  - [ ] Conferir que as 2 migrations do Prisma (`init`, `add_trial_started_at`) estão aplicadas em `producao/sismei-db` (`_prisma_migrations`) — não verificado em 06/10/2026

- [x] ~~Configurar MFA para admin via GoTrue~~ — obsoleto: GoTrue não existe mais e o TOTP não foi implementado na auth própria. `ADMIN_MFA_REQUIRED=true` hoje bloquearia todos os admins — não ativar até implementar TOTP

- [ ] **Backup automático** — configurado 2026-06-02 (cron 02:00 UTC no VPS, retenção 30 dias) para o Postgres do Supabase antigo. **Não verificado se cobre o `producao/sismei-db` atual** — conferir

- [x] **Corrigir fallback hardcoded do salt** ✅ 2026-09-29 em `admin/mei-kit-code/route.ts` (AP-001)

- [x] **Upgrade Next.js** → `^14.2.35` no `package.json` (CVE-2025-29927)

- [x] ~~Rate limit dedicado em `/api/proxy`~~ — obsoleto: a rota `/api/proxy` foi removida na migração

- [ ] Rate limit/auth em `POST /api/notifications/register`, `POST /api/leads` e `POST /api/auth/login-notify` (revisão de 06/10/2026)
- [ ] Adicionar `HEALTHCHECK` no Dockerfile e definir como rodar `prisma migrate deploy` no deploy

## Features / melhorias

- [ ] Substituir logo texto no nav e hero da landing page pelo `logo.png` / `logo.webp` já existente em `public/`
- [ ] Adicionar página `/dashboard/perfil` → seção "Seus Dados (LGPD)" com botão exportar e solicitar exclusão (chama `/api/lgpd/export` e `/api/lgpd/delete`)
- [ ] Testar instalação do PWA de ponta a ponta num Android e num iOS reais (fix 2026-09-29 só foi verificado via curl/headers, não em navegador real — Playwright ficou indisponível na sessão)
