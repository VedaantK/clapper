import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { ensureMovieCached } from '@/lib/movies'
import {
  initSession,
  applyComparison,
  finalizePositions,
  type Tier,
  type ComparisonResult,
  type RatedMovie,
} from '@/lib/ranking'

interface ComparisonLogEntry {
  opponentMovieId: string
  result: ComparisonResult
}

interface CreateRatingBody {
  tmdbId: number
  tier: Tier
  comparisonsLog: ComparisonLogEntry[]
  note?: string
  tags?: string[]
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const serviceClient = createServiceRoleClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const body: CreateRatingBody = await request.json()
  const { tmdbId, tier, comparisonsLog, note, tags } = body

  if (!tmdbId || !tier || !['loved', 'liked', 'disliked'].includes(tier)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Ensure movie is in our DB
  const movie = await ensureMovieCached(tmdbId, serviceClient)

  // Get this user's genre preferences for the new movie
  const { data: movieGenreRows } = await supabase
    .from('movie_genres')
    .select('genre_id')
    .eq('movie_id', movie.id) as { data: { genre_id: number }[] | null }

  const newMovieGenres = (movieGenreRows ?? []).map((r) => r.genre_id)

  // Fetch user's existing ratings in this tier
  type ExistingRating = {
    id: string
    movie_id: string
    tier: string
    position: number
    score: number
    movies: { id: string; movie_genres: { genre_id: number }[] } | null
  }

  const { data: existingRatings, error: ratingsError } = await supabase
    .from('ratings')
    .select('id, movie_id, tier, position, score, movies(id, movie_genres(genre_id))')
    .eq('user_id', user.id)
    .eq('tier', tier)
    .neq('movie_id', movie.id)
    .order('position', { ascending: true }) as { data: ExistingRating[] | null; error: { message: string } | null }

  if (ratingsError) {
    return NextResponse.json({ error: ratingsError.message }, { status: 500 })
  }

  type ExistingRatingRow = {
    id: string; user_id: string; movie_id: string; tier: Tier
    position: number; score: number; note: string | null; tags: string[]; rated_at: string
  }

  const { data: existingRating } = await supabase
    .from('ratings')
    .select('*')
    .eq('user_id', user.id)
    .eq('movie_id', movie.id)
    .single() as { data: ExistingRatingRow | null; error: unknown }

  const tierList: RatedMovie[] = (existingRatings ?? []).map((r) => ({
    id: r.movie_id,
    position: r.position,
    score: r.score,
    genres: r.movies?.movie_genres?.map((mg) => mg.genre_id) ?? [],
  }))

  // Replay comparison log server-side to determine final position
  let session = initSession(movie.id, tier, tierList)

  for (const entry of comparisonsLog) {
    const opponentIdx = tierList.findIndex((m) => m.id === entry.opponentMovieId)
    if (opponentIdx === -1) continue
    session = applyComparison(session, entry.result, opponentIdx)
  }

  const finalized = finalizePositions(session, movie.id, tier)

  // Generate session ID for comparison logging
  const sessionId = crypto.randomUUID()

  // Execute everything in a transaction via RPC
  // Since Supabase JS doesn't expose raw transactions, we batch writes carefully:

  // 1. If re-rating, handle old tier positions
  if (existingRating && existingRating.tier !== tier) {
    // Shift old tier positions down
    const { data: oldTierRatings } = await supabase
      .from('ratings')
      .select('id, position')
      .eq('user_id', user.id)
      .eq('tier', existingRating.tier)
      .gt('position', existingRating.position)
      .order('position', { ascending: true }) as { data: { id: string; position: number }[] | null }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    for (const r of oldTierRatings ?? []) {
      await db.from('ratings').update({ position: r.position - 1 }).eq('id', r.id)
    }
  }

  // 2. Update positions of all movies in the new tier
  for (const f of finalized) {
    if (f.id === movie.id) continue
    await db
      .from('ratings')
      .update({ position: f.position, score: f.score })
      .eq('user_id', user.id)
      .eq('movie_id', f.id)
  }

  const newMovieFinalized = finalized.find((f) => f.id === movie.id)!

  // 3. Upsert the new/updated rating
  const { error: upsertError } = await db
    .from('ratings')
    .upsert(
      {
        user_id: user.id,
        movie_id: movie.id,
        tier,
        position: newMovieFinalized.position,
        score: newMovieFinalized.score,
        note: note ?? existingRating?.note ?? null,
        tags: tags ?? existingRating?.tags ?? [],
        rated_at: existingRating ? existingRating.rated_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,movie_id' }
    )

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  // 4. Log comparisons
  if (comparisonsLog.length > 0) {
    const compRows = comparisonsLog
      .filter((c) => {
        const opponentIdx = tierList.findIndex((m) => m.id === c.opponentMovieId)
        return opponentIdx !== -1
      })
      .map((c) => ({
        user_id: user.id,
        session_id: sessionId,
        new_movie_id: movie.id,
        opponent_movie_id: c.opponentMovieId,
        result: c.result,
      }))

    if (compRows.length > 0) {
      await db.from('comparisons').insert(compRows)
    }
  }

  return NextResponse.json({
    score: newMovieFinalized.score,
    position: newMovieFinalized.position,
    tierSize: finalized.length,
    movieId: movie.id,
  })
}
