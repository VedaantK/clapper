import { NextRequest, NextResponse } from 'next/server'
import { getMovieDetails } from '@/lib/tmdb'
import { ensureMovieCached } from '@/lib/movies'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tmdbId: string }> }
) {
  const { tmdbId: tmdbIdStr } = await params
  const tmdbId = parseInt(tmdbIdStr, 10)
  if (isNaN(tmdbId)) {
    return NextResponse.json({ error: 'Invalid tmdbId' }, { status: 400 })
  }

  try {
    const supabase = createServiceRoleClient()
    const [movie, detail] = await Promise.all([
      ensureMovieCached(tmdbId, supabase),
      getMovieDetails(tmdbId),
    ])
    return NextResponse.json({ movie, detail })
  } catch (err) {
    console.error('Movie detail error:', err)
    return NextResponse.json({ error: 'Failed to fetch movie' }, { status: 500 })
  }
}
