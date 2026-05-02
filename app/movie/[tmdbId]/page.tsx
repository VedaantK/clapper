import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getMovieDetails, getBackdropUrl, getPosterUrl, releaseYear } from '@/lib/tmdb'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { TierBadge } from '@/components/TierBadge'

interface MoviePageProps {
  params: Promise<{ tmdbId: string }>
}

export default async function MoviePage({ params }: MoviePageProps) {
  const { tmdbId: tmdbIdStr } = await params
  const tmdbId = parseInt(tmdbIdStr, 10)
  if (isNaN(tmdbId)) notFound()

  let detail
  try {
    detail = await getMovieDetails(tmdbId)
  } catch {
    notFound()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userRating = null
  if (user) {
    const { data: movie } = await supabase
      .from('movies')
      .select('id')
      .eq('tmdb_id', tmdbId)
      .single()

    if (movie) {
      const { data } = await supabase
        .from('ratings')
        .select('*')
        .eq('user_id', user.id)
        .eq('movie_id', movie.id)
        .single()
      userRating = data
    }
  }

  const backdropUrl = getBackdropUrl(detail.backdrop_path)
  const posterUrl = getPosterUrl(detail.poster_path, 'w342')
  const year = releaseYear(detail.release_date)

  const runtime = detail.runtime
    ? `${Math.floor(detail.runtime / 60)}h ${detail.runtime % 60}m`
    : null

  return (
    <div className="min-h-screen">
      {/* Backdrop */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        {backdropUrl ? (
          <>
            <Image
              src={backdropUrl}
              alt={`${detail.title} backdrop`}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 -mt-20 relative z-10 pb-16">
        <div className="flex gap-6">
          {/* Poster */}
          {posterUrl && (
            <div className="relative w-28 sm:w-36 shrink-0 aspect-[2/3] rounded-md overflow-hidden shadow-xl">
              <Image
                src={posterUrl}
                alt={`${detail.title} poster`}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Info */}
          <div className="pt-16 sm:pt-20 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{detail.title}</h1>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {year && <span>{year}</span>}
              {runtime && <span>· {runtime}</span>}
              {detail.genres.length > 0 && (
                <span>· {detail.genres.map((g) => g.name).join(', ')}</span>
              )}
            </div>
          </div>
        </div>

        {/* Overview */}
        {detail.overview && (
          <p className="mt-6 text-muted-foreground leading-relaxed">{detail.overview}</p>
        )}

        {/* Rating section */}
        <div className="mt-8 p-4 rounded-lg border bg-card">
          {userRating ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold">{userRating.score.toFixed(1)}</span>
                  <TierBadge tier={userRating.tier} />
                </div>
                <Link href={`/rate/${tmdbId}`}>
                  <Button variant="outline" size="sm">Edit rating</Button>
                </Link>
              </div>
              {userRating.note && (
                <p className="text-sm text-muted-foreground italic">&ldquo;{userRating.note}&rdquo;</p>
              )}
            </div>
          ) : user ? (
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">You haven&apos;t rated this yet.</p>
              <Link href={`/rate/${tmdbId}`}>
                <Button>Rate this</Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">Sign in to rate this movie.</p>
              <Link href="/login">
                <Button>Sign in</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Friends section (v1 skeleton) */}
        <div className="mt-6 p-4 rounded-lg border bg-card/50">
          <p className="text-sm text-muted-foreground">Friends who rated this — coming soon.</p>
        </div>
      </div>
    </div>
  )
}
