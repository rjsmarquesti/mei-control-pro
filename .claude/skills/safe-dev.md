# Safe Development Skill — MEI Control Pro

Protocolo obrigatório para qualquer modificação no projeto.

## Antes de modificar

1. Leia o arquivo atual completo antes de qualquer edição
2. Identifique todos os lugares que o código modificado é usado
3. Verifique se a mudança afeta: proxy CORS, service role, tipos TypeScript

## Durante o desenvolvimento

4. Siga as convenções existentes (Radix UI, CSS Variables, Axios via services/api.ts)
5. Nunca usar `any` sem justificativa; nunca usar `console.log`
6. Para novas API routes: `force-dynamic` + `getServiceClient()` + validar input
7. Para novas chamadas Supabase no browser: verificar que passa pelo proxy

## Após modificar

8. Rodar `npx tsc --noEmit` — zero erros de tipo
9. Testar manualmente no browser o fluxo afetado
10. Verificar dark mode e light mode se mudança de UI
11. Se tocou em autenticação: testar login, logout, recuperação de senha
12. Se tocou em admin: testar com usuário role='admin' e role='user' separadamente

## Antes de deploy

13. `npm run build` — build completo sem erros
14. Build Docker com tag datada: `docker build -t rjsmarquesti/mei-control-pro:YYYYMMDD<letra>`
15. Push: `docker push rjsmarquesti/mei-control-pro:YYYYMMDD<letra>`
16. EasyPanel: atualizar tag → Implantar → verificar logs
