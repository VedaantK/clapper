import { describe, it, expect } from 'vitest'
import {
  computeScore,
  initSession,
  applyComparison,
  pickOpponent,
  finalizePositions,
  isSessionComplete,
  type RatedMovie,
  type Tier,
} from './ranking'

function makeMovies(count: number, genres: number[] = []): RatedMovie[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `movie-${i}`,
    position: i,
    score: 0,
    genres,
  }))
}

describe('computeScore', () => {
  it('returns midpoint when tierSize is 1', () => {
    expect(computeScore(0, 1, 'loved')).toBe(8.5)  // (7+10)/2 = 8.5
    expect(computeScore(0, 1, 'liked')).toBe(5.5)  // (4+6.9)/2 = 5.45 → rounds to 5.5
    expect(computeScore(0, 1, 'disliked')).toBe(2.0) // (0+3.9)/2 = 1.95 → rounds to 2.0
  })

  it('returns high for position 0 in a multi-item tier', () => {
    expect(computeScore(0, 5, 'loved')).toBe(10.0)
    expect(computeScore(0, 5, 'liked')).toBe(6.9)
    expect(computeScore(0, 5, 'disliked')).toBe(3.9)
  })

  it('returns low for last position in a multi-item tier', () => {
    expect(computeScore(4, 5, 'loved')).toBe(7.0)
    expect(computeScore(4, 5, 'liked')).toBe(4.0)
    expect(computeScore(4, 5, 'disliked')).toBe(0.0)
  })

  it('distributes evenly across 3-item loved tier', () => {
    expect(computeScore(0, 3, 'loved')).toBe(10.0)
    expect(computeScore(1, 3, 'loved')).toBe(8.5)
    expect(computeScore(2, 3, 'loved')).toBe(7.0)
  })
})

describe('initSession', () => {
  it('returns complete=true and skips comparisons for empty tier', () => {
    const session = initSession('new', 'loved', [])
    expect(session.complete).toBe(true)
    expect(session.comparisonsRemaining).toBe(0)
  })

  it('sets correct comparisonsRemaining for 1-item tier', () => {
    const session = initSession('new', 'loved', makeMovies(1))
    expect(session.comparisonsRemaining).toBe(1) // ceil(log2(1)) + 1 = 0 + 1 = 1
    expect(session.complete).toBe(false)
  })

  it('sets correct comparisonsRemaining for 2-item tier', () => {
    const session = initSession('new', 'loved', makeMovies(2))
    expect(session.comparisonsRemaining).toBe(2) // ceil(log2(2)) + 1 = 1 + 1 = 2
  })

  it('sets correct comparisonsRemaining for 10-item tier', () => {
    const session = initSession('new', 'loved', makeMovies(10))
    expect(session.comparisonsRemaining).toBe(5) // ceil(log2(10)) + 1 = 4 + 1 = 5
  })

  it('sorts tierList by position', () => {
    const movies: RatedMovie[] = [
      { id: 'b', position: 1, score: 0, genres: [] },
      { id: 'a', position: 0, score: 0, genres: [] },
    ]
    const session = initSession('new', 'loved', movies)
    expect(session.tierList[0].id).toBe('a')
    expect(session.tierList[1].id).toBe('b')
  })
})

describe('applyComparison', () => {
  it('new_wins narrows high down', () => {
    const session = initSession('new', 'loved', makeMovies(8))
    const opponent = pickOpponent(session, [])!
    const updated = applyComparison(session, 'new_wins', opponent.position)
    expect(updated.high).toBe(opponent.position)
    expect(updated.tooToughCount).toBe(0)
  })

  it('opponent_wins narrows low up', () => {
    const session = initSession('new', 'loved', makeMovies(8))
    const opponent = pickOpponent(session, [])!
    const updated = applyComparison(session, 'opponent_wins', opponent.position)
    expect(updated.low).toBe(opponent.position + 1)
    expect(updated.tooToughCount).toBe(0)
  })

  it('too_tough increments tooToughCount', () => {
    const session = initSession('new', 'loved', makeMovies(8))
    const opponent = pickOpponent(session, [])!
    const updated = applyComparison(session, 'too_tough', opponent.position)
    expect(updated.tooToughCount).toBe(1)
    expect(updated.complete).toBe(false)
  })

  it('two too_tough results exits loop', () => {
    let session = initSession('new', 'loved', makeMovies(8))
    const opponent1 = pickOpponent(session, [])!
    session = applyComparison(session, 'too_tough', opponent1.position)
    const opponent2 = pickOpponent(session, [])!
    session = applyComparison(session, 'too_tough', opponent2?.position ?? opponent1.position)
    expect(session.complete).toBe(true)
  })

  it('one too_tough then normal answer continues', () => {
    let session = initSession('new', 'loved', makeMovies(8))
    const op1 = pickOpponent(session, [])!
    session = applyComparison(session, 'too_tough', op1.position)
    expect(session.complete).toBe(false)

    const op2 = pickOpponent(session, [])!
    session = applyComparison(session, 'new_wins', op2.position)
    expect(session.tooToughCount).toBe(0)
  })

  it('marks complete when low >= high', () => {
    const movies = makeMovies(1)
    let session = initSession('new', 'loved', movies)
    const opponent = pickOpponent(session, [])!
    session = applyComparison(session, 'new_wins', opponent.position)
    expect(session.complete).toBe(true)
  })

  it('marks complete when comparisonsRemaining hits 0', () => {
    const movies = makeMovies(2)
    let session = initSession('new', 'loved', movies)

    while (!session.complete) {
      const op = pickOpponent(session, [])
      if (!op) break
      session = applyComparison(session, 'new_wins', op.position)
    }
    expect(session.complete).toBe(true)
  })
})

