import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProfileClient } from '@/components/profile/ProfileClient'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: ratings }] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase
      .from('ratings')
      .select('id, tier, position, score, note, rated_at, movies(tmdb_id, title, release_year, poster_path)')
      .eq('user_id', user.id)
      .order('tier')
      .order('position', { ascending: true }),
  ])

  const allRatings = ratings ?? []
  const totalMovies = allRatings.length
  const avgScore =
    totalMovies > 0
      ? allRatings.reduce((sum, r) => sum + r.score, 0) / totalMovies
      : null

  const displayName = profile?.display_name ?? profile?.username ?? user.email ?? 'User'
  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profile?.avatar_url ?? undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          {profile?.username && (
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          )}
          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{totalMovies}</strong> rated
            </span>
            {avgScore != null && (
              <span>
                avg{' '}
                <strong className="text-foreground">{avgScore.toFixed(1)}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Rated list */}
      {totalMovies === 0 ? (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <p className="text-lg">No movies rated yet.</p>
          <p className="text-sm">Search for a movie and start your list.</p>
        </div>
      ) : (
        <ProfileClient ratings={allRatings as Parameters<typeof ProfileClient>[0]['ratings']} />
      )}
    </div>
  )
}
