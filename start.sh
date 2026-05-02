#!/bin/zsh
# Clapper — quick start
# Double-click in Finder, or run: ./start.sh

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ── Locate pnpm ──────────────────────────────────────────────────────────────
PNPM=$(command -v pnpm 2>/dev/null || echo "$HOME/.local/bin/pnpm")
if [ ! -x "$PNPM" ]; then
  echo "${RED}✗ pnpm not found. Run setup.sh first.${NC}"
  exit 1
fi

# ── Check .env.local ─────────────────────────────────────────────────────────
if [ ! -f .env.local ]; then
  echo "${RED}✗ .env.local not found.${NC}"
  echo "  Run ${BOLD}./setup.sh${NC} first to create it."
  exit 1
fi

if grep -q "your_supabase_project_url" .env.local; then
  echo "${YELLOW}⚠  .env.local still has placeholder values.${NC}"
  echo "   Fill in your API keys before the app will work correctly."
  echo ""
fi

# ── Install deps if missing ───────────────────────────────────────────────────
if [ ! -d node_modules ]; then
  echo "${YELLOW}→ node_modules missing — running pnpm install...${NC}"
  $PNPM install --frozen-lockfile
fi

# ── Start ────────────────────────────────────────────────────────────────────
echo ""
echo "${GREEN}${BOLD}Starting Clapper...${NC}"
echo "  Local:  http://localhost:3000"
echo "  Press Ctrl+C to stop"
echo ""

$PNPM dev