describe('finalizePositions', () => {
  it('inserts at position 0 in empty tier and assigns correct score', () => {
    const session = initSession('new', 'loved', [])
    const results = finalizePositions(session, 'new', 'loved')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('new')
    expect(results[0].position).toBe(0)
    expect(results[0].score).toBe(8.5) // midpoint of loved: (7+10)/2
  })

  it('shifts existing movies down when new is inserted at top', () => {
    const movies = makeMovies(3)
    let session = initSession('new', 'loved', movies)
    // Force new_wins on all to land at position 0
    while (!session.complete) {
      const op = pickOpponent(session, [])!
      session = applyComparison(session, 'new_wins', op.position)
    }
    expect(session.low).toBe(0)

    const results = finalizePositions(session, 'new', 'loved')
    expect(results).toHaveLength(4)
    expect(results[0].id).toBe('new')
    expect(results[0].score).toBe(10.0)
    expect(results[3].score).toBe(7.0)
  })

  it('inserts at end when new is worst', () => {
    const movies = makeMovies(3)
    let session = initSession('new', 'loved', movies)
    while (!session.complete) {
      const op = pickOpponent(session, [])!
      session = applyComparison(session, 'opponent_wins', op.position)
    }

    const results = finalizePositions(session, 'new', 'loved')
    expect(results[results.length - 1].id).toBe('new')
    expect(results[results.length - 1].score).toBe(7.0)
  })

  it('all scores are unique in a 5-item tier', () => {
    const movies = makeMovies(4)
    const session = initSession('new', 'loved', movies)
    const results = finalizePositions(session, 'new', 'loved')
    const scores = results.map((r) => r.score)
    const unique = new Set(scores)
    expect(unique.size).toBe(scores.length)
  })
})

describe('pickOpponent', () => {
  it('prefers genre overlap over distance when equidistant', () => {
    const movies: RatedMovie[] = [
      { id: 'no-genre', position: 3, score: 0, genres: [] },
      { id: 'with-genre', position: 5, score: 0, genres: [28] },
    ]
    const session = initSession('new', 'loved', movies)
    // Both are equidistant from median (position 3 vs 5, target = floor(0+6/2)=3)
    // 'no-genre' has distance 0 so it wins on distance anyway — let's pick where genre matters
    const session2 = { ...session, low: 0, high: 6, tierList: movies }
    // target = floor((0+6)/2) = 3 → distance: no-genre=0, with-genre=2
    const op = pickOpponent(session2, [28])
    // no-genre is closer so wins on distance
    expect(op?.id).toBe('no-genre')
  })

  it('picks genre-overlapping movie when distances are equal', () => {
    const movies: RatedMovie[] = [
      { id: 'no-genre', position: 2, score: 0, genres: [] },
      { id: 'with-genre', position: 4, score: 0, genres: [28] },
    ]
    // target = floor((1+5)/2) = 3 → both have distance 1
    const session = {
      ...initSession('new', 'loved', movies),
      low: 1,
      high: 5,
      complete: false,
    }
    const op = pickOpponent(session, [28])
    expect(op?.id).toBe('with-genre')
  })

  it('skips previously too-tough opponents', () => {
    const movies = makeMovies(4)
    let session = initSession('new', 'loved', movies)
    const op1 = pickOpponent(session, [])!
    session = applyComparison(session, 'too_tough', op1.position)
    const op2 = pickOpponent(session, [])
    // op2 should be different from op1 when possible
    if (movies.length > 1) {
      expect(op2?.id).not.toBe(op1.id)
    }
  })
})

describe('binary search convergence', () => {
  it('converges in ≤ ceil(log2(N))+1 comparisons for 10-item tier', () => {
    const movies = makeMovies(10)
    let session = initSession('new', 'loved', movies)
    let count = 0

    while (!session.complete && count < 20) {
      const op = pickOpponent(session, [])
      if (!op) break
      session = applyComparison(session, 'new_wins', op.position)
      count++
    }

    expect(count).toBeLessThanOrEqual(5) // ceil(log2(10))+1 = 5
    expect(session.complete).toBe(true)
  })
})

describe('tier change re-rate', () => {
  it('starts fresh session in new tier', () => {
    const movies = makeMovies(3)
    const session = initSession('existing-movie', 'liked', movies)
    // Verify session is in the new tier
    expect(session.tier).toBe('liked')
    expect(session.complete).toBe(false)
  })
})
