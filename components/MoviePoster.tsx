import Image from 'next/image'
import { cn } from '@/lib/utils'
import { getPosterUrl } from '@/lib/tmdb'

interface MoviePosterProps {
  posterPath: string | null
  title: string
  size?: 'w185' | 'w342' | 'w500'
  className?: string
  priority?: boolean
}

export function MoviePoster({
  posterPath,
  title,
  size = 'w342',
  className,
  priority = false,
}: MoviePosterProps) {
  const src = getPosterUrl(posterPath, size)

  if (!src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground text-xs text-center p-2',
          className
        )}
      >
        {title}
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      <Image
        src={src}
        alt={`${title} poster`}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 50vw, 33vw"
        priority={priority}
      />
    </div>
  )
}
