#!/bin/bash
# session-end.sh — Atualiza memória ao final de cada sessão

PROJECT_DIR="/c/Users/Rogério/mei-control-pro"
MEMORY_DIR="$PROJECT_DIR/MEMORY"
DATE=$(date '+%Y-%m-%d')
DATETIME=$(date '+%Y-%m-%d %H:%M')

# Garante que o diretório de memória existe
mkdir -p "$MEMORY_DIR"

# Coleta últimas mudanças via git (se disponível)
RECENT_CHANGES=""
if command -v git &>/dev/null && [ -d "$PROJECT_DIR/.git" ]; then
  RECENT_CHANGES=$(cd "$PROJECT_DIR" && git log --oneline -5 2>/dev/null)
fi

# Atualiza wake-up.md com timestamp da última sessão
if [ -f "$MEMORY_DIR/wake-up.md" ]; then
  # Atualiza a linha "Última sessão"
  sed -i "s/\*\*Última sessão:\*\*.*/\*\*Última sessão:\*\* $DATETIME/" "$MEMORY_DIR/wake-up.md" 2>/dev/null || true
fi

# Adiciona entry no journal.md
JOURNAL="$MEMORY_DIR/journal.md"
if [ -f "$JOURNAL" ]; then
  # Verifica se já tem entry hoje
  if ! grep -q "## $DATE" "$JOURNAL" 2>/dev/null; then
    # Adiciona nova entrada após a primeira linha do arquivo
    ENTRY="## $DATE\n- Sessão de trabalho\n"
    if [ -n "$RECENT_CHANGES" ]; then
      ENTRY="${ENTRY}- Últimas alterações git:\n\`\`\`\n${RECENT_CHANGES}\n\`\`\`\n"
    fi
    # Insere após o cabeçalho (linha 1-3)
    sed -i "3i\\\\n${ENTRY}" "$JOURNAL" 2>/dev/null || true
  fi
fi

echo "Memória atualizada em $DATETIME" >&2
exit 0
