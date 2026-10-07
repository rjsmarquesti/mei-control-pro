# Decisions — MEI Control Pro

## 2026-05-01 — CORS via proxy Next.js
**Decisão:** Browser não acessa db.divulgabr.com.br diretamente — `lib/supabase.ts` usa `/api/proxy` no browser.
**Por quê:** Supabase self-hosted não tem CORS configurado para o domínio da app.
**Consequência:** Toda chamada Supabase do browser passa por `/api/proxy/[...path]`. Nunca chamar db.divulgabr.com.br direto do cliente.

## 2026-04-26 — Domínio sismei.com.br → sismeipro.com.br
**Decisão:** Migração completa de domínio.
**Consequência:** Nome do produto = "MEI Control Pro". Instância Evolution API = `sismei` (identificador técnico — não muda). Emails: suporte@sismeipro.com.br, comercial@sismeipro.com.br.

## 2026-04-27 — Admin API auth via Bearer token
**Decisão:** Todas rotas `/api/admin/*` protegidas com `requireAdmin()` + Bearer token.
**Consequência:** Páginas admin usam padrão `af` (adminFetch) com header `Authorization: Bearer ${token}`. Hook `useAdmin.ts` expõe o token.

## 2026-05-08 — Free tier: 20 → 100 lançamentos/mês
**Decisão:** Aumentar limite free de 20 para 100 lançamentos/mês.
**Por quê:** 20 era atingido em 2 semanas, causando frustração antes de criar hábito de uso. 100 permite uso real por meses no free.

## 2026-05-08 — Build local exige --build-arg para NEXT_PUBLIC_*
**Decisão:** Sempre usar `--build-arg NEXT_PUBLIC_APP_URL=https://app.sismeipro.com.br` no `docker build`.
**Por quê:** Next.js inlina vars `NEXT_PUBLIC_*` no bundle — sem o arg correto, a URL antiga (sismei.com.br) fica hardcoded no JS compilado, quebrando webhook e redirect do Mercado Pago.

## 2026-05-09 — PGRST_DB_SCHEMAS obrigatório
**Decisão:** Schema `sismei` DEVE estar em PGRST_DB_SCHEMAS no Supabase.
**Por quê:** Sem isso, PostgREST recusa todas as queries ao schema sismei. Sintoma sutil: role retorna 'user' por fallback do catch.
**Valor correto:** `PGRST_DB_SCHEMAS=public,storage,graphql_public,sismei`
