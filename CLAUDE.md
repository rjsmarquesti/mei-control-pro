# MEI Control Pro — Sistema Operacional do Contexto

**Produto:** MEI Control Pro — SaaS de gestão financeira para MEIs brasileiros  
**URL produção:** https://app.sismeipro.com.br  
**Repositório local:** `C:\Users\Rogério\mei-control-pro`

---

## Stack

| Camada        | Tecnologia                                         |
|---------------|----------------------------------------------------|
| Framework     | Next.js 14 (App Router)                            |
| Linguagem     | TypeScript (strict)                                |
| Estilo        | TailwindCSS + CSS Variables (globals.css)          |
| Componentes   | Radix UI (importação manual — sem CLI shadcn)      |
| Ícones        | Lucide React                                       |
| Gráficos      | Recharts                                           |
| Estado global | Zustand + persist middleware                       |
| HTTP          | Axios via `services/api.ts`                        |
| Animações     | Framer Motion                                      |
| Tema          | next-themes (dark/light)                           |
| Auth/DB       | Supabase self-hosted (db.divulgabr.com.br)         |
| Pagamentos    | Mercado Pago SDK oficial                           |
| Notificações  | n8n webhook (WhatsApp via Evolution API + email)   |
| Deploy        | Docker standalone → EasyPanel (producao → app)     |
| Docker Hub    | rjsmarquesti/mei-control-pro                       |

---

## Regras Mandatórias

1. **Nunca usar `any` implícito** — tipos explícitos sempre. `any` só com cast documentado e justificado.
2. **Nunca usar `console.log` em produção** — usar `console.error` apenas em catch de erro crítico.
3. **Nunca expor secrets em código** — variáveis de ambiente para tudo. Nunca hardcodar tokens, keys ou passwords.
4. **Nunca chamar Supabase diretamente do browser** — toda chamada passa pelo proxy `/api/proxy` (CORS self-hosted).
5. **Nunca ler role/plano via cliente Supabase** — sempre via API route (RLS bloqueia acesso direto).
6. **Nunca fazer commit com build quebrado** — rodar `npx tsc --noEmit` antes de qualquer commit.
7. **Nunca usar `[...new Set(...)]`** — usar `Array.from(new Set(...))` (compatibilidade TypeScript).
8. **DAS nunca processa pagamentos** — app apenas registra/acompanha. Pagamento sempre via gov.br.
9. **Commits seguem Conventional Commits** — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
10. **Toda rota API usa `force-dynamic` + service role client** — nunca session/anon em rotas admin.

---

## Routing Table (situação → ação)

| Situação                    | Ação                                                                            |
|-----------------------------|---------------------------------------------------------------------------------|
| Novo endpoint API           | Criar em `app/api/`, adicionar `force-dynamic`, usar `getServiceClient()`, validar input, testar no browser |
| Bug report                  | Reproduzir → identificar root cause → fix mínimo → verificar que não quebrou outra coisa |
| Nova feature UI             | Ler componentes existentes → usar Radix + Tailwind + CSS Variables → testar dark/light |
| Mudança no banco (Supabase) | Criar migration SQL → aplicar via Supabase Studio → atualizar tipos TypeScript |
| Deploy                      | `npx tsc --noEmit` → build Docker com tag datada → push → EasyPanel → Implantar |
| Problema de CORS            | Verificar que requisição passa pelo proxy `/api/proxy/[...path]` — nunca chamar `db.divulgabr.com.br` direto |
| Workflow n8n                | Verificar conexões (IF=branch, Switch=case) → `$json` se perde após httpRequest (usar nós paralelos) |
| Novo email template         | Seguir padrão visual dark: fundo `#0b0b18`, header gradiente, botão `#7C3AED` → `#4F46E5` |
| Issue de autenticação       | Verificar proxy CORS → PGRST_DB_SCHEMAS inclui `sismei` → GoTrue SITE_URL correto |
| Performance/otimização      | Profile → benchmark → otimizar → verificar que build ainda passa                |

