import { NextRequest, NextResponse } from 'next/server'
import { searchMovies } from '@/lib/tmdb'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? ''
  if (!q.trim()) {
    return NextResponse.json({ results: [] })
  }

  try {
    const results = await searchMovies(q)
    return NextResponse.json({ results })
  } catch (err) {
    console.error('TMDB search error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
