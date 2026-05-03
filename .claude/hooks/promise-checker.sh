#!/bin/bash
# promise-checker.sh — Verifica integridade após cada tool use

PROJECT_DIR="/c/Users/Rogério/mei-control-pro"

# Verifica se o TypeScript compila sem erros (rápido, sem build completo)
check_typescript() {
  if [ -f "$PROJECT_DIR/tsconfig.json" ]; then
    cd "$PROJECT_DIR" || return
    result=$(npx tsc --noEmit 2>&1)
    if [ $? -ne 0 ]; then
      echo "AVISO: Erros TypeScript detectados:" >&2
      echo "$result" | head -20 >&2
      return 1
    fi
  fi
  return 0
}

# Verifica arquivos críticos de configuração
check_critical_files() {
  CRITICAL=(
    "$PROJECT_DIR/lib/supabase.ts"
    "$PROJECT_DIR/lib/supabase-server.ts"
    "$PROJECT_DIR/next.config.mjs"
    "$PROJECT_DIR/app/api/proxy/[...path]/route.ts"
  )
  for f in "${CRITICAL[@]}"; do
    if [ ! -f "$f" ]; then
      echo "AVISO: Arquivo crítico ausente: $f" >&2
    fi
  done
}

check_critical_files

# Só roda TypeScript check se houve mudança em arquivos .ts/.tsx
LAST_MODIFIED=$(find "$PROJECT_DIR" -name "*.ts" -o -name "*.tsx" 2>/dev/null | \
  grep -v node_modules | grep -v .next | \
  xargs ls -t 2>/dev/null | head -1)

if [ -n "$LAST_MODIFIED" ]; then
  MODIFIED_MINS=$(( ($(date +%s) - $(date -r "$LAST_MODIFIED" +%s 2>/dev/null || echo 0)) / 60 ))
  if [ "$MODIFIED_MINS" -lt 5 ] 2>/dev/null; then
    check_typescript
  fi
fi

exit 0
