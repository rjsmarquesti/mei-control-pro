#!/bin/bash
# session-start.sh — Injeta status do ambiente no início de cada sessão

PROJECT_DIR="/c/Users/Rogério/mei-control-pro"

echo "=== MEI Control Pro — Início de Sessão ==="
echo ""

# node_modules
if [ -d "$PROJECT_DIR/node_modules" ]; then
    echo "✅ node_modules: presente"
else
    echo "⚠️  node_modules: ausente — rode npm install"
fi

# .env.local
if [ -f "$PROJECT_DIR/.env.local" ]; then
    echo "✅ .env.local: presente"
else
    echo "⚠️  .env.local: ausente"
fi

# Git status
if command -v git &>/dev/null && [ -d "$PROJECT_DIR/.git" ]; then
    BRANCH=$(cd "$PROJECT_DIR" && git rev-parse --abbrev-ref HEAD 2>/dev/null)
    UNCOMMITTED=$(cd "$PROJECT_DIR" && git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    echo "🔀 Branch: ${BRANCH:-desconhecido} | Arquivos modificados: $UNCOMMITTED"
fi

echo ""
echo "📋 Leia MEMORY/wake-up.md e MEMORY/inbox.md antes de qualquer ação."
echo ""

exit 0
