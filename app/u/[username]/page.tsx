import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface PublicProfileProps {
  params: Promise<{ username: string }>
}

export default async function PublicProfilePage({ params }: PublicProfileProps) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const initials = (profile.display_name ?? profile.username)
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const { data: ratings } = await supabase
    .from('ratings')
    .select('id, tier, score')
    .eq('user_id', profile.id)

  const totalMovies = ratings?.length ?? 0

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{profile.display_name ?? profile.username}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          <p className="text-sm text-muted-foreground mt-1">
            <strong className="text-foreground">{totalMovies}</strong> movies rated
          </p>
        </div>
      </div>

      <div className="text-center py-16 text-muted-foreground border rounded-lg">
        <p>Full public profiles coming soon.</p>
      </div>
    </div>
  )
}
