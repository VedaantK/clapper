'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { MoviePoster } from '@/components/MoviePoster'
import { TierBadge, TierDot } from '@/components/TierBadge'
import type { Tier } from '@/lib/ranking'

interface RatingRow {
  id: string
  tier: Tier
  position: number
  score: number
  note: string | null
  rated_at: string
  movies: {
    tmdb_id: number
    title: string
    release_year: number | null
    poster_path: string | null
  } | null
}

type SortKey = 'score' | 'recent' | 'alpha'

interface ProfileClientProps {
  ratings: RatingRow[]
}

export function ProfileClient({ ratings }: ProfileClientProps) {
  const [tab, setTab] = useState<'all' | Tier>('all')
  const [sort, setSort] = useState<SortKey>('score')

  const filtered = useMemo(() => {
    const base = tab === 'all' ? ratings : ratings.filter((r) => r.tier === tab)
    return [...base].sort((a, b) => {
      if (sort === 'score') return b.score - a.score
      if (sort === 'recent') return new Date(b.rated_at).getTime() - new Date(a.rated_at).getTime()
      return (a.movies?.title ?? '').localeCompare(b.movies?.title ?? '')
    })
  }, [ratings, tab, sort])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">All ({ratings.length})</TabsTrigger>
            <TabsTrigger value="loved">
              Loved ({ratings.filter((r) => r.tier === 'loved').length})
            </TabsTrigger>
            <TabsTrigger value="liked">
              Liked ({ratings.filter((r) => r.tier === 'liked').length})
            </TabsTrigger>
            <TabsTrigger value="disliked">
              Didn&apos;t Like ({ratings.filter((r) => r.tier === 'disliked').length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="text-sm bg-transparent border border-border rounded px-2 py-1 text-foreground"
        >
          <option value="score">Score ↓</option>
          <option value="recent">Recently rated</option>
          <option value="alpha">A → Z</option>
        </select>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p>No movies in this tier yet.</p>
        </div>
      )}

      <div className="space-y-1">
        {filtered.map((r, idx) => {
          if (!r.movies) return null
          return (
            <Link
              key={r.id}
              href={`/movie/${r.movies.tmdb_id}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <span className="text-muted-foreground text-sm w-6 text-right shrink-0">
                {idx + 1}
              </span>
              <div className="relative w-10 aspect-[2/3] rounded overflow-hidden shrink-0">
                <MoviePoster
                  posterPath={r.movies.poster_path}
                  title={r.movies.title}
                  size="w185"
                  className="w-full h-full"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate group-hover:text-foreground">
                  {r.movies.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {r.movies.release_year && (
                    <span className="text-xs text-muted-foreground">{r.movies.release_year}</span>
                  )}
                  <TierBadge tier={r.tier} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <TierDot tier={r.tier} />
                <span className="text-xl font-bold tabular-nums">{r.score.toFixed(1)}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
