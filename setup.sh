#!/bin/zsh
# Clapper — one-time setup script
# Run once after cloning: ./setup.sh

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
PNPM=$(command -v pnpm 2>/dev/null || echo "$HOME/.local/bin/pnpm")
if ! "$PNPM" --version &>/dev/null 2>&1; then
  echo "${YELLOW}→ Installing pnpm...${NC}"
  npm install -g pnpm --prefix ~/.local 2>/dev/null || npm install -g pnpm
  PNPM=$(command -v pnpm 2>/dev/null || echo "$HOME/.local/bin/pnpm")
fi
echo "${GREEN}✓${NC} pnpm $($PNPM --version)"

# ── Dependencies ─────────────────────────────────────────────────────────────
echo "${YELLOW}→ Installing dependencies...${NC}"
$PNPM install --frozen-lockfile
echo "${GREEN}✓${NC} Dependencies installed"

# ── .env.local ───────────────────────────────────────────────────────────────
if [ ! -f .env.local ]; then
  if [ -f .env.local.example ]; then
    cp .env.local.example .env.local
  else
    # Create it from scratch in case .env.local.example was gitignored
    cat > .env.local << 'ENVEOF'
# Supabase — https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# TMDB — https://www.themoviedb.org/settings/api
TMDB_API_KEY=your_tmdb_api_key
TMDB_API_READ_ACCESS_TOKEN=your_tmdb_read_access_token
ENVEOF
  fi

  echo ""
  echo "${YELLOW}⚠  .env.local created. Fill in your API keys:${NC}"
  echo ""
  echo "   ${BOLD}Supabase${NC} (https://supabase.com/dashboard/project/_/settings/api)"
  echo "   • NEXT_PUBLIC_SUPABASE_URL"
  echo "   • NEXT_PUBLIC_SUPABASE_ANON_KEY"
  echo "   • SUPABASE_SERVICE_ROLE_KEY"
  echo ""
  echo "   ${BOLD}TMDB${NC} (https://www.themoviedb.org/settings/api)"
  echo "   • TMDB_API_READ_ACCESS_TOKEN"
  echo "   • TMDB_API_KEY"
  echo ""
  echo "   ${BOLD}Database migration${NC}"
  echo "   Paste supabase/migrations/0001_init.sql into your Supabase SQL editor."
  echo ""

  # Open .env.local in editor
  if command -v code &>/dev/null; then
    echo "${YELLOW}→ Opening .env.local in VS Code...${NC}"
    code .env.local
  elif command -v open &>/dev/null; then
    open -e .env.local
  fi
else
  echo "${GREEN}✓${NC} .env.local already exists"
fi

echo ""
echo "${GREEN}${BOLD}Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Fill in .env.local with your API keys (if not done yet)"
echo "  2. Run the SQL migration in your Supabase SQL editor"
echo "  3. ${BOLD}./start.sh${NC}   ← start the app"
echo ""
