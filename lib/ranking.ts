export type Tier = 'loved' | 'liked' | 'disliked'
export type ComparisonResult = 'new_wins' | 'opponent_wins' | 'too_tough'

export interface RatedMovie {
  id: string
  position: number
  score: number
  genres: number[]
}

export interface RatingSession {
  newMovieId: string
  tier: Tier
  low: number
  high: number
  comparisonsRemaining: number
  tooToughCount: number
  tierList: RatedMovie[]
  comparisonsLog: { opponentId: string; result: ComparisonResult }[]
  complete: boolean
}

const TIER_RANGES: Record<Tier, { low: number; high: number }> = {
  loved: { low: 7.0, high: 10.0 },
  liked: { low: 4.0, high: 6.9 },
  disliked: { low: 0.0, high: 3.9 },
}

export function getTierRange(tier: Tier) {
  return TIER_RANGES[tier]
}

export function computeScore(position: number, tierSize: number, tier: Tier): number {
  const { low, high } = TIER_RANGES[tier]
  let raw: number
  if (tierSize === 1) {
    raw = (low + high) / 2
  } else {
    raw = high - (position / (tierSize - 1)) * (high - low)
  }
  return Math.round(raw * 10) / 10
}

export function initSession(
  newMovieId: string,
  tier: Tier,
  tierList: RatedMovie[]
): RatingSession {
  const sorted = [...tierList].sort((a, b) => a.position - b.position)

  if (sorted.length === 0) {
    return {
      newMovieId,
      tier,
      low: 0,
      high: 0,
      comparisonsRemaining: 0,
      tooToughCount: 0,
      tierList: sorted,
      comparisonsLog: [],
      complete: true,
    }
  }

  const comparisonsRemaining = Math.ceil(Math.log2(sorted.length)) + 1

  return {
    newMovieId,
    tier,
    low: 0,
    high: sorted.length,
    comparisonsRemaining,
    tooToughCount: 0,
    tierList: sorted,
    comparisonsLog: [],
    complete: false,
  }
}

export function pickOpponent(
  session: RatingSession,
  newMovieGenres: number[]
): RatedMovie | null {
  const { low, high, tierList, comparisonsLog } = session

  if (low >= high) return null

  const eligible = tierList.slice(low, high)
  const targetIdx = Math.floor((low + high) / 2)

  const shownIds = new Set(
    comparisonsLog
      .filter((c) => c.result === 'too_tough')
      .map((c) => c.opponentId)
  )

  const candidates = eligible
    .filter((m) => !shownIds.has(m.id))
    .map((m) => {
      const sharedGenres = m.genres.filter((g) => newMovieGenres.includes(g)).length
      const overlapScore = 3 * sharedGenres
      const distance = Math.abs(m.position - targetIdx)
      return { movie: m, distance, overlapScore }
    })
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance
      return b.overlapScore - a.overlapScore
    })

  if (candidates.length === 0) {
    // All have been shown as too_tough — pick the median one
    return eligible[Math.floor(eligible.length / 2)] ?? null
  }

  return candidates[0].movie
}

export function applyComparison(
  session: RatingSession,
  result: ComparisonResult,
  opponentPosition: number
): RatingSession {
  const log = [
    ...session.comparisonsLog,
    {
      opponentId: session.tierList[opponentPosition]?.id ?? '',
      result,
    },
  ]

  let { low, high, tooToughCount, comparisonsRemaining } = session
  comparisonsRemaining = Math.max(0, comparisonsRemaining - 1)

  if (result === 'new_wins') {
    high = opponentPosition
    tooToughCount = 0
  } else if (result === 'opponent_wins') {
    low = opponentPosition + 1
    tooToughCount = 0
  } else {
    tooToughCount += 1
  }

  const complete =
    low >= high ||
    comparisonsRemaining === 0 ||
    tooToughCount >= 2

  return {
    ...session,
    low,
    high,
    comparisonsRemaining,
    tooToughCount,
    comparisonsLog: log,
    complete,
  }
}

export function isSessionComplete(session: RatingSession): boolean {
  return session.complete
}

export interface FinalizedRating {
  id: string
  position: number
  score: number
}

export function finalizePositions(
  session: RatingSession,
  newMovieId: string,
  tier: Tier
): FinalizedRating[] {
  const insertAt = session.low
  const existing = session.tierList

  // Build new list: movies at insertAt and after shift +1
  const result: FinalizedRating[] = []

  for (const movie of existing) {
    result.push({
      id: movie.id,
      position: movie.position >= insertAt ? movie.position + 1 : movie.position,
      score: 0, // recalculated below
    })
  }

  result.push({ id: newMovieId, position: insertAt, score: 0 })
  result.sort((a, b) => a.position - b.position)

  const tierSize = result.length

  for (let i = 0; i < result.length; i++) {
    result[i].score = computeScore(i, tierSize, tier)
    result[i].position = i
  }

  return result
}
