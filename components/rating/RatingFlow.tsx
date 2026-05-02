'use client'

import { useEffect, useReducer, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getPosterUrl } from '@/lib/tmdb'
import {
  initSession,
  applyComparison,
  pickOpponent,
  isSessionComplete,
  type Tier,
  type ComparisonResult,
  type RatedMovie,
  type RatingSession,
} from '@/lib/ranking'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MovieInfo {
  tmdbId: number
  movieId: string
  title: string
  posterPath: string | null
  genres: number[]
}

interface OpponentInfo {
  tmdbId: number
  movieId: string
  title: string
  posterPath: string | null
  score: number
  position: number
}

type FlowState =
  | { phase: 'tier-select' }
  | { phase: 'comparison'; session: RatingSession; opponent: OpponentInfo }
  | { phase: 'reveal'; score: number; position: number; tierSize: number; tier: Tier }

interface ComparisonLogEntry {
  opponentMovieId: string
  result: ComparisonResult
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface RatingFlowProps {
  newMovie: MovieInfo
  tierMovies: {
    loved: RatedMovie[]
    liked: RatedMovie[]
    disliked: RatedMovie[]
  }
  opponentMap: Record<string, OpponentInfo>
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RatingFlow({ newMovie, tierMovies, opponentMap }: RatingFlowProps) {
  const router = useRouter()
  const [state, setState] = useState<FlowState>({ phase: 'tier-select' })
  const [comparisonsLog, setComparisonsLog] = useState<ComparisonLogEntry[]>([])
  const [note, setNote] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [displayScore, setDisplayScore] = useState(0)
  const [fade, setFade] = useState(true)
  const initialComparisons = useRef(0)

  function startWithTier(tier: Tier) {
    const list = tierMovies[tier]
    const session = initSession(newMovie.movieId, tier, list)

    if (isSessionComplete(session)) {
      submitRating(tier, [], session.low)
      return
    }

    const opponent = pickOpponent(session, newMovie.genres)
    if (!opponent) {
      submitRating(tier, [], session.low)
      return
    }

    initialComparisons.current = session.comparisonsRemaining
    setComparisonsLog([])
    setState({
      phase: 'comparison',
      session,
      opponent: opponentMap[opponent.id],
    })
  }

  function handleComparison(result: ComparisonResult) {
    if (state.phase !== 'comparison') return

    const { session, opponent } = state
    const opponentIdx = session.tierList.findIndex((m) => m.id === opponent.movieId)

    const newLog: ComparisonLogEntry[] = [
      ...comparisonsLog,
      { opponentMovieId: opponent.movieId, result },
    ]
    setComparisonsLog(newLog)

    const updated = applyComparison(session, result, opponentIdx)

    if (isSessionComplete(updated)) {
      submitRating(updated.tier, newLog, updated.low)
      return
    }

    const nextOpponent = pickOpponent(updated, newMovie.genres)
    if (!nextOpponent) {
      submitRating(updated.tier, newLog, updated.low)
      return
    }

    setFade(false)
    setTimeout(() => {
      setState({ phase: 'comparison', session: updated, opponent: opponentMap[nextOpponent.id] })
      setFade(true)
    }, 180)
  }

  async function submitRating(tier: Tier, log: ComparisonLogEntry[], _position: number) {
    setSaving(true)
    try {
      const res = await fetch('/api/ratings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: newMovie.tmdbId,
          tier,
          comparisonsLog: log,
          note: note || undefined,
          tags,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save rating')
      }

      const data = await res.json()
      setState({ phase: 'reveal', score: data.score, position: data.position + 1, tierSize: data.tierSize, tier })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  // Animated score counter
  useEffect(() => {
    if (state.phase !== 'reveal') return
    const target = state.score
    const duration = 800
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(eased * target * 10) / 10)
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [state.phase])

  // ── Render ────────────────────────────────────────────────────────────────

  if (state.phase === 'tier-select') {
    return <TierSelect movie={newMovie} onSelect={startWithTier} />
  }

  if (state.phase === 'comparison') {
    const totalComparisons = initialComparisons.current
    const done = totalComparisons - state.session.comparisonsRemaining
    return (
      <ComparisonView
        newMovie={newMovie}
        opponent={state.opponent}
        done={done}
        total={totalComparisons}
        onResult={handleComparison}
        saving={saving}
        fade={fade}
        onBack={() => setState({ phase: 'tier-select' })}
      />
    )
  }

  // reveal
  return (
    <RevealView
      movie={newMovie}
      score={displayScore}
      finalScore={state.score}
      position={state.position}
      tierSize={state.tierSize}
      tier={state.tier}
      note={note}
      tags={tags}
      onNoteChange={setNote}
      onTagsChange={setTags}
      onDone={() => router.push('/profile')}
      saving={saving}
    />
  )
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function TierSelect({ movie, onSelect }: { movie: MovieInfo; onSelect: (t: Tier) => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 gap-8">
      <div className="text-center space-y-1">
        <p className="text-muted-foreground text-sm uppercase tracking-wide">How did you feel about</p>
        <h1 className="text-3xl font-bold">{movie.title}</h1>
      </div>

      {movie.posterPath && (
        <div className="relative w-32 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl">
          <Image
            src={getPosterUrl(movie.posterPath, 'w185') ?? ''}
            alt={movie.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          size="lg"
          className="h-14 text-base bg-rose-600 hover:bg-rose-500 text-white"
          onClick={() => onSelect('loved')}
        >
          😍 Loved it
        </Button>
        <Button
          size="lg"
          className="h-14 text-base bg-amber-600 hover:bg-amber-500 text-white"
          onClick={() => onSelect('liked')}
        >
          🙂 Liked it
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="h-14 text-base"
          onClick={() => onSelect('disliked')}
        >
          😐 Didn&apos;t like it
        </Button>
      </div>
    </div>
  )
}

function ComparisonView({
  newMovie,
  opponent,
  done,
  total,
  onResult,
  saving,
  fade,
  onBack,
}: {
  newMovie: MovieInfo
  opponent: OpponentInfo
  done: number
  total: number
  onResult: (r: ComparisonResult) => void
  saving: boolean
  fade: boolean
  onBack: () => void
}) {
  const progress = total > 0 ? (done / total) * 100 : 0

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-3.5rem)] px-4 py-8 gap-6">
      {/* Progress */}
      <div className="w-full max-w-sm space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <button onClick={onBack} className="hover:text-foreground">← Back</button>
          <span>{done} of {total}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <p className="text-lg font-medium text-muted-foreground">Which did you enjoy more?</p>

      {/* Posters */}
      <div
        className={`flex gap-4 sm:gap-8 transition-opacity duration-180 ${fade ? 'opacity-100' : 'opacity-0'}`}
      >
        <PosterChoice
          title={newMovie.title}
          posterPath={newMovie.posterPath}
          label="This one"
          onClick={() => onResult('new_wins')}
          disabled={saving}
        />
        <PosterChoice
          title={opponent.title}
          posterPath={opponent.posterPath}
          label="That one"
          onClick={() => onResult('opponent_wins')}
          disabled={saving}
          score={opponent.score}
        />
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onResult('too_tough')}
        disabled={saving}
        className="text-muted-foreground"
      >
        Too tough to compare
      </Button>
    </div>
  )
}

function PosterChoice({
  title,
  posterPath,
  label,
  onClick,
  disabled,
  score,
}: {
  title: string
  posterPath: string | null
  label: string
  onClick: () => void
  disabled: boolean
  score?: number
}) {
  const posterUrl = getPosterUrl(posterPath, 'w342')
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-2 group disabled:opacity-50"
    >
      <div className="relative w-36 sm:w-44 aspect-[2/3] rounded-xl overflow-hidden shadow-lg ring-2 ring-transparent group-hover:ring-primary transition-all">
        {posterUrl ? (
          <Image src={posterUrl} alt={title} fill className="object-cover" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center p-2 text-xs text-center text-muted-foreground">
            {title}
          </div>
        )}
        {score != null && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded">
            {score.toFixed(1)}
          </div>
        )}
      </div>
      <span className="text-sm font-medium text-center max-w-[9rem] line-clamp-2">{title}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </button>
  )
}

const TAGS = ['Rewatch', 'In theaters', 'With friends', 'Solo']
const TIER_LABELS: Record<Tier, string> = {
  loved: 'Loved',
  liked: 'Liked',
  disliked: "Didn't Like",
}

function RevealView({
  movie,
  score,
  finalScore,
  position,
  tierSize,
  tier,
  note,
  tags,
  onNoteChange,
  onTagsChange,
  onDone,
  saving,
}: {
  movie: MovieInfo
  score: number
  finalScore: number
  position: number
  tierSize: number
  tier: Tier
  note: string
  tags: string[]
  onNoteChange: (v: string) => void
  onTagsChange: (v: string[]) => void
  onDone: () => void
  saving: boolean
}) {
  function toggleTag(tag: string) {
    onTagsChange(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag])
  }

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-3.5rem)] px-4 py-12 gap-6 max-w-sm mx-auto">
      <div className="text-center space-y-1">
        <p className="text-muted-foreground text-sm uppercase tracking-wide">Your score</p>
        <div className="text-7xl font-bold tabular-nums">
          {score === finalScore ? finalScore.toFixed(1) : score.toFixed(1)}
        </div>
      </div>

      <p className="text-muted-foreground text-sm text-center">
        #{position} of {tierSize} in your{' '}
        <span className="text-foreground font-medium">{TIER_LABELS[tier]}</span> tier
      </p>

      <textarea
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder="Anything to remember about this one? (optional)"
        className="w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        rows={3}
      />

      <div className="flex flex-wrap gap-2 w-full">
        {TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              tags.includes(tag)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-foreground/50'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={onDone}
        disabled={saving}
      >
        {saving ? 'Saving…' : 'Done'}
      </Button>
    </div>
  )
}
