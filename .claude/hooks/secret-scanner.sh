#!/bin/bash
# secret-scanner.sh — Bloqueia secrets antes de qualquer operação de escrita/commit

# Lê o conteúdo do arquivo que está sendo modificado (passado via stdin pelo Claude Code)
INPUT=$(cat)

# Padrões de secrets a bloquear
PATTERNS=(
  "sk-[A-Za-z0-9]{20,}"
  "pk_[A-Za-z0-9]{20,}"
  "AKIA[A-Z0-9]{16}"
  "dckr_pat_[A-Za-z0-9_-]{20,}"
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+"
  "password\s*=\s*['\"][^'\"]{6,}['\"]"
  "MERCADOPAGO_ACCESS_TOKEN\s*=\s*APP_USR-[0-9]+"
  "postgresql://[^:]+:[^@]+@"
  "mysql://[^:]+:[^@]+@"
)

FOUND=0
for pattern in "${PATTERNS[@]}"; do
  if echo "$INPUT" | grep -qE "$pattern" 2>/dev/null; then
    echo "BLOQUEADO: Possível secret detectado (padrão: $pattern)" >&2
    FOUND=1
  fi
done

if [ $FOUND -eq 1 ]; then
  echo "Use variáveis de ambiente (.env.local) em vez de hardcodar credenciais." >&2
  exit 1
fi

exit 0
