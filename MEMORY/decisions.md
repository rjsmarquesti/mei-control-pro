# Decisions — Decisões Arquiteturais do MEI Control Pro

Formato: Contexto → Decisão → Consequências

---

## ADR-001: Proxy CORS para Supabase self-hosted

**Contexto:** Supabase está em `db.divulgabr.com.br` (domínio diferente). Browser recusa chamadas diretas por CORS.

**Decisão:** Criar proxy Next.js em `/api/proxy/[...path]/route.ts`. O cliente Supabase no browser usa `window.location.origin + /api/proxy` como baseURL. Server-side usa a URL direta.

**Consequências:**
- Positivo: CORS resolvido sem mexer na config do Supabase
- Positivo: Keys ficam apenas server-side (proxy repassa com as keys)
- Atenção: Toda nova chamada Supabase no browser DEVE passar pelo proxy — nunca chamar `db.divulgabr.com.br` diretamente

---

## ADR-002: Service Role para operações admin

**Contexto:** RLS (Row Level Security) bloqueia usuários de ler dados de outros usuários. Admin precisa ver todos os usuários.

**Decisão:** Todas as rotas `/api/admin/*` usam `getServiceClient()` com `SUPABASE_SERVICE_ROLE_KEY`. Rotas user-facing usam anon key + RLS.

**Consequências:**
- Positivo: RLS protege dados dos usuários corretamente
- Atenção: SERVICE_ROLE_KEY NUNCA pode ser exposta no cliente — apenas em API routes
- Atenção: Tipo de retorno deve ser `SupabaseClient<any, any, any>` para evitar erro de schema

---

## ADR-003: Recuperação de senha via API route

**Contexto:** `supabase.auth.updateUser()` falha via proxy CORS no Supabase self-hosted (limitação do GoTrue).

**Decisão:** API route `/api/auth/update-password` decodifica o JWT localmente para obter `sub` (userId) e usa `admin.updateUserById()` com service role.

**Consequências:**
- Positivo: Recuperação de senha funciona corretamente
- Atenção: Depende de decodificação JWT local — não validar assinatura, apenas extrair sub

---

## ADR-004: Export PDF via window.print()

**Contexto:** Precisava de export de relatórios em PDF. Bibliotecas como puppeteer/jsPDF adicionam complexidade e peso ao bundle.

**Decisão:** Usar `window.print()` nativo do browser com CSS `@media print` adequado.

**Consequências:**
- Positivo: Zero dependência extra, funciona em todas as páginas, output de qualidade
- Limitação: Usuário precisa selecionar "Salvar como PDF" no diálogo de impressão

---

## ADR-005: n8n notificações paralelas (não encadeadas)

**Contexto:** No workflow WhatsApp, precisamos responder ao cliente E notificar o admin. Se encadeado após o HTTP de resposta, `$json` vira a resposta da Evolution API e perde os dados do cliente.

**Decisão:** Admin notifications conectadas DIRETAMENTE do Switch (paralelo com a resposta ao cliente), NÃO após os HTTP nodes.

**Consequências:**
- Positivo: Admin recebe dados corretos (pushName, phone, mensagem)
- Atenção: Qualquer novo nó de notificação admin deve seguir esse padrão paralelo

---

## ADR-006: Tags Docker com data (nunca latest no EasyPanel)

**Contexto:** EasyPanel cacheia a tag `latest` e não puxa nova imagem mesmo após push.

**Decisão:** Sempre buildar e fazer push com tag datada (`YYYYMMDD<letra>`) E atualizar a tag no EasyPanel para essa nova tag antes de Implantar.

**Consequências:**
- Positivo: Deploy sempre pega o código novo
- Processo: build → push tag datada → atualizar EasyPanel → Implantar

---

## ADR-007: Radix UI manual (sem CLI shadcn)

**Contexto:** shadcn/ui CLI cria muitos arquivos e dificulta customização do design system.

**Decisão:** Importar Radix UI diretamente e criar componentes manualmente seguindo o design system com CSS Variables em `globals.css`.

**Consequências:**
- Positivo: Controle total do design, CSS Variables funcionam perfeitamente para dark/light
- Atenção: Não rodar `npx shadcn@latest add` — instalaria componentes conflitantes
