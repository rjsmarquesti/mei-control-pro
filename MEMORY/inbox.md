# Inbox — Tasks Pendentes do MEI Control Pro

> Claude: leia este arquivo no início de cada sessão e sugira qual task atacar.

Formato: `- [ ] PRIORIDADE: descrição (contexto)`

---

## Alta Prioridade

- [ ] ALTA: Verificar se PGRST_DB_SCHEMAS ainda inclui `sismei` após último deploy Supabase (sintoma: admin não redireciona para /admin)
- [ ] ALTA: Verificar se GOTRUE_MAILER_TEMPLATES_* não foram sobrescritos no docker-compose.yml do Supabase

## Média Prioridade

- [ ] MÉDIA: Testar fluxo completo de recuperação de senha em produção (email → link → nova senha)
- [ ] MÉDIA: Verificar se mei-das-alerta está disparando corretamente às 9h (cron n8n)
- [ ] MÉDIA: Revisar landing page (public/landingpage-sismei.html) — atualizar se necessário no WordPress sismeipro.com.br via Elementor

## Baixa Prioridade / Ideias

- [ ] BAIXA: Considerar notificação WhatsApp quando plano está próximo de expirar (3 dias antes)
- [ ] BAIXA: Dashboard admin: gráfico de crescimento de usuários por semana/mês
- [ ] BAIXA: Página de status do sistema (verificar Supabase, n8n, Evolution API)

---

## Concluídas Recentemente

- [x] Fix botões export (window.print, router.push) — 2026-04-12
- [x] Fix DAS: link real gov.br — 2026-04-12
- [x] Fix supabase-server.ts tipo SupabaseClient — 2026-04-12
- [x] Manual do usuário completo — publicado
- [x] Workflow mei-atendimento-whatsapp: admin notifications paralelas — 2026-04-12
- [x] Setup pipeline Claude Code (CLAUDE.md, hooks, MEMORY, skills) — 2026-04-13
