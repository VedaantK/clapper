export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      movies: {
        Row: {
          id: string
          tmdb_id: number
          title: string
          original_title: string | null
          release_year: number | null
          poster_path: string | null
          backdrop_path: string | null
          overview: string | null
          runtime_minutes: number | null
          media_type: 'movie' | 'tv'
          created_at: string
          last_synced_at: string
        }
        Insert: {
          id?: string
          tmdb_id: number
          title: string
          original_title?: string | null
          release_year?: number | null
          poster_path?: string | null
          backdrop_path?: string | null
          overview?: string | null
          runtime_minutes?: number | null
          media_type?: 'movie' | 'tv'
          created_at?: string
          last_synced_at?: string
        }
        Update: {
          tmdb_id?: number
          title?: string
          original_title?: string | null
          release_year?: number | null
          poster_path?: string | null
          backdrop_path?: string | null
          overview?: string | null
          runtime_minutes?: number | null
          media_type?: 'movie' | 'tv'
          last_synced_at?: string
        }
        Relationships: []
      }
      genres: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id: number
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      movie_genres: {
        Row: {
          movie_id: string
          genre_id: number
        }
        Insert: {
          movie_id: string
          genre_id: number
        }
        Update: {
          movie_id?: string
          genre_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'movie_genres_movie_id_fkey'
            columns: ['movie_id']
            isOneToOne: false
            referencedRelation: 'movies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'movie_genres_genre_id_fkey'
            columns: ['genre_id']
            isOneToOne: false
            referencedRelation: 'genres'
            referencedColumns: ['id']
          }
        ]
      }
      ratings: {
        Row: {
          id: string
          user_id: string
          movie_id: string
          tier: 'loved' | 'liked' | 'disliked'
          position: number
          score: number
          note: string | null
          tags: string[]
          rated_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          movie_id: string
          tier: 'loved' | 'liked' | 'disliked'
          position: number
          score: number
          note?: string | null
          tags?: string[]
          rated_at?: string
          updated_at?: string
        }
        Update: {
          tier?: 'loved' | 'liked' | 'disliked'
          position?: number
          score?: number
          note?: string | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ratings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ratings_movie_id_fkey'
            columns: ['movie_id']
            isOneToOne: false
            referencedRelation: 'movies'
            referencedColumns: ['id']
          }
        ]
      }
      comparisons: {
        Row: {
          id: string
          user_id: string
          session_id: string
          new_movie_id: string
          opponent_movie_id: string
          result: 'new_wins' | 'opponent_wins' | 'too_tough'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id: string
          new_movie_id: string
          opponent_movie_id: string
          result: 'new_wins' | 'opponent_wins' | 'too_tough'
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: [
          {
            foreignKeyName: 'comparisons_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      media_type: 'movie' | 'tv'
      tier_type: 'loved' | 'liked' | 'disliked'
      comparison_result: 'new_wins' | 'opponent_wins' | 'too_tough'
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
