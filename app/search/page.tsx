import { Suspense } from 'react'
import { searchMovies } from '@/lib/tmdb'
import { createClient } from '@/lib/supabase/server'
import { MovieCard } from '@/components/MovieCard'
import { SearchBar } from '@/components/SearchBar'

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <Suspense>
        <SearchBar className="max-w-md" autoFocus />
      </Suspense>

      {q ? (
        <Suspense fallback={<SearchResultsSkeleton />}>
          <SearchResults query={q} />
        </Suspense>
      ) : (
        <p className="text-muted-foreground text-sm">Type to search for movies.</p>
      )}
    </div>
  )
}

async function SearchResults({ query }: { query: string }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [results, userRatings] = await Promise.all([
    searchMovies(query),
    user
      ? supabase
          .from('ratings')
          .select('movie_id, tier, score, movies(tmdb_id)')
          .eq('user_id', user.id)
          .then((r) => r.data ?? [])
      : Promise.resolve([]),
  ])

  const ratedTmdbIds = new Set(
    userRatings
      .map((r) => (r.movies as { tmdb_id: number } | null)?.tmdb_id)
      .filter(Boolean)
  )

  if (results.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No results for &ldquo;{query}&rdquo;.
      </p>
    )
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
        {results.map((movie) => {
          const rating = userRatings.find(
            (r) => (r.movies as { tmdb_id: number } | null)?.tmdb_id === movie.id
          )
          const year = movie.release_date
            ? parseInt(movie.release_date.substring(0, 4), 10)
            : null
          return (
            <div key={movie.id} className="relative">
              <MovieCard
                tmdbId={movie.id}
                title={movie.title}
                releaseYear={isNaN(year ?? NaN) ? null : year}
                posterPath={movie.poster_path}
                score={rating?.score ?? null}
                tier={rating ? (rating.tier as 'loved' | 'liked' | 'disliked') : null}
              />
              {ratedTmdbIds.has(movie.id) && (
                <div className="absolute top-1.5 left-1.5 bg-primary/90 text-primary-foreground text-xs rounded px-1.5 py-0.5 font-medium">
                  Rated
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SearchResultsSkeleton() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="aspect-[2/3] bg-muted rounded-md animate-pulse" />
          <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
        </div>
      ))}
    </div>
  )
}
