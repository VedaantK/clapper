export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/SearchBar'
import { MovieCard } from '@/components/MovieCard'
import { Suspense } from 'react'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <LandingPage />
  }

  // Fetch recent ratings with movie details
  const { data: recentRatings } = await supabase
    .from('ratings')
    .select('*, movies(*)')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(12)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">What did you watch?</h1>
        <Suspense>
          <SearchBar className="max-w-md" autoFocus placeholder="Search for a movie to rate…" />
        </Suspense>
      </div>

      {recentRatings && recentRatings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recently rated</h2>
            <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {recentRatings.map((r) => {
              const movie = r.movies as { tmdb_id: number; title: string; release_year: number | null; poster_path: string | null } | null
              if (!movie) return null
              return (
                <MovieCard
                  key={r.id}
                  tmdbId={movie.tmdb_id}
                  title={movie.title}
                  releaseYear={movie.release_year}
                  posterPath={movie.poster_path}
                  score={r.score}
                  tier={r.tier}
                />
              )
            })}
          </div>
        </div>
      )}

      {(!recentRatings || recentRatings.length === 0) && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">No movies rated yet.</p>
          <p className="text-sm">Search for a movie above to get started.</p>
        </div>
      )}
    </div>
  )
}

function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 text-center">
      <div className="max-w-lg space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">
          Rate movies the smart way.
        </h1>
        <p className="text-xl text-muted-foreground">
          Tier your films. Compare head-to-head. Build your ranked list automatically.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/signup">
            <Button size="lg">Get started</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">
              Sign in
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
