import { notFound, redirect } from 'next/navigation'
import { getMovieDetails, releaseYear } from '@/lib/tmdb'
import { createClient } from '@/lib/supabase/server'
import { RatingFlow } from '@/components/rating/RatingFlow'
import type { RatedMovie } from '@/lib/ranking'

interface RatePageProps {
  params: Promise<{ tmdbId: string }>
}

export default async function RatePage({ params }: RatePageProps) {
  const { tmdbId: tmdbIdStr } = await params
  const tmdbId = parseInt(tmdbIdStr, 10)
  if (isNaN(tmdbId)) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let detail
  try {
    detail = await getMovieDetails(tmdbId)
  } catch {
    notFound()
  }

  // Fetch all user ratings with movie info (for comparison pool)
  const { data: allRatings } = await supabase
    .from('ratings')
    .select('movie_id, tier, position, score, movies(id, tmdb_id, title, poster_path, movie_genres(genre_id))')
    .eq('user_id', user.id)
    .order('position', { ascending: true })

  // Find the cached movie record (may not exist yet; that's fine)
  const { data: cachedMovie } = await supabase
    .from('movies')
    .select('id, movie_genres(genre_id)')
    .eq('tmdb_id', tmdbId)
    .single()

  const newMovieGenres = (cachedMovie?.movie_genres ?? []).map((mg) => mg.genre_id)

  // Build tier lists and opponent map
  const tierMovies: { loved: RatedMovie[]; liked: RatedMovie[]; disliked: RatedMovie[] } = {
    loved: [],
    liked: [],
    disliked: [],
  }

  const opponentMap: Record<string, { tmdbId: number; movieId: string; title: string; posterPath: string | null; score: number; position: number }> = {}

  for (const r of allRatings ?? []) {
    const movie = r.movies as {
      id: string
      tmdb_id: number
      title: string
      poster_path: string | null
      movie_genres: { genre_id: number }[]
    } | null

    if (!movie) continue
    // Skip the movie being re-rated
    if (movie.tmdb_id === tmdbId) continue

    const rated: RatedMovie = {
      id: r.movie_id,
      position: r.position,
      score: r.score,
      genres: movie.movie_genres.map((mg) => mg.genre_id),
    }
    tierMovies[r.tier].push(rated)

    opponentMap[r.movie_id] = {
      tmdbId: movie.tmdb_id,
      movieId: r.movie_id,
      title: movie.title,
      posterPath: movie.poster_path,
      score: r.score,
      position: r.position,
    }
  }

  return (
    <RatingFlow
      newMovie={{
        tmdbId,
        movieId: cachedMovie?.id ?? '',
        title: detail.title,
        posterPath: detail.poster_path,
        genres: newMovieGenres,
      }}
      tierMovies={tierMovies}
      opponentMap={opponentMap}
    />
  )
}
