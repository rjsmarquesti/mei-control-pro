# Skill: Safe Development — MEI Control Pro

Fluxo obrigatório para qualquer modificação no MEI Control Pro:

1. **Ler antes de modificar** — leia o arquivo completo e os relacionados (route, hook, service, lib) antes de editar
2. **TypeScript strict** — nunca introduzir `any` implícito; `any` só com cast explícito e comentário justificando
3. **CORS proxy** — toda chamada Supabase no browser passa por `/api/proxy`; NUNCA chamar `db.divulgabr.com.br` diretamente do cliente
4. **Service role** — rotas API admin usam `getServiceClient()` (service role), nunca session/anon
5. **Plano/role** — sempre verificar via API route (`/api/me/plan`, `/api/me/role`); nunca via Supabase client no browser (RLS bloqueia)
6. **Verificar TypeScript** — após edições, rodar `npx tsc --noEmit` → zero erros antes de declarar concluído
7. **NULL em PostgreSQL** — filtros com `.neq()` NÃO retornam NULLs; usar `.in()` ou `.or('campo.eq.val,campo.is.null')`
8. **Set iteration** — usar `Array.from(new Set(...))`, nunca `[...new Set(...)]` (erro TypeScript strict)
9. **motion.* em tabelas** — nunca usar `motion.tr`, `motion.td`, `motion.tbody` (hydration mismatch); usar `<tr>` simples com Tailwind
10. **Inner components** — nunca definir componentes dentro de outros componentes React (unmount/remount crash)
