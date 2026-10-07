# Skill: Code Review — MEI Control Pro

Checklist de revisão para arquivos alterados na sessão.

## 🔴 CRITICAL (corrigir antes de continuar)
- `any` implícito introduzido sem cast e sem comentário
- Chamada direta a `db.divulgabr.com.br` do browser (deve passar pelo proxy)
- Rota `/api/admin/*` sem `requireAdmin()` ou sem Bearer token
- Credencial, API key ou secret hardcoded
- `.neq()` usado onde NULLs devem ser incluídos (usar `.in()` ou `.or()`)
- `motion.tr`, `motion.td`, `motion.tbody` em tabelas (hydration mismatch)
- Componente React definido dentro de outro componente

## 🟡 WARNING
- `console.log` em código de produção (apenas `console.error` em catch crítico)
- Plano/role verificado via Supabase client no browser em vez de API route
- `NEXT_PUBLIC_*` hardcoded no código em vez de variável de ambiente
- `[...new Set(...)]` em vez de `Array.from(new Set(...))`
- PlanGate ou usePlan ausente em feature restrita por plano

## 🔵 INFO
- Código duplicado que pode ser extraído para lib/ ou services/
- Nome de variável pouco descritivo
- Lógica não-óbvia sem comentário explicando o porquê

## Formato do report
```
Arquivo: [caminho/arquivo.ts]
Linha [N]: [CRITICAL|WARNING|INFO] — [descrição]
Sugestão: [correção concreta]
```

Se nenhum finding: "LGTM — sem violações encontradas."
