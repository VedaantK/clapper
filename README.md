# Clapper

A movie rating app built around comparison-based ranking. Tier a film (Loved / Liked / Didn't Like), answer a few head-to-head comparisons, and the app slots it into your personal ranked list with a precise decimal score.

## Quick start (new machine)

```bash
git clone https://github.com/vedaant2910/clapper.git
cd clapper
./setup.sh   # installs deps, creates .env.local, opens it for editing
```

Fill in `.env.local`, run the SQL migration (see below), then:

```bash
./start.sh   # starts the dev server at http://localhost:3000
```

That's it. No need to touch `npm`/`pnpm` directly.

---

## Manual setup (step-by-step)

### 1. Prerequisites

- Node.js 18+ — [nodejs.org](https://nodejs.org)
- pnpm — `npm install -g pnpm`
- A [Supabase](https://supabase.com) project (free tier works)
- A [TMDB](https://www.themoviedb.org/settings/api) API account (free)

### 2. Install dependencies

```bash
pnpm install
```

### 3. Environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |
| `TMDB_API_KEY` | TMDB → Settings → API → API Key (v3) |
| `TMDB_API_READ_ACCESS_TOKEN` | TMDB → Settings → API → API Read Access Token (v4) |

### 4. Database migration

In your Supabase project → **SQL Editor**, paste and run:

```
supabase/migrations/0001_init.sql
```

This creates all tables, sets up Row Level Security, and seeds the genre list.

### 5. Supabase Auth setup

In Supabase → **Authentication → Providers**:
- Enable **Email** (disable "Confirm email" for local dev if you want)
- Enable **Google** (add OAuth credentials from Google Cloud Console)

In Supabase → **Authentication → URL Configuration**:
- Add `http://localhost:3000/auth/callback` to **Redirect URLs**

### 6. Run locally

```bash
pnpm dev
# or just: ./start.sh
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | What it does |
|---|---|
| `./setup.sh` | One-time setup: installs deps, creates `.env.local` |
| `./start.sh` | Start the dev server with pre-flight checks |
| `pnpm dev` | Start dev server directly |
| `pnpm build` | Production build |
| `pnpm test` | Run unit tests (Vitest) |

---

## Project structure

```
app/
  page.tsx              # Landing (logged out) / home feed (logged in)
  login/                # Email + Google sign in
  signup/               # Sign up with username selection
  auth/callback/        # Supabase OAuth redirect handler
  search/               # Movie search (TMDB)
  movie/[tmdbId]/       # Movie detail page
  rate/[tmdbId]/        # Rating flow: tier → comparisons → reveal
  profile/              # Your ranked movie list
  u/[username]/         # Public profile (skeleton for Phase 2)
  api/
    ratings/create/     # POST: server-side score computation + DB write
    search/             # GET: TMDB search proxy
    movies/[tmdbId]/    # GET: movie detail + local cache

components/
  rating/RatingFlow.tsx # Three-state machine (tier-select → comparison → reveal)
  profile/ProfileClient.tsx
  MovieCard.tsx
  MoviePoster.tsx
  SearchBar.tsx
  TierBadge.tsx
  Nav.tsx
  Providers.tsx

lib/
  ranking.ts            # Core algorithm: binary insertion sort + score formula
  ranking.test.ts       # 25 Vitest unit tests
  tmdb.ts               # TMDB API helpers (server-only)
  movies.ts             # ensureMovieCached upsert
  database.types.ts     # Supabase TypeScript definitions
  supabase/
    client.ts           # Browser Supabase client
    server.ts           # Server Supabase client + service-role client
    middleware.ts       # Session refresh + protected route redirects

supabase/
  migrations/
    0001_init.sql       # Tables, enums, RLS policies, genre seed data
```

---

## How the ranking works

Movies within a tier are ordered by **binary-search insertion**. Each new movie starts a session:

- `comparisonsRemaining = ceil(log₂(N)) + 1`
- Each comparison narrows a `[low, high)` window — identical to binary search
- Opponent selection prefers median position, tiebroken by shared genres
- Two "too tough to compare" answers in a row exits early at the current midpoint

**Score formula:**

```
score = high − (position / (N−1)) × (high − low)
```

Tier ranges: Loved 7.0–10.0 · Liked 4.0–6.9 · Didn't Like 0.0–3.9

---

## Deploying to Vercel

1. Push to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Add all env vars from `.env.local` in Vercel → Project → Settings → Environment Variables
4. Add your Vercel domain to Supabase → Auth → URL Configuration → Redirect URLs

---

## Phase 2 (not yet built)

Watchlist · Social feed · Friends' ratings · TV shows · Recommendations
