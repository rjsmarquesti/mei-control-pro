# Code Review Skill — MEI Control Pro

Protocolo de revisão de código com foco nas particularidades do projeto.

## Checklist de Revisão

### Segurança (CRITICAL — bloqueia)
- [ ] Nenhum secret/key hardcoded
- [ ] Chamadas Supabase do browser passam pelo proxy `/api/proxy`
- [ ] Rotas admin usam service role, não anon key
- [ ] Input de usuário validado antes de usar em queries

### TypeScript (CRITICAL — bloqueia)
- [ ] Zero uso de `any` implícito
- [ ] Tipos explícitos em todos os parâmetros de função
- [ ] `Array.from(new Set(...))` em vez de `[...new Set(...)]`
- [ ] `SupabaseClient<any, any, any>` em `getServiceClient()` (evita erro de schema)

### Arquitetura (WARNING — sugere correção)
- [ ] API routes têm `export const dynamic = 'force-dynamic'`
- [ ] Leituras de role/plano via API route (nunca Supabase client direto)
- [ ] Tabela `leads`: não enviar `updated_at` (coluna não existe)
- [ ] Filtros PostgreSQL com NULL: usar `.or()` ou `.in()`, nunca `.neq()`
- [ ] n8n admin notifications: paralelas ao Switch, não após HTTP nodes

### Estilo/UX (INFO — opcional)
- [ ] Componentes usam CSS Variables (não cores hardcoded)
- [ ] Dark mode e light mode funcionando
- [ ] Loading states em operações assíncronas
- [ ] Mensagens de erro amigáveis ao usuário

## Formato de Saída

Para cada finding:
```
[SEVERITY] arquivo:linha
Problema: descrição clara
Solução: código ou ação específica
```

Máximo 5 findings por review (priorizar os mais críticos).
Se tudo OK: "LGTM" + parágrafo justificando.
