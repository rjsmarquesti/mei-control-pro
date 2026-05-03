# Journal — MEI Control Pro

Log cronológico de sessões de trabalho. Mais recente primeiro.

---

## 2026-04-13
- Setup do pipeline neuro-simbólico: CLAUDE.md, hooks, MEMORY, skills
- Criados: `.claude/hooks/` (3 scripts), `.claude/settings.json`, `MEMORY/` (4 arquivos), `.claude/skills/` (2 skills)
- Decisão: usar `session-end.sh` como Stop hook para atualizar memória automaticamente

## 2026-04-12
- Fix botões de export: Mensal/Anual → `window.print()`, IRPF → router.push
- Fix DAS: removido botão fake "Pagar DAS", link real gov.br
- Fix `supabase-server.ts`: tipo `SupabaseClient<any, any, any>` corrige erro de build (schema sismei vs public)
- Header: botão "?" adicionado → manual.html
- Admin: CRM adicionado ao menu
- Último deploy: tag `20260412b`

## Antes de 2026-04-12
- Setup inicial do projeto
- Stack: Next.js 14 + TypeScript + TailwindCSS + Radix UI + Supabase self-hosted
- Integração Mercado Pago (checkout + webhook)
- n8n workflows: mei-cadastro, mei-atendimento-whatsapp, mei-das-alerta
- Manual do usuário (public/manual.html)
- Templates email dark theme (GoTrue + n8n)
- LGPD: cookie banner, termos, privacidade
- Solução CORS proxy para Supabase self-hosted
- Recuperação de senha via API route (bypass CORS)
