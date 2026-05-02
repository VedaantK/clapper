#!/bin/zsh
# Clapper — one-time setup script
# Run once after cloning: bash setup.sh

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "${BOLD}🎬 Clapper setup${NC}"
echo "──────────────────────────────────────────"

# ── Node.js ──────────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "${RED}✗ Node.js not found.${NC}"
  echo "  Install it from https://nodejs.org (LTS) and re-run this script."
  exit 1
fi
echo "${GREEN}✓${NC} Node.js $(node --version)"

# ── pnpm ─────────────────────────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  echo "${YELLOW}→ Installing pnpm...${NC}"
  npm install -g pnpm --prefix ~/.local 2>/dev/null || npm install -g pnpm
fi

PNPM=$(command -v pnpm || echo "$HOME/.local/bin/pnpm")
echo "${GREEN}✓${NC} pnpm $($PNPM --version)"

# ── Dependencies ─────────────────────────────────────────────────────────────
echo "${YELLOW}→ Installing dependencies...${NC}"
$PNPM install --frozen-lockfile
echo "${GREEN}✓${NC} Dependencies installed"

# ── .env.local ───────────────────────────────────────────────────────────────
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo ""
  echo "${YELLOW}⚠  .env.local created from example.${NC}"
  echo "   Open .env.local and fill in your keys before starting the app:"
  echo ""
  echo "   ${BOLD}NEXT_PUBLIC_SUPABASE_URL${NC}         → Supabase project → Settings → API"
  echo "   ${BOLD}NEXT_PUBLIC_SUPABASE_ANON_KEY${NC}    → Supabase project → Settings → API"
  echo "   ${BOLD}SUPABASE_SERVICE_ROLE_KEY${NC}        → Supabase project → Settings → API"
  echo "   ${BOLD}TMDB_API_READ_ACCESS_TOKEN${NC}       → themoviedb.org → Settings → API"
  echo "   ${BOLD}TMDB_API_KEY${NC}                     → themoviedb.org → Settings → API"
  echo ""
  echo "   Also run the database migration:"
  echo "   Paste ${BOLD}supabase/migrations/0001_init.sql${NC} into your Supabase SQL editor."
  echo ""

  # Try to open .env.local in the default editor
  if command -v code &>/dev/null; then
    echo "${YELLOW}→ Opening .env.local in VS Code...${NC}"
    code .env.local
  elif command -v open &>/dev/null; then
    open .env.local
  fi
else
  echo "${GREEN}✓${NC} .env.local already exists"
fi

echo ""
echo "${GREEN}${BOLD}Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Fill in .env.local with your API keys (if you haven't yet)"
echo "  2. Run the SQL migration in your Supabase project"
echo "  3. Start the app:  ${BOLD}./start.sh${NC}   (or: pnpm dev)"
echo ""