---

## Quality Gates

Toda mudança DEVE passar por:

- [ ] `npx tsc --noEmit` — zero erros de tipo
- [ ] `npm run build` — build Next.js sem erros (para mudanças que vão a produção)
- [ ] `npm run lint` — zero warnings ESLint
- [ ] Teste manual no browser — funcionalidade principal funcionando
- [ ] Dark mode e light mode verificados (se mudança de UI)
- [ ] Variáveis de ambiente documentadas (se nova env var)

---

## Forbidden (nunca fazer)

- Nunca usar `any` sem cast explícito e comentário justificando
- Nunca usar `console.log` (apenas `console.error` em catch crítico)
- Nunca hardcodar API keys, tokens, passwords ou connection strings
- Nunca chamar `db.divulgabr.com.br` diretamente do browser (CORS)
- Nunca ler plano/role via Supabase client (RLS bloqueia — usar API route)
- Nunca usar tag `latest` no EasyPanel — sempre tag com data (ex: `20260413a`)
- Nunca usar nome "SisMEI" ou "Sismei" no produto — sempre "MEI Control Pro"
- Nunca modificar a instância Evolution API `sismei` — identificador técnico fixo
- Nunca enviar `updated_at` na tabela `leads` — coluna não existe
- Nunca duplicar variável `PGRST_DB_SCHEMAS` no `.env` — definir apenas na seção PostgREST
- Nunca usar biblioteca PDF externa — usar `window.print()` (já implementado)
- Nunca usar `sendMedia` no n8n com URL externa — usar `sendText`

---

## Arquitetura Crítica

### CORS — Proxy Supabase
```typescript
// lib/supabase.ts — browser usa proxy, server usa URL direta
const getSupabaseUrl = () => {
  if (typeof window !== 'undefined') return `${window.location.origin}/api/proxy`
  return supabaseUrl
}
```

### Service Role — Operações Admin
```typescript
// lib/supabase-server.ts — tipo explícito obrigatório para evitar erro de schema
import type { SupabaseClient } from '@supabase/supabase-js'
export function getServiceClient(): SupabaseClient<any, any, any>
```

### PostgreSQL — NULL em Filtros
```typescript
// NUNCA: .neq('campo', 'valor') — NÃO retorna NULLs
// CORRETO: .or('campo.eq.val,campo.is.null')
// OU: .in('campo', ['val1', 'val2'])
```

### n8n — Conexões Paralelas
```
// Quando precisa notificar admin E responder cliente:
// Switch → resposta_cliente (output case)
//        → notifica_admin   (output case — paralelo, NÃO encadeado após HTTP)
// Se encadear após HTTP: $json vira resposta da Evolution API, perde dados do cliente
```

---

## Infraestrutura

- **EasyPanel:** painel.divulgabr.com.br
- **App:** producao → app → Implantar
- **Supabase:** producao → supabase (compose)
- **n8n:** producao → n8n (n8n.divulgabr.com.br)
- **Evolution API:** instância `sismei`, número `5521980485675`
- **Docker Hub:** rjsmarquesti/mei-control-pro:\<tag-datada\>
- **Servidor:** 167.88.39.16

---

## Estado Atual do Projeto

- Projeto em produção em https://app.sismeipro.com.br
- Stack completa funcionando: auth, planos, DAS, IRPF, relatórios, admin, leads/CRM
- n8n workflows ativos: mei-cadastro, mei-atendimento-whatsapp, mei-das-alerta
- Último deploy: 20260412b
- Supabase schema: `sismei` (deve estar em PGRST_DB_SCHEMAS)

---

## Memória — Arquivos a Ler no Início de Sessão

1. `MEMORY/wake-up.md` — estado atual e últimas mudanças
2. `MEMORY/inbox.md` — tasks pendentes

---

*Leia este arquivo inteiro antes de fazer qualquer modificação no projeto.*
