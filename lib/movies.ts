import { getMovieDetails, releaseYear } from '@/lib/tmdb'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/lib/database.types'

export async function ensureMovieCached(
  tmdbId: number,
  supabase: SupabaseClient<Database>
): Promise<Tables<'movies'>> {
  const { data: existing } = await supabase
    .from('movies')
    .select('*')
    .eq('tmdb_id', tmdbId)
    .single()

  if (existing) return existing

  const detail = await getMovieDetails(tmdbId)

  const { data: movie, error } = await supabase
    .from('movies')
    .insert({
      tmdb_id: detail.id,
      title: detail.title,
      original_title: detail.original_title,
      release_year: releaseYear(detail.release_date),
      poster_path: detail.poster_path,
      backdrop_path: detail.backdrop_path,
      overview: detail.overview,
      runtime_minutes: detail.runtime ?? null,
      media_type: 'movie',
      last_synced_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error || !movie) throw new Error(`Failed to cache movie ${tmdbId}: ${error?.message}`)

  if (detail.genres.length > 0) {
    await supabase.from('movie_genres').insert(
      detail.genres.map((g) => ({
        movie_id: movie.id,
        genre_id: g.id,
      }))
    )
  }

  return movie
}

export async function getMovieWithGenres(
  movieId: string,
  supabase: SupabaseClient<Database>
) {
  const { data } = await supabase
    .from('movies')
    .select('*, movie_genres(genre_id)')
    .eq('id', movieId)
    .single()

  return data
}
