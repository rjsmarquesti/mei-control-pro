# Wake-Up — Estado Atual do MEI Control Pro

> Claude: leia este arquivo no início de cada sessão antes de qualquer ação.

**Última sessão:** 2026-04-13  
**Último deploy:** tag `20260412b` → EasyPanel producao → app

---

## Estado Atual (2026-04-13)

### O que está funcionando em produção
- Auth completo: cadastro, confirmação email, recuperação senha
- Dashboard financeiro: receitas, despesas, DAS, IRPF, relatórios, categorias
- Planos: free/basic/pro/premium via Mercado Pago webhook
- Admin: gestão de usuários, leads/CRM, histórico de pagamentos
- n8n workflows: mei-cadastro, mei-atendimento-whatsapp, mei-das-alerta
- Manual do usuário: https://app.sismeipro.com.br/manual.html
- LGPD: cookie banner, termos, privacidade

### Últimas mudanças significativas (2026-04-12)
- Botões de export: Mensal/Anual → `window.print()`, IRPF → `router.push('/dashboard/irpf')`
- IRPF: "Gerar Relatório" → `window.print()` (disabled quando sem receita)
- DAS: removido botão fake "Pagar DAS", substituído por link real gov.br
- Header: botão "?" → link para manual.html
- Admin menu: CRM adicionado
- `lib/supabase-server.ts`: tipo `SupabaseClient<any, any, any>` (fix build)

### Issues abertas / PRs pendentes
- Nenhuma issue crítica em aberto (verificar inbox.md para tasks)

---

## Contexto Crítico Para Esta Sessão

### CORS — Proxy Supabase
Browser NÃO pode chamar `db.divulgabr.com.br` diretamente.
Toda chamada Supabase do browser passa por `/api/proxy/[...path]`.

### PGRST_DB_SCHEMAS
O schema `sismei` DEVE estar em `PGRST_DB_SCHEMAS=public,storage,graphql_public,sismei`.
Sem isso, todas as API routes admin falham silenciosamente.

### Deploy
- Tag Docker deve ter data: `YYYYMMDD<letra>` (ex: `20260413a`)
- Nunca usar `latest` no EasyPanel — não atualiza o container
- Docker Hub: `rjsmarquesti/mei-control-pro`

---

## Próximos Passos Sugeridos
Ver `inbox.md` para tasks pendentes.
