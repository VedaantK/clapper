import { cn } from '@/lib/utils'
import type { Tier } from '@/lib/ranking'

const TIER_CONFIG: Record<Tier, { label: string; className: string }> = {
  loved: { label: 'Loved', className: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  liked: { label: 'Liked', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  disliked: { label: "Didn't Like", className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
}

export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  const { label, className: tierClass } = TIER_CONFIG[tier]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        tierClass,
        className
      )}
    >
      {label}
    </span>
  )
}

export function TierDot({ tier, className }: { tier: Tier; className?: string }) {
  const colors: Record<Tier, string> = {
    loved: 'bg-rose-500',
    liked: 'bg-amber-500',
    disliked: 'bg-slate-500',
  }
  return (
    <span className={cn('inline-block rounded-full w-2 h-2', colors[tier], className)} />
  )
}
