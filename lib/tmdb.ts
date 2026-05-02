export interface TMDBMovie {
  id: number
  title: string
  original_title: string
  release_date: string
  poster_path: string | null
  backdrop_path: string | null
  overview: string
  genre_ids: number[]
  media_type?: string
}

export interface TMDBMovieDetail {
  id: number
  title: string
  original_title: string
  release_date: string
  poster_path: string | null
  backdrop_path: string | null
  overview: string
  runtime: number | null
  genres: { id: number; name: string }[]
}

const BASE_URL = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

export async function searchMovies(query: string): Promise<TMDBMovie[]> {
  if (!query.trim()) return []

  const url = `${BASE_URL}/search/movie?query=${encodeURIComponent(query)}&page=1&include_adult=false`
  const res = await fetch(url, {
    headers: authHeaders(),
    next: { revalidate: 86400 },
  })

  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`)

  const data = await res.json()
  return (data.results as TMDBMovie[]).slice(0, 10)
}

export async function getMovieDetails(tmdbId: number): Promise<TMDBMovieDetail> {
  const url = `${BASE_URL}/movie/${tmdbId}`
  const res = await fetch(url, {
    headers: authHeaders(),
    next: { revalidate: 86400 },
  })

  if (!res.ok) throw new Error(`TMDB movie detail failed: ${res.status}`)

  return res.json()
}

export function getPosterUrl(
  path: string | null,
  size: 'w185' | 'w342' | 'w500' = 'w342'
): string | null {
  if (!path) return null
  return `${IMAGE_BASE}/${size}${path}`
}

export function getBackdropUrl(
  path: string | null,
  size: 'w780' | 'w1280' = 'w1280'
): string | null {
  if (!path) return null
  return `${IMAGE_BASE}/${size}${path}`
}

export function releaseYear(releaseDate: string | null | undefined): number | null {
  if (!releaseDate) return null
  const year = parseInt(releaseDate.substring(0, 4), 10)
  return isNaN(year) ? null : year
}
