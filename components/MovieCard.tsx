import Link from 'next/link'
import { MoviePoster } from './MoviePoster'
import { TierDot } from './TierBadge'
import { cn } from '@/lib/utils'
import type { Tier } from '@/lib/ranking'

interface MovieCardProps {
  tmdbId: number
  title: string
  releaseYear: number | null
  posterPath: string | null
  score?: number | null
  tier?: Tier | null
  className?: string
}

export function MovieCard({
  tmdbId,
  title,
  releaseYear,
  posterPath,
  score,
  tier,
  className,
}: MovieCardProps) {
  return (
    <Link href={`/movie/${tmdbId}`} className={cn('group block', className)}>
      <div className="relative aspect-[2/3] rounded-md overflow-hidden">
        <MoviePoster
          posterPath={posterPath}
          title={title}
          className="w-full h-full"
        />
        {score != null && (
          <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-sm rounded px-1.5 py-0.5 text-xs font-bold text-white flex items-center gap-1">
            {tier && <TierDot tier={tier} />}
            {score.toFixed(1)}
          </div>
        )}
      </div>
      <div className="mt-1.5 px-0.5">
        <p className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-foreground text-foreground/90">
          {title}
        </p>
        {releaseYear && (
          <p className="text-xs text-muted-foreground mt-0.5">{releaseYear}</p>
        )}
      </div>
    </Link>
  )
}
